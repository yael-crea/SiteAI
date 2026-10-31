package main

import (
	"net/http/httptest"
	"testing"
)

func TestGetClientIP(t *testing.T) {
	cases := []struct {
		name    string
		secret  string
		headers map[string]string
		want    string
	}{
		{
			name:    "proxy authentifié",
			secret:  "s3cret",
			headers: map[string]string{"X-Lumio-Proxy-Secret": "s3cret", "X-Lumio-Client-IP": "203.0.113.7", "X-Forwarded-For": "76.76.21.1"},
			want:    "203.0.113.7",
		},
		{
			name:    "mauvais secret : IP transmise ignorée",
			secret:  "s3cret",
			headers: map[string]string{"X-Lumio-Proxy-Secret": "faux", "X-Lumio-Client-IP": "203.0.113.7", "X-Forwarded-For": "76.76.21.1"},
			want:    "76.76.21.1",
		},
		{
			name:    "secret non configuré : IP transmise ignorée",
			headers: map[string]string{"X-Lumio-Proxy-Secret": "", "X-Lumio-Client-IP": "203.0.113.7", "X-Forwarded-For": "76.76.21.1"},
			want:    "76.76.21.1",
		},
		{
			name:    "IP transmise invalide",
			secret:  "s3cret",
			headers: map[string]string{"X-Lumio-Proxy-Secret": "s3cret", "X-Lumio-Client-IP": "pas-une-ip", "X-Forwarded-For": "76.76.21.1"},
			want:    "76.76.21.1",
		},
		{
			name:    "X-Forwarded-For falsifié : dernière entrée (Railway)",
			headers: map[string]string{"X-Forwarded-For": "1.2.3.4, 198.51.100.9"},
			want:    "198.51.100.9",
		},
		{
			name: "sans en-tête",
			want: "192.0.2.1",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("LUMIO_PROXY_SECRET", tc.secret)
			request := httptest.NewRequest("POST", "/leads", nil)
			for key, value := range tc.headers {
				request.Header.Set(key, value)
			}
			if got := getClientIP(request); got != tc.want {
				t.Fatalf("IP %q, attendu %q", got, tc.want)
			}
		})
	}
}
