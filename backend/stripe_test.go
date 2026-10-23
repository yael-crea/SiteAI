package main

import (
	"errors"
	"net/http"
	"net/url"
	"testing"
)

func TestIsStripeMissingResource(t *testing.T) {
	t.Parallel()

	err := &StripeAPIError{
		StatusCode: http.StatusNotFound,
		Code:       "resource_missing",
		Message:    "No such customer",
	}

	if !isStripeMissingResource(err) {
		t.Fatal("expected resource_missing Stripe error to be detected")
	}
}

func TestIsStripeMissingResourceRejectsOtherErrors(t *testing.T) {
	t.Parallel()

	tests := []error{
		errors.New("network error"),
		&StripeAPIError{
			StatusCode: http.StatusBadRequest,
			Code:       "resource_missing",
			Message:    "bad request",
		},
		&StripeAPIError{
			StatusCode: http.StatusNotFound,
			Code:       "api_error",
			Message:    "not found",
		},
	}

	for _, err := range tests {
		if isStripeMissingResource(err) {
			t.Fatalf("did not expect %T to be detected as resource_missing", err)
		}
	}
}

func TestStripeAPIErrorUsesStripeMessage(t *testing.T) {
	t.Parallel()

	err := &StripeAPIError{
		StatusCode: http.StatusNotFound,
		Message:    "No such customer",
	}

	if got := err.Error(); got != "No such customer" {
		t.Fatalf("unexpected error message: %q", got)
	}
}

func TestConfigureStripeAutomaticTax(t *testing.T) {
	t.Parallel()

	values := url.Values{}
	configureStripeAutomaticTax(values)

	want := map[string]string{
		"automatic_tax[enabled]":     "true",
		"billing_address_collection": "required",
		"customer_update[address]":   "auto",
		"customer_update[name]":      "auto",
		"tax_id_collection[enabled]": "true",
	}

	for key, expected := range want {
		if got := values.Get(key); got != expected {
			t.Errorf("%s: got %q, want %q", key, got, expected)
		}
	}
}
