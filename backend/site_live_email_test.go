package main

import (
	"strings"
	"testing"
)

func TestBuildSiteLiveMessage(t *testing.T) {
	recipient := siteLiveRecipient{
		UserID:       "11111111-1111-1111-1111-111111111111",
		Email:        " client@example.com ",
		BusinessName: `Garage <Martin> & fils`,
		PublicSlug:   "garage-martin-12",
	}

	message := buildSiteLiveMessage(recipient, siteLiveKind(12), "https://lumio.business")

	if message.To != "client@example.com" {
		t.Errorf("destinataire %q", message.To)
	}
	if message.Subject != "Le site de Garage <Martin> & fils est en ligne !" {
		t.Errorf("sujet %q", message.Subject)
	}
	if strings.Contains(message.HTML, "<Martin>") {
		t.Error("nom d'entreprise non échappé dans le HTML")
	}
	if !strings.Contains(message.HTML, `href="https://lumio.business/site/garage-martin-12"`) {
		t.Error("lien vers le site absent ou avec utm_source")
	}
	if !strings.Contains(message.HTML, "lumio.business/site/garage-martin-12") || !strings.Contains(message.HTML, "Google Business Profile") {
		t.Error("adresse du site ou conseil Google absent du texte")
	}
	if message.UnsubscribeURL != "" {
		t.Error("un email transactionnel ne doit pas avoir de lien de désinscription")
	}
	if message.IdempotencyKey != "lumio-site_en_ligne:12-"+recipient.UserID {
		t.Errorf("clé d'idempotence %q", message.IdempotencyKey)
	}
}

func TestBuildSiteLiveMessageUsesVerifiedDomain(t *testing.T) {
	recipient := siteLiveRecipient{
		Email:          "client@example.com",
		BusinessName:   "Garage Martin",
		PublicSlug:     "garage-martin-12",
		CustomDomain:   "garage-martin.fr",
		DomainVerified: true,
	}

	message := buildSiteLiveMessage(recipient, siteLiveKind(12), "https://lumio.business")
	if !strings.Contains(message.HTML, `href="https://garage-martin.fr/"`) {
		t.Error("le domaine personnel vérifié doit être utilisé")
	}
}
