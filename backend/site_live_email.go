package main

import (
	"context"
	"fmt"
	"html"
	"log"
	"os"
	"strings"
	"time"
)

// The first time a site is published, its owner receives an email with the
// public address, the printable poster and the next steps to be found on
// Google. One email per site: the claim lives in lifecycle_emails under the
// kind "site_en_ligne:<site id>", released if sending fails.

func siteLiveKind(siteID int64) string {
	return fmt.Sprintf("site_en_ligne:%d", siteID)
}

type siteLiveRecipient struct {
	UserID         string
	Email          string
	BusinessName   string
	PublicSlug     string
	CustomDomain   string
	DomainVerified bool
}

// notifySiteLive runs after the publication has been committed; a failure is
// only logged, the site is online either way.
func notifySiteLive(siteID int64) {
	if strings.TrimSpace(os.Getenv("RESEND_API_KEY")) == "" {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := sendSiteLiveEmail(ctx, siteID); err != nil {
		log.Printf("Email « site en ligne » impossible pour le site %d : %v", siteID, err)
	}
}

func sendSiteLiveEmail(ctx context.Context, siteID int64) error {
	var recipient siteLiveRecipient
	err := db.QueryRow(
		ctx,
		`SELECT user_id::text, notification_email, business_name, COALESCE(public_slug, ''),
		        COALESCE(custom_domain, ''), custom_domain_verified
		 FROM sites
		 WHERE id = $1 AND published = TRUE AND user_id IS NOT NULL`,
		siteID,
	).Scan(&recipient.UserID, &recipient.Email, &recipient.BusinessName, &recipient.PublicSlug, &recipient.CustomDomain, &recipient.DomainVerified)
	if err != nil {
		return err
	}
	if strings.TrimSpace(recipient.Email) == "" || recipient.PublicSlug == "" {
		return nil
	}

	kind := siteLiveKind(siteID)
	tag, err := db.Exec(
		ctx,
		`INSERT INTO lifecycle_emails (user_id, kind) VALUES ($1::uuid, $2) ON CONFLICT DO NOTHING`,
		recipient.UserID,
		kind,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return nil
	}

	message := buildSiteLiveMessage(recipient, kind, frontendURL())
	if err := sendLifecycleMessage(ctx, message); err != nil {
		if _, releaseErr := db.Exec(ctx, `DELETE FROM lifecycle_emails WHERE user_id = $1::uuid AND kind = $2`, recipient.UserID, kind); releaseErr != nil {
			log.Println("Libération de l'email « site en ligne » impossible :", releaseErr)
		}
		return err
	}
	return nil
}

func buildSiteLiveMessage(recipient siteLiveRecipient, kind, appURL string) lifecycleMessage {
	businessName := strings.TrimSpace(recipient.BusinessName)
	if businessName == "" {
		businessName = "ton entreprise"
	}

	siteURL, siteLabel := posterSiteURL(recipient.PublicSlug, recipient.CustomDomain, recipient.DomainVerified)
	// The poster QR code keeps its utm_source; the links in this email do not.
	siteURL = strings.SplitN(siteURL, "?", 2)[0]

	paragraphs := []string{
		fmt.Sprintf("Félicitations ! Le site de %s est publié et visible par tout le monde à cette adresse : %s", businessName, siteLabel),
		"Pour que tes clients le trouvent vite :",
		"1. Ajoute cette adresse à ta fiche Google (Google Business Profile), dans le champ « Site web ». C'est souvent là que les clients te découvrent.",
		"2. Imprime ton affichette avec QR code, à télécharger depuis ton tableau de bord Lumio, et pose-la en vitrine, sur ton comptoir ou ton véhicule.",
		"3. Partage le lien sur tes réseaux, dans ta signature d'email et sur WhatsApp.",
		"Les demandes de contact et de devis arriveront par email et dans ton espace Prospects. Une question ? Réponds simplement à cet email.",
	}

	return lifecycleMessage{
		To:      strings.TrimSpace(recipient.Email),
		Subject: fmt.Sprintf("Le site de %s est en ligne !", businessName),
		HTML: lumioEmailHTML(
			"Ton site est en ligne !",
			paragraphs,
			"Voir mon site",
			siteURL,
			`Affichette et statistiques : <a href="`+html.EscapeString(appURL+"/dashboard")+`" style="color:#64748b;">ton tableau de bord Lumio</a>`,
		),
		IdempotencyKey: fmt.Sprintf("lumio-%s-%s", kind, recipient.UserID),
	}
}
