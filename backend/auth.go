package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

type SupabaseUser struct {
	ID string `json:"id"`

	Email string `json:"email"`
}

func authenticateRequest(r *http.Request) (SupabaseUser, error) {

	authorization := r.Header.Get("Authorization")

	if !strings.HasPrefix(authorization, "Bearer ") {

		return SupabaseUser{}, errors.New("token manquant")

	}

	token := strings.TrimSpace(

		strings.TrimPrefix(

			authorization,

			"Bearer ",
		),
	)

	if token == "" {

		return SupabaseUser{}, errors.New("token vide")

	}

	supabaseURL := strings.TrimRight(

		os.Getenv("SUPABASE_URL"),

		"/",
	)

	request, err := http.NewRequest(

		http.MethodGet,

		supabaseURL+"/auth/v1/user",

		nil,
	)

	if err != nil {

		return SupabaseUser{}, err

	}

	request.Header.Set(

		"Authorization",

		"Bearer "+token,
	)

	request.Header.Set(

		"apikey",

		os.Getenv("SUPABASE_PUBLISHABLE_KEY"),
	)

	client := &http.Client{

		Timeout: 10 * time.Second,
	}

	response, err := client.Do(request)

	if err != nil {

		return SupabaseUser{}, err

	}

	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {

		return SupabaseUser{}, errors.New("token invalide")

	}

	var user SupabaseUser

	err = json.NewDecoder(response.Body).Decode(&user)

	if err != nil {

		return SupabaseUser{}, err

	}

	if user.ID == "" {

		return SupabaseUser{}, errors.New("utilisateur invalide")

	}

	return user, nil

}

func requireUser(

	w http.ResponseWriter,

	r *http.Request,

) (SupabaseUser, bool) {

	user, err := authenticateRequest(r)

	if err != nil {

		http.Error(

			w,

			"Non autorisé",

			http.StatusUnauthorized,
		)

		return SupabaseUser{}, false

	}

	return user, true

}

func isAdminUser(
	ctx context.Context,
	userID string,
) (bool, error) {
	var isAdmin bool

	err := db.QueryRow(
		ctx,
		`
		SELECT EXISTS(
			SELECT 1
			FROM admin_users
			WHERE user_id = $1::uuid
		);
		`,
		userID,
	).Scan(&isAdmin)

	if err != nil {
		return false, err
	}

	return isAdmin, nil
}

func requireAdmin(
	w http.ResponseWriter,
	r *http.Request,
) (SupabaseUser, bool) {
	user, authenticated := requireUser(w, r)
	if !authenticated {
		return SupabaseUser{}, false
	}

	isAdmin, err := isAdminUser(
		r.Context(),
		user.ID,
	)

	if err != nil {
		log.Println("Erreur vérification admin :", err)

		http.Error(
			w,
			"Impossible de vérifier les droits administrateur",
			http.StatusInternalServerError,
		)

		return SupabaseUser{}, false
	}

	if !isAdmin {
		http.Error(
			w,
			"Accès administrateur requis",
			http.StatusForbidden,
		)

		return SupabaseUser{}, false
	}

	return user, true
}
