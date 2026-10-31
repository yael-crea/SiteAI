package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNormalizeLandingEvent(t *testing.T) {
	cases := []struct {
		name  string
		input LandingEventInput
		want  LandingEventInput
		ok    bool
	}{
		{"vue directe", LandingEventInput{Event: "view"}, LandingEventInput{Event: "view"}, true},
		{"vue avec source", LandingEventInput{Event: "view", Source: " Affichette "}, LandingEventInput{Event: "view", Source: "affichette"}, true},
		{"vue : emplacement ignoré", LandingEventInput{Event: "view", Placement: "hero"}, LandingEventInput{Event: "view"}, true},
		{"référent", LandingEventInput{Event: "view", Source: "www.google.com"}, LandingEventInput{Event: "view", Source: "www.google.com"}, true},
		{"source invalide → directe", LandingEventInput{Event: "view", Source: "<script>"}, LandingEventInput{Event: "view"}, true},
		{"source trop longue → directe", LandingEventInput{Event: "view", Source: strings.Repeat("a", 101)}, LandingEventInput{Event: "view"}, true},
		{"clic en-tête", LandingEventInput{Event: "cta_click", Placement: "header"}, LandingEventInput{Event: "cta_click", Placement: "header"}, true},
		{"clic tarifs", LandingEventInput{Event: "cta_click", Placement: "pricing", Source: "affichette"}, LandingEventInput{Event: "cta_click", Placement: "pricing", Source: "affichette"}, true},
		{"clic sans emplacement", LandingEventInput{Event: "cta_click"}, LandingEventInput{}, false},
		{"clic emplacement inconnu", LandingEventInput{Event: "cta_click", Placement: "footer"}, LandingEventInput{}, false},
		{"événement inconnu", LandingEventInput{Event: "purchase"}, LandingEventInput{}, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, ok := normalizeLandingEvent(tc.input)
			if ok != tc.ok || got != tc.want {
				t.Fatalf("attendu %+v (ok=%v), reçu %+v (ok=%v)", tc.want, tc.ok, got, ok)
			}
		})
	}
}

func TestLandingEventHandlerRejectsInvalidInput(t *testing.T) {
	for _, body := range []string{"", "{", `{"event":"purchase"}`, `{"event":"cta_click","placement":"footer"}`} {
		request := httptest.NewRequest(http.MethodPost, "/analytics/landing", strings.NewReader(body))
		recorder := httptest.NewRecorder()

		landingEventHandler(recorder, request)

		if recorder.Code != http.StatusBadRequest {
			t.Errorf("corps %q : code %d, attendu 400", body, recorder.Code)
		}
	}

	request := httptest.NewRequest(http.MethodGet, "/analytics/landing", nil)
	recorder := httptest.NewRecorder()
	landingEventHandler(recorder, request)
	if recorder.Code != http.StatusMethodNotAllowed {
		t.Errorf("GET : code %d, attendu 405", recorder.Code)
	}
}
