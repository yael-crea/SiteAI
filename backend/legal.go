package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type CGVAcceptanceInput struct {
	Plan            string `json:"plan"`
	Version         string `json:"version"`
	ProfessionalUse bool   `json:"professionalUse"`
}

type CGVAcceptanceResponse struct {
	DocumentType    string    `json:"documentType"`
	DocumentVersion string    `json:"documentVersion"`
	Plan            string    `json:"plan"`
	AcceptedAt      time.Time `json:"acceptedAt"`
}

func recordLegalAcceptance(
	ctx context.Context,
	userID string,
	documentType string,
	plan string,
) (time.Time, error) {
	var acceptedAt time.Time

	err := db.QueryRow(
		ctx,
		`
		INSERT INTO legal_acceptances (
			user_id,
			document_type,
			document_version,
			plan,
			accepted_at
		)
		VALUES (
			$1::uuid,
			$4,
			$2,
			$3,
			NOW()
		)
		ON CONFLICT (
			user_id,
			document_type,
			document_version,
			plan
		)
		DO UPDATE SET
			accepted_at = legal_acceptances.accepted_at
		RETURNING accepted_at;
		`,
		userID,
		currentCGVVersion,
		plan,
		documentType,
	).Scan(&acceptedAt)

	if err != nil {
		return time.Time{}, err
	}

	return acceptedAt, nil
}

func getCurrentLegalAcceptance(
	ctx context.Context,
	userID string,
	documentType string,
	plan string,
) (time.Time, bool, error) {
	var acceptedAt time.Time

	err := db.QueryRow(
		ctx,
		`
		SELECT accepted_at
		FROM legal_acceptances
		WHERE user_id = $1::uuid
		  AND document_type = $4
		  AND document_version = $2
		  AND plan = $3
		LIMIT 1;
		`,
		userID,
		currentCGVVersion,
		plan,
		documentType,
	).Scan(&acceptedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return time.Time{}, false, nil
		}

		return time.Time{}, false, err
	}

	return acceptedAt, true, nil
}

func cgvAcceptanceHandler(
	w http.ResponseWriter,
	r *http.Request,
) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(
			w,
			"Méthode non autorisée",
			http.StatusMethodNotAllowed,
		)
		return
	}

	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	var input CGVAcceptanceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(
			w,
			"JSON invalide",
			http.StatusBadRequest,
		)
		return
	}

	plan, err := normalizePaidPlan(input.Plan)
	if err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusBadRequest,
		)
		return
	}

	if strings.TrimSpace(input.Version) != currentCGVVersion {
		http.Error(
			w,
			"La version des CGV n'est plus à jour. Recharge la page avant de continuer.",
			http.StatusConflict,
		)
		return
	}

	if !input.ProfessionalUse {
		http.Error(
			w,
			"Lumio est réservé aux professionnels : la déclaration d'usage professionnel est requise.",
			http.StatusBadRequest,
		)
		return
	}

	acceptedAt, err := recordLegalAcceptance(
		r.Context(),
		user.ID,
		legalDocumentCGV,
		plan,
	)
	if err == nil {
		_, err = recordLegalAcceptance(
			r.Context(),
			user.ID,
			legalDocumentProfessionalUse,
			plan,
		)
	}
	if err != nil {
		log.Println(
			"Erreur enregistrement acceptation CGV :",
			err,
		)

		http.Error(
			w,
			"Impossible d'enregistrer l'acceptation des CGV",
			http.StatusInternalServerError,
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		CGVAcceptanceResponse{
			DocumentType:    "cgv",
			DocumentVersion: currentCGVVersion,
			Plan:            plan,
			AcceptedAt:      acceptedAt,
		},
	)
}
