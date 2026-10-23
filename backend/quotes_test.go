package main

import (
	"bytes"
	"strings"
	"testing"
	"time"
)

func TestGenerateQuotePDF(t *testing.T) {
	document := quoteDocumentData{
		Quote: Quote{
			ID:            7,
			LeadID:        4,
			QuoteNumber:   "DEV-2026-000007",
			Title:         "Rénovation",
			Items:         []QuoteItem{{Description: "Pose de robinet", Quantity: 2, UnitPriceCents: 12500, TotalCents: 25000}},
			SubtotalCents: 25000,
			TaxRateBPS:    2000,
			TaxCents:      5000,
			TotalCents:    30000,
			Notes:         "Acompte de 30 % à la commande.",
			ValidUntil:    time.Date(2026, 11, 22, 0, 0, 0, 0, time.UTC),
			CreatedAt:     time.Date(2026, 10, 23, 0, 0, 0, 0, time.UTC),
		},
		BusinessName: "Plomberie Éclair",
		SellerEmail:  "artisan@example.com",
		SellerPhone:  "0102030405",
		ClientName:   "Zoé Martin",
		ClientEmail:  "zoe@example.com",
	}

	pdf := generateQuotePDF(document)
	if !bytes.HasPrefix(pdf, []byte("%PDF-1.4")) {
		t.Fatalf("le document généré n'est pas un PDF: %q", pdf[:min(16, len(pdf))])
	}
	if !bytes.Contains(pdf, []byte("DEV-2026-000007")) {
		t.Fatal("le numéro du devis est absent du PDF")
	}
	if !bytes.Contains(pdf, []byte("TOTAL TTC : 300,00 EUR")) {
		t.Fatal("le total TTC est absent du PDF")
	}
	if !bytes.Contains(pdf, []byte("startxref")) {
		t.Fatal("la table de références PDF est absente")
	}
}

func TestQuoteTextHelpers(t *testing.T) {
	if got := asciiQuoteText("Électricité – 20 €"); got != "Electricite - 20 EUR" {
		t.Fatalf("translittération inattendue: %q", got)
	}
	if got := pdfEscape(`Pose (murale) \ test`); got != `Pose \(murale\) \\ test` {
		t.Fatalf("échappement PDF inattendu: %q", got)
	}
	lines := wrapQuoteText(strings.Repeat("mot ", 30), 20)
	if len(lines) < 2 {
		t.Fatalf("le texte long devrait être réparti sur plusieurs lignes: %#v", lines)
	}
}

func TestSimplePDFSupportsMultiplePages(t *testing.T) {
	lines := make([]string, 90)
	for index := range lines {
		lines[index] = "Ligne de test"
	}
	pdf := simplePDF(lines)
	if !bytes.Contains(pdf, []byte("/Count 3")) {
		t.Fatal("le PDF long devrait contenir trois pages")
	}
	if !bytes.Contains(pdf, []byte("Page 3/3")) {
		t.Fatal("la pagination de la dernière page est absente")
	}
}
