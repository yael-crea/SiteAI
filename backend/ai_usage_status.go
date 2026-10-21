package main

import (
	"log"
	"net/http"
	"time"
)

type aiUsageStatus struct {
	Used      int       `json:"used"`
	Limit     int       `json:"limit"`
	Remaining int       `json:"remaining"`
	ResetsAt  time.Time `json:"resetsAt"`
}

func monthlyUsageStatus(used, limit int, resetsAt time.Time) aiUsageStatus {
	remaining := -1
	if limit >= 0 {
		remaining = limit - used
		if remaining < 0 {
			remaining = 0
		}
	}
	return aiUsageStatus{Used: used, Limit: limit, Remaining: remaining, ResetsAt: resetsAt}
}

func aiUsageHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	w.Header().Set("Cache-Control", "no-store")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}
	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}
	billing, _, _, err := getBillingStatus(r.Context(), user.ID)
	if err != nil {
		http.Error(w, "Impossible de lire le quota IA", http.StatusInternalServerError)
		return
	}
	var used int
	var resetsAt time.Time
	err = db.QueryRow(r.Context(), `
   WITH month AS (SELECT date_trunc('month', NOW() AT TIME ZONE 'UTC') AS start)
   SELECT (SELECT COUNT(*) FROM ai_usage WHERE user_id = $1::uuid
     AND action <> 'assistant' AND created_at >= (month.start AT TIME ZONE 'UTC')),
     (month.start + INTERVAL '1 month') AT TIME ZONE 'UTC' FROM month;
 `, user.ID).Scan(&used, &resetsAt)
	if err != nil {
		log.Println("Erreur compteur IA :", err)
		http.Error(w, "Impossible de lire le quota IA", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, monthlyUsageStatus(used, aiMonthlyLimit(billing), resetsAt))
}
