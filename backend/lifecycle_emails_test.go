package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestNextLifecycleStep(t *testing.T) {
	day := 24 * time.Hour

	cases := []struct {
		name string
		age  time.Duration
		sent []string
		want string
	}{
		{"trop tôt", 30 * time.Minute, nil, ""},
		{"bienvenue", 2 * time.Hour, nil, "bienvenue"},
		{"bienvenue déjà envoyé", 2 * day, []string{"bienvenue"}, ""},
		{"publier", 4 * day, []string{"bienvenue"}, "publier"},
		{"publier sans bienvenue", 4 * day, nil, "publier"},
		{"dernier rappel", 12 * day, []string{"bienvenue", "publier"}, "dernier_rappel"},
		{"étape suivante déjà envoyée", 4 * day, []string{"dernier_rappel"}, ""},
		{"compte trop ancien", 31 * day, nil, ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			step, ok := nextLifecycleStep(tc.age, tc.sent)
			if tc.want == "" {
				if ok {
					t.Fatalf("aucun email attendu, reçu %q", step.Kind)
				}
				return
			}
			if !ok || step.Kind != tc.want {
				t.Fatalf("attendu %q, reçu %q (ok=%v)", tc.want, step.Kind, ok)
			}
		})
	}
}

func TestBuildLifecycleMessage(t *testing.T) {
	recipient := lifecycleRecipient{
		UserID:       "11111111-1111-1111-1111-111111111111",
		Email:        "client@example.com",
		BusinessName: `Plomberie <Dupont> & "fils"`,
	}

	for _, step := range lifecycleSteps {
		message := buildLifecycleMessage(recipient, step, "https://lumio.business", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")

		if message.To != recipient.Email {
			t.Errorf("%s : destinataire %q", step.Kind, message.To)
		}
		if !strings.Contains(message.Subject, recipient.BusinessName) {
			t.Errorf("%s : sujet sans nom d'entreprise : %q", step.Kind, message.Subject)
		}
		if strings.Contains(message.HTML, "<Dupont>") {
			t.Errorf("%s : nom d'entreprise non échappé", step.Kind)
		}
		wantUnsubscribe := "https://lumio.business/api-backend/emails/unsubscribe?token=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
		if message.UnsubscribeURL != wantUnsubscribe || !strings.Contains(message.HTML, wantUnsubscribe) {
			t.Errorf("%s : lien de désinscription absent ou faux : %q", step.Kind, message.UnsubscribeURL)
		}
		if message.IdempotencyKey != "lumio-lifecycle-"+recipient.UserID+"-"+step.Kind {
			t.Errorf("%s : clé d'idempotence %q", step.Kind, message.IdempotencyKey)
		}
	}
}

func TestEmailUnsubscribeRejectsInvalidToken(t *testing.T) {
	for _, token := range []string{"", "abc", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'--"} {
		request := httptest.NewRequest(http.MethodPost, "/emails/unsubscribe?token="+token, nil)
		recorder := httptest.NewRecorder()

		emailUnsubscribeHandler(recorder, request)

		if recorder.Code != http.StatusBadRequest {
			t.Errorf("jeton %q : code %d, attendu 400", token, recorder.Code)
		}
	}
}

func TestEmailUnsubscribeGetDoesNotUnsubscribe(t *testing.T) {
	// db is nil here: a GET touching the database would panic.
	request := httptest.NewRequest(http.MethodGet, "/emails/unsubscribe?token=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", nil)
	recorder := httptest.NewRecorder()

	emailUnsubscribeHandler(recorder, request)

	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `<form method="post">`) {
		t.Fatalf("page de confirmation attendue, code %d", recorder.Code)
	}
}
