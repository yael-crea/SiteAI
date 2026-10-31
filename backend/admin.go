package main

import (
	"log"
	"net/http"
	"time"
)

type AdminStatsSummary struct {
	TotalUsers             int64   `json:"totalUsers"`
	TotalSites             int64   `json:"totalSites"`
	PublishedSites         int64   `json:"publishedSites"`
	AICallsToday           int64   `json:"aiCallsToday"`
	AICallsMonth           int64   `json:"aiCallsMonth"`
	GenerationsMonth       int64   `json:"generationsMonth"`
	ModificationsMonth     int64   `json:"modificationsMonth"`
	TokensToday            int64   `json:"tokensToday"`
	TokensMonth            int64   `json:"tokensMonth"`
	CostTodayUSD           float64 `json:"costTodayUsd"`
	CostMonthUSD           float64 `json:"costMonthUsd"`
	ActiveSubscriptions    int64   `json:"activeSubscriptions"`
	EssentielSubscriptions int64   `json:"essentielSubscriptions"`
	ProSubscriptions       int64   `json:"proSubscriptions"`
	AgenceSubscriptions    int64   `json:"agenceSubscriptions"`
	ScheduledCancellations int64   `json:"scheduledCancellations"`
	CanceledSubscriptions  int64   `json:"canceledSubscriptions"`
	MRREUR                 float64 `json:"mrrEur"`
}

type AdminUserUsage struct {
	UserID             string     `json:"userId"`
	Email              string     `json:"email"`
	AICalls            int64      `json:"aiCalls"`
	Generations        int64      `json:"generations"`
	Modifications      int64      `json:"modifications"`
	TotalTokens        int64      `json:"totalTokens"`
	EstimatedCostUSD   float64    `json:"estimatedCostUsd"`
	LastAIUseAt        *time.Time `json:"lastAiUseAt,omitempty"`
	Plan               string     `json:"plan"`
	SubscriptionStatus string     `json:"subscriptionStatus"`
	CancelAtPeriodEnd  bool       `json:"cancelAtPeriodEnd"`
	CurrentPeriodEnd   *time.Time `json:"currentPeriodEnd,omitempty"`
	MonthlyRevenueEUR  float64    `json:"monthlyRevenueEur"`
}

type AdminStatsResponse struct {
	Summary AdminStatsSummary `json:"summary"`
	Funnel  *AdminFunnel      `json:"funnel,omitempty"`
	Users   []AdminUserUsage  `json:"users"`
}

func adminStatsHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodGet {
		http.Error(
			w,
			"Méthode non autorisée",
			http.StatusMethodNotAllowed,
		)
		return
	}

	_, authorized := requireAdmin(w, r)
	if !authorized {
		return
	}

	ctx := r.Context()

	var summary AdminStatsSummary

	err := db.QueryRow(
		ctx,
		`
		SELECT
			(SELECT COUNT(*) FROM auth.users)::bigint,
			(SELECT COUNT(*) FROM sites)::bigint,
			(SELECT COUNT(*) FROM sites WHERE published = TRUE)::bigint,
			(
				SELECT COUNT(*)
				FROM ai_usage
				WHERE created_at >= date_trunc('day', NOW())
			)::bigint,
			(
				SELECT COUNT(*)
				FROM ai_usage
				WHERE created_at >= date_trunc('month', NOW())
			)::bigint,
			(
				SELECT COUNT(*)
				FROM ai_usage
				WHERE action = 'generate'
				  AND created_at >= date_trunc('month', NOW())
			)::bigint,
			(
				SELECT COUNT(*)
				FROM ai_usage
				WHERE action = 'modify'
				  AND created_at >= date_trunc('month', NOW())
			)::bigint,
			COALESCE(
				(
					SELECT SUM(total_tokens)
					FROM ai_usage
					WHERE created_at >= date_trunc('day', NOW())
				),
				0
			)::bigint,
			COALESCE(
				(
					SELECT SUM(total_tokens)
					FROM ai_usage
					WHERE created_at >= date_trunc('month', NOW())
				),
				0
			)::bigint,
			COALESCE(
				(
					SELECT SUM(estimated_cost_usd)
					FROM ai_usage
					WHERE created_at >= date_trunc('day', NOW())
				),
				0
			)::double precision,
			COALESCE(
				(
					SELECT SUM(estimated_cost_usd)
					FROM ai_usage
					WHERE created_at >= date_trunc('month', NOW())
				),
				0
			)::double precision,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
			)::bigint,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
				  AND LOWER(COALESCE(plan, '')) = 'essentiel'
			)::bigint,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
				  AND LOWER(COALESCE(plan, '')) = 'pro'
			)::bigint,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
				  AND LOWER(COALESCE(plan, '')) = 'agence'
			)::bigint,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE COALESCE(cancel_at_period_end, FALSE) = TRUE
				  AND LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
			)::bigint,
			(
				SELECT COUNT(*)
				FROM user_billing
				WHERE LOWER(COALESCE(subscription_status, '')) = 'canceled'
			)::bigint,
			COALESCE(
				(
					SELECT SUM(
						CASE LOWER(COALESCE(plan, ''))
							WHEN 'essentiel' THEN 19.90
							WHEN 'pro' THEN 39.90
							WHEN 'agence' THEN 79.90
							ELSE 0
						END
					)
					FROM user_billing
					WHERE LOWER(COALESCE(subscription_status, '')) IN ('active', 'trialing')
				),
				0
			)::double precision;
		`,
	).Scan(
		&summary.TotalUsers,
		&summary.TotalSites,
		&summary.PublishedSites,
		&summary.AICallsToday,
		&summary.AICallsMonth,
		&summary.GenerationsMonth,
		&summary.ModificationsMonth,
		&summary.TokensToday,
		&summary.TokensMonth,
		&summary.CostTodayUSD,
		&summary.CostMonthUSD,
		&summary.ActiveSubscriptions,
		&summary.EssentielSubscriptions,
		&summary.ProSubscriptions,
		&summary.AgenceSubscriptions,
		&summary.ScheduledCancellations,
		&summary.CanceledSubscriptions,
		&summary.MRREUR,
	)
	if err != nil {
		log.Println("Erreur statistiques admin :", err)

		http.Error(
			w,
			"Impossible de charger les statistiques",
			http.StatusInternalServerError,
		)
		return
	}

	rows, err := db.Query(
		ctx,
		`
		SELECT
			u.id::text,
			COALESCE(u.email, ''),
			COUNT(a.id)::bigint,
			COUNT(a.id) FILTER (
				WHERE a.action = 'generate'
			)::bigint,
			COUNT(a.id) FILTER (
				WHERE a.action = 'modify'
			)::bigint,
			COALESCE(SUM(a.total_tokens), 0)::bigint,
			COALESCE(
				SUM(a.estimated_cost_usd),
				0
			)::double precision,
			MAX(a.created_at),
			COALESCE(MAX(b.plan), 'free'),
			COALESCE(MAX(b.subscription_status), 'inactive'),
			COALESCE(BOOL_OR(b.cancel_at_period_end), FALSE),
			MAX(b.current_period_end),
			CASE
				WHEN LOWER(COALESCE(MAX(b.subscription_status), '')) IN ('active', 'trialing')
				THEN CASE LOWER(COALESCE(MAX(b.plan), ''))
					WHEN 'essentiel' THEN 19.90
					WHEN 'pro' THEN 39.90
					WHEN 'agence' THEN 79.90
					ELSE 0
				END
				ELSE 0
			END::double precision
		FROM auth.users u
		LEFT JOIN ai_usage a
			ON a.user_id = u.id
		LEFT JOIN user_billing b
			ON b.user_id = u.id
		GROUP BY
			u.id,
			u.email
		ORDER BY
			CASE
				WHEN LOWER(COALESCE(MAX(b.subscription_status), '')) IN ('active', 'trialing')
				THEN 0
				ELSE 1
			END,
			COALESCE(
				SUM(a.estimated_cost_usd),
				0
			) DESC,
			u.created_at DESC;
		`,
	)
	if err != nil {
		log.Println("Erreur utilisateurs admin :", err)

		http.Error(
			w,
			"Impossible de charger les utilisateurs",
			http.StatusInternalServerError,
		)
		return
	}
	defer rows.Close()

	users := make([]AdminUserUsage, 0)

	for rows.Next() {
		var item AdminUserUsage

		err := rows.Scan(
			&item.UserID,
			&item.Email,
			&item.AICalls,
			&item.Generations,
			&item.Modifications,
			&item.TotalTokens,
			&item.EstimatedCostUSD,
			&item.LastAIUseAt,
			&item.Plan,
			&item.SubscriptionStatus,
			&item.CancelAtPeriodEnd,
			&item.CurrentPeriodEnd,
			&item.MonthlyRevenueEUR,
		)
		if err != nil {
			log.Println("Erreur lecture utilisateur admin :", err)

			http.Error(
				w,
				"Impossible de lire les statistiques utilisateurs",
				http.StatusInternalServerError,
			)
			return
		}

		users = append(users, item)
	}

	if err := rows.Err(); err != nil {
		log.Println("Erreur parcours utilisateurs admin :", err)

		http.Error(
			w,
			"Impossible de terminer le chargement des utilisateurs",
			http.StatusInternalServerError,
		)
		return
	}

	// The funnel is optional: the rest of the dashboard stays available if
	// it cannot be computed.
	var funnel *AdminFunnel
	if loaded, err := loadAdminFunnel(ctx, time.Now().AddDate(0, 0, -adminFunnelDays)); err != nil {
		log.Println("Erreur entonnoir admin :", err)
	} else {
		funnel = &loaded
	}

	writeJSON(
		w,
		http.StatusOK,
		AdminStatsResponse{
			Summary: summary,
			Funnel:  funnel,
			Users:   users,
		},
	)
}
