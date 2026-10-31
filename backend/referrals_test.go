package main

import (
	"strings"
	"testing"
)

func TestNormalizeReferralCode(t *testing.T) {
	cases := []struct {
		in   string
		want string
		ok   bool
	}{
		{"abcd2345", "abcd2345", true},
		{"  ABCD2345 ", "abcd2345", true},
		{"abc", "", false},
		{"abcd-2345", "", false},
		{"abcd2345'--", "", false},
		{"", "", false},
	}
	for _, tc := range cases {
		got, ok := normalizeReferralCode(tc.in)
		if ok != tc.ok || (ok && got != tc.want) {
			t.Errorf("%q : %q (ok=%v), attendu %q (ok=%v)", tc.in, got, ok, tc.want, tc.ok)
		}
	}
}

func TestNewReferralCode(t *testing.T) {
	seen := map[string]bool{}
	for range 200 {
		code, err := newReferralCode()
		if err != nil {
			t.Fatal(err)
		}
		if len(code) != referralCodeLength || strings.Trim(code, referralCodeAlphabet) != "" {
			t.Fatalf("code invalide : %q", code)
		}
		if _, ok := normalizeReferralCode(code); !ok {
			t.Fatalf("code refusé par sa propre validation : %q", code)
		}
		seen[code] = true
	}
	if len(seen) < 195 {
		t.Fatalf("trop de doublons : %d codes distincts sur 200", len(seen))
	}
}
