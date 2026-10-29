package main

import (
	"context"
	"errors"
	"net/http"
	"testing"
)

func TestInvoiceSubscriptionIDPrefersParentDetails(t *testing.T) {
	var invoice StripeInvoice
	invoice.Subscription = "sub_legacy"
	invoice.Parent.SubscriptionDetails.Subscription = "sub_parent"

	if got := invoiceSubscriptionID(invoice); got != "sub_parent" {
		t.Fatalf("got %q, want sub_parent", got)
	}

	invoice.Parent.SubscriptionDetails.Subscription = ""
	if got := invoiceSubscriptionID(invoice); got != "sub_legacy" {
		t.Fatalf("got %q, want sub_legacy", got)
	}
}

func TestIsStripeSubscriptionEnded(t *testing.T) {
	for status, want := range map[string]bool{
		"active":             false,
		"trialing":           false,
		"past_due":           false,
		"incomplete":         false,
		"canceled":           true,
		"incomplete_expired": true,
		" Unpaid ":           true,
	} {
		if got := isStripeSubscriptionEnded(status); got != want {
			t.Errorf("%q: got %v, want %v", status, got, want)
		}
	}
}

func replaceStripeFetch(
	t *testing.T,
	fetch func(context.Context, string) (StripeSubscription, error),
) {
	t.Helper()

	previous := fetchStripeSubscription
	fetchStripeSubscription = fetch
	t.Cleanup(func() { fetchStripeSubscription = previous })
}

func TestCurrentStripeSubscriptionIgnoresStalePayload(t *testing.T) {
	replaceStripeFetch(t, func(_ context.Context, id string) (StripeSubscription, error) {
		return StripeSubscription{ID: id, Customer: "cus_1", Status: "canceled"}, nil
	})

	stale := StripeSubscription{ID: "sub_1", Customer: "cus_1", Status: "active"}

	got, err := currentStripeSubscription(context.Background(), stale)
	if err != nil {
		t.Fatal(err)
	}

	if got.Status != "canceled" {
		t.Fatalf("an old active payload must not win over Stripe's current state, got %q", got.Status)
	}
}

func TestCurrentStripeSubscriptionTreatsMissingAsCanceled(t *testing.T) {
	replaceStripeFetch(t, func(context.Context, string) (StripeSubscription, error) {
		return StripeSubscription{}, &StripeAPIError{
			StatusCode: http.StatusNotFound,
			Code:       "resource_missing",
			Message:    "No such subscription",
		}
	})

	got, err := currentStripeSubscription(context.Background(), StripeSubscription{
		ID:       "sub_gone",
		Customer: "cus_1",
		Status:   "active",
	})
	if err != nil {
		t.Fatal(err)
	}

	if got.Status != "canceled" {
		t.Fatalf("got %q, want canceled", got.Status)
	}
}

func TestCurrentStripeSubscriptionPropagatesStripeErrors(t *testing.T) {
	failure := errors.New("Stripe unavailable")
	replaceStripeFetch(t, func(context.Context, string) (StripeSubscription, error) {
		return StripeSubscription{}, failure
	})

	_, err := currentStripeSubscription(context.Background(), StripeSubscription{ID: "sub_1"})
	if !errors.Is(err, failure) {
		t.Fatalf("got %v, want the Stripe error so the webhook is retried", err)
	}
}

func TestHandleStripeEventOnceRejectsEventWithoutID(t *testing.T) {
	err := handleStripeEventOnce(context.Background(), StripeEvent{Type: "invoice.paid"})
	if err == nil {
		t.Fatal("an event without evt_ identifier must be rejected")
	}
}
