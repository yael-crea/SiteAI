package main

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
)

func TestPublicQueriesReadOnlyPublishedSnapshot(t *testing.T) {
	queries := map[string]string{
		"slug":   publicSiteBySlugQuery,
		"domain": publicSiteByDomainQuery,
	}

	for name, query := range queries {
		t.Run(name, func(t *testing.T) {
			lower := strings.ToLower(query)
			if !strings.Contains(lower, "published_snapshot") {
				t.Fatal("la requête publique doit lire published_snapshot")
			}
			if strings.Contains(lower, "site_data") {
				t.Fatal("la requête publique ne doit jamais lire le brouillon site_data")
			}
			if !strings.Contains(lower, "published = true") {
				t.Fatal("la requête publique doit exiger un site publié")
			}
		})
	}
}

func TestStartupMigrationNeverBuildsPublishedSnapshotFromDraft(t *testing.T) {
	lower := strings.ToLower(versionMigrationSQL)
	if strings.Contains(lower, "update sites set published_snapshot") {
		t.Fatal("le démarrage ne doit pas transformer automatiquement un brouillon en version publiée")
	}
}

func TestDecodePublishedSiteUsesVersionAWhileDraftBRemainsPrivate(t *testing.T) {
	publishedAt := time.Date(2026, time.October, 23, 12, 0, 0, 0, time.UTC)
	snapshotA := []byte(`{
		"site": {
			"businessName": "Entreprise A",
			"slug": "entreprise-a",
			"metaTitle": "Version A",
			"metaDescription": "Description publique A",
			"heroTitle": "Titre public A",
			"heroText": "Texte public A",
			"phone": "+33 1 02 03 04 05",
			"clientName": "Information privée",
			"clientEmail": "prive@example.test",
			"sections": [{"sourceIndex": 7, "title": "Service A", "text": "Public"}],
			"socialLinks": {"instagram": "https://instagram.com/entreprise-a", "interne": "secret"}
		},
		"activity": "Activité A",
		"city": "Paris",
		"designStyle": "moderne",
		"accentColor": "#123456"
	}`)

	// La version B représente le brouillon enregistré après la publication de A.
	// Elle ne doit jamais intervenir dans la construction de la réponse publique.
	draftB := GeneratedSite{HeroTitle: "Titre brouillon B", ClientEmail: "brouillon@example.test"}

	publicSite, err := decodePublishedSite(snapshotA, "entreprise-a-42", &publishedAt)
	if err != nil {
		t.Fatalf("décodage du snapshot publié : %v", err)
	}
	if publicSite.Site.HeroTitle != "Titre public A" {
		t.Fatalf("le public devrait voir A, reçu %q", publicSite.Site.HeroTitle)
	}
	if publicSite.Site.HeroTitle == draftB.HeroTitle {
		t.Fatal("le brouillon B a contaminé la réponse publique")
	}
	if publicSite.BusinessName != "Entreprise A" || publicSite.Phone != "+33 1 02 03 04 05" {
		t.Fatal("les coordonnées professionnelles publiées doivent être conservées")
	}
	if publicSite.PublicSlug != "entreprise-a-42" || publicSite.PublishedAt != &publishedAt {
		t.Fatal("les métadonnées de publication doivent être conservées")
	}
}

func TestPublicSiteJSONExcludesBuilderPrivateFields(t *testing.T) {
	snapshot := []byte(`{
		"site": {
			"businessName": "Entreprise sûre",
			"clientName": "Client interne",
			"clientEmail": "client-interne@example.test",
			"sections": [{"sourceIndex": 9, "title": "Conseil", "text": "Visible"}],
			"socialLinks": {"facebook": "https://facebook.com/entreprise", "privateCrm": "secret"}
		},
		"activity": "Conseil",
		"city": "Lyon",
		"designStyle": "elegant",
		"accentColor": "#654321"
	}`)

	publicSite, err := decodePublishedSite(snapshot, "entreprise-sure", nil)
	if err != nil {
		t.Fatalf("décodage du snapshot publié : %v", err)
	}

	raw, err := json.Marshal(publicSite)
	if err != nil {
		t.Fatalf("encodage de la réponse publique : %v", err)
	}
	jsonText := string(raw)
	for _, forbidden := range []string{"clientName", "clientEmail", "sourceIndex", "privateCrm", "client-interne@example.test"} {
		if strings.Contains(jsonText, forbidden) {
			t.Fatalf("la réponse publique expose %q : %s", forbidden, jsonText)
		}
	}
	if !strings.Contains(jsonText, "facebook.com/entreprise") {
		t.Fatal("le lien social professionnel doit rester public")
	}
}

func TestDecodePublishedSiteRejectsMissingOrInvalidSnapshot(t *testing.T) {
	tests := []struct {
		name string
		raw  []byte
	}{
		{name: "absent", raw: nil},
		{name: "null", raw: []byte(`null`)},
		{name: "sans site", raw: []byte(`{"activity":"Test"}`)},
		{name: "json invalide", raw: []byte(`{"site":`)},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := decodePublishedSite(test.raw, "site-test", nil)
			if err == nil {
				t.Fatal("un snapshot absent ou incompatible ne doit pas exposer le brouillon")
			}
			if test.name != "json invalide" && !errors.Is(err, errPublishedSnapshotUnavailable) {
				t.Fatalf("erreur attendue errPublishedSnapshotUnavailable, reçu %v", err)
			}
		})
	}
}
