package main

import "testing"

func TestLogEventMessage(t *testing.T) {
	cases := []struct {
		line string
		want string
		ok   bool
	}{
		{"2026/10/31 15:01:35 Notification prospect non envoyée : Resend HTTP 401\n", "Notification prospect non envoyée : Resend HTTP 401", true},
		{"2026/10/31 15:02:35 Emails de relance envoyés : 3\n", "", false},
		{"Attention : fichier .env introuvable", "", false},
		{"2026/10/31 15:02:35 Erreur client : marie.dupont@example.com refusé", "Erreur client : [email] refusé", true},
		{"   \n", "", false},
	}

	for _, tc := range cases {
		got, ok := logEventMessage(tc.line)
		if ok != tc.ok || got != tc.want {
			t.Errorf("%q : %q (ok=%v), attendu %q (ok=%v)", tc.line, got, ok, tc.want, tc.ok)
		}
	}
}

func TestLogFingerprintGroupsByMessageStart(t *testing.T) {
	a := logFingerprint("Erreur site public : connexion perdue")
	b := logFingerprint("Erreur site public : délai dépassé")
	if a != b || a != "Erreur site public" {
		t.Fatalf("empreintes %q et %q, attendu « Erreur site public »", a, b)
	}
}
