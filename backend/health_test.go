package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthHandlerReportsUnavailableDatabase(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/health", nil)
	response := httptest.NewRecorder()

	healthHandler(response, request)

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("got status %d, want %d", response.Code, http.StatusServiceUnavailable)
	}

	var payload map[string]string
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["status"] != "degraded" {
		t.Fatalf("got health status %q, want degraded", payload["status"])
	}
	if payload["database"] != "unavailable" {
		t.Fatalf("got database status %q, want unavailable", payload["database"])
	}
}
