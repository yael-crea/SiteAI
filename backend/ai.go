package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"reflect"
	"strconv"
	"strings"
	"time"
)

const aiHourlyLimit = 20

type BusinessInput struct {
	BusinessName string `json:"businessName"`

	Activity string `json:"activity"`

	City string `json:"city"`

	Phone string `json:"phone"`

	Services []string `json:"services"`

	Goal string `json:"goal"`

	TargetAudience string `json:"targetAudience"`

	Tone string `json:"tone"`

	CommunicationStyle string `json:"communicationStyle"`

	PrimaryAction string `json:"primaryAction"`
}

type AIContent struct {
	MetaTitle string `json:"metaTitle"`

	MetaDescription string `json:"metaDescription"`

	HeroEyebrow string `json:"heroEyebrow"`

	HeroTitle string `json:"heroTitle"`

	HeroText string `json:"heroText"`

	PrimaryCTA string `json:"primaryCta"`

	SecondaryCTA string `json:"secondaryCta"`

	AboutTitle string `json:"aboutTitle"`

	AboutText string `json:"aboutText"`

	Sections []SiteSection `json:"sections"`

	Benefits []SiteBenefit `json:"benefits"`

	FAQ []FAQItem `json:"faq"`

	ContactTitle string `json:"contactTitle"`

	ContactText string `json:"contactText"`
}

type ModifySiteInput struct {
	Site GeneratedSite `json:"site"`

	Instruction string `json:"instruction"`

	DesignStyle string `json:"designStyle"`

	AccentColor string `json:"accentColor"`

	Activity string `json:"activity"`

	City string `json:"city"`
}

type ModifySiteOutput struct {
	Site GeneratedSite `json:"site"`

	DesignStyle string `json:"designStyle"`

	AccentColor string `json:"accentColor"`
}

type OpenAIResponse struct {
	ID    string `json:"id"`
	Model string `json:"model"`

	Usage struct {
		InputTokens int64 `json:"input_tokens"`

		InputTokensDetails struct {
			CachedTokens     int64 `json:"cached_tokens"`
			CacheWriteTokens int64 `json:"cache_write_tokens"`
		} `json:"input_tokens_details"`

		OutputTokens int64 `json:"output_tokens"`

		TotalTokens int64 `json:"total_tokens"`
	} `json:"usage"`

	Output []struct {
		Type string `json:"type"`

		Content []struct {
			Type string `json:"type"`

			Text string `json:"text"`
		} `json:"content"`
	} `json:"output"`
}

var errMonthlyAIQuota = errors.New("monthly AI quota reached")

func aiMonthlyLimit(status BillingStatus) int {
	if status.IsAdmin {
		return -1
	}
	if !isActiveBillingStatus(status.Status) {
		return 15
	}
	switch strings.ToLower(strings.TrimSpace(status.Plan)) {
	case "essentiel":
		return 50
	case "pro":
		return 200
	case "agence":
		return 1000
	default:
		return 15
	}
}

func consumeAIUsage(
	ctx context.Context,
	userID string,
	action string,
) (int64, int, bool, error) {
	billing, _, _, err := getBillingStatus(ctx, userID)
	if err != nil {
		return 0, 0, false, err
	}
	monthlyLimit := aiMonthlyLimit(billing)
	tx, err := db.Begin(ctx)
	if err != nil {
		return 0, 0, false, err
	}

	defer tx.Rollback(ctx)

	_, err = tx.Exec(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0));`,
		userID,
	)
	if err != nil {
		return 0, 0, false, err
	}

	var used, monthlyUsed int

	err = tx.QueryRow(
		ctx,
		`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour'),
          COUNT(*) FILTER (WHERE action <> 'assistant' AND created_at >= (date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'))
        FROM ai_usage
        WHERE user_id = $1::uuid
          AND created_at >= LEAST(NOW() - INTERVAL '1 hour', (date_trunc('month', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'));
		`,
		userID,
	).Scan(&used, &monthlyUsed)
	if err != nil {
		return 0, 0, false, err
	}

	// Les questions posées à l'assistant ne consomment pas le quota mensuel :
	// elles restent seulement soumises à la limite horaire.
	if action != "assistant" && monthlyLimit >= 0 && monthlyUsed >= monthlyLimit {
		return 0, 0, false, errMonthlyAIQuota
	}

	if used >= aiHourlyLimit {
		return 0, 0, false, nil
	}

	var usageID int64

	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO ai_usage (
			user_id,
			action,
			created_at
		)
		VALUES (
			$1::uuid,
			$2,
			NOW()
		)
		RETURNING id;
		`,
		userID,
		action,
	).Scan(&usageID)
	if err != nil {
		return 0, 0, false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, false, err
	}

	return usageID, aiHourlyLimit - used - 1, true, nil
}

func enforceAIRateLimit(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
	action string,
) (int64, bool) {
	usageID, remaining, allowed, err := consumeAIUsage(
		r.Context(),
		userID,
		action,
	)

	if errors.Is(err, errMonthlyAIQuota) {
		http.Error(w, "Quota IA mensuel atteint. Les demandes de création et de modification sont comptées ensemble. Le quota revient au début du prochain mois UTC ; consulte les formules pour augmenter ta limite.", http.StatusTooManyRequests)
		return 0, false
	}
	if err != nil {
		log.Println("Erreur rate limit IA :", err)

		http.Error(
			w,
			"Impossible de vérifier la limite IA",
			http.StatusInternalServerError,
		)

		return 0, false
	}

	w.Header().Set(
		"X-RateLimit-Limit",
		strconv.Itoa(aiHourlyLimit),
	)

	w.Header().Set(
		"X-RateLimit-Remaining",
		strconv.Itoa(remaining),
	)

	if !allowed {
		w.Header().Set("Retry-After", "3600")

		http.Error(
			w,
			"Limite temporaire atteinte : 20 utilisations de l'IA maximum par heure. Réessaie un peu plus tard.",
			http.StatusTooManyRequests,
		)

		return 0, false
	}

	return usageID, true
}

func generateHandler(

	w http.ResponseWriter,

	r *http.Request,

) {

	enableCORS(w)

	if r.Method == http.MethodOptions {

		w.WriteHeader(http.StatusNoContent)

		return

	}

	if r.Method != http.MethodPost {

		http.Error(

			w,

			"Méthode non autorisée",

			http.StatusMethodNotAllowed,
		)

		return

	}

	user, authenticated := requireUser(w, r)

	if !authenticated {

		return

	}

	var input BusinessInput

	err := json.NewDecoder(r.Body).Decode(&input)

	if err != nil {

		http.Error(

			w,

			"JSON invalide",

			http.StatusBadRequest,
		)

		return

	}

	input.BusinessName = strings.TrimSpace(input.BusinessName)

	input.Activity = strings.TrimSpace(input.Activity)

	input.City = strings.TrimSpace(input.City)

	input.Phone = strings.TrimSpace(input.Phone)

	input.Goal = strings.TrimSpace(input.Goal)

	input.TargetAudience = strings.TrimSpace(input.TargetAudience)

	input.Tone = strings.TrimSpace(input.Tone)

	input.CommunicationStyle = strings.TrimSpace(input.CommunicationStyle)

	input.PrimaryAction = strings.TrimSpace(input.PrimaryAction)

	if input.BusinessName == "" ||

		input.Activity == "" ||

		input.City == "" {

		http.Error(

			w,

			"Nom, activité et ville obligatoires",

			http.StatusBadRequest,
		)

		return

	}

	usageID, allowed := enforceAIRateLimit(
		w,
		r,
		user.ID,
		"generate",
	)
	if !allowed {
		return
	}

	site, err := generateSiteWithAI(
		r.Context(),
		usageID,
		input,
	)

	if err != nil {

		log.Println("Erreur IA :", err)

		http.Error(

			w,

			"Impossible de générer le site",

			http.StatusInternalServerError,
		)

		return

	}

	writeJSON(

		w,

		http.StatusOK,

		site,
	)

}

func modifyHandler(

	w http.ResponseWriter,

	r *http.Request,

) {

	enableCORS(w)

	if r.Method == http.MethodOptions {

		w.WriteHeader(http.StatusNoContent)

		return

	}

	if r.Method != http.MethodPost {

		http.Error(

			w,

			"Méthode non autorisée",

			http.StatusMethodNotAllowed,
		)

		return

	}

	user, authenticated := requireUser(w, r)

	if !authenticated {

		return

	}

	var input ModifySiteInput

	err := json.NewDecoder(r.Body).Decode(&input)

	if err != nil {

		http.Error(

			w,

			"JSON invalide",

			http.StatusBadRequest,
		)

		return

	}

	input.Instruction = strings.TrimSpace(input.Instruction)

	if input.Instruction == "" {

		http.Error(

			w,

			"Instruction vide",

			http.StatusBadRequest,
		)

		return

	}

	usageID, allowed := enforceAIRateLimit(
		w,
		r,
		user.ID,
		"modify",
	)
	if !allowed {
		return
	}

	result, err := modifySiteWithAI(
		r.Context(),
		usageID,
		input,
	)

	if err != nil {

		log.Println("Erreur modification IA :", err)

		http.Error(

			w,

			"Impossible de modifier le site",

			http.StatusInternalServerError,
		)

		return

	}

	writeJSON(

		w,

		http.StatusOK,

		result,
	)

}

func generateSiteWithAI(

	ctx context.Context,

	usageID int64,

	input BusinessInput,

) (GeneratedSite, error) {

	services := strings.Join(

		input.Services,

		", ",
	)

	if services == "" {

		services = "Aucun service détaillé fourni. Déduire uniquement des catégories de services générales et plausibles à partir de l'activité, sans inventer de spécialité, certification, tarif ou promesse."

	}

	goal := input.Goal
	if goal == "" {
		goal = "générer des prises de contact qualifiées"
	}

	targetAudience := input.TargetAudience
	if targetAudience == "" {
		targetAudience = "clientèle locale générale adaptée à l'activité"
	}

	tone := input.Tone
	if tone == "" {
		tone = "professionnel et chaleureux"
	}

	communicationStyle := input.CommunicationStyle
	if communicationStyle == "" {
		communicationStyle = "clair et concis"
	}

	primaryAction := input.PrimaryAction
	if primaryAction == "" {
		primaryAction = "nous contacter"
	}

	instructions := `
Tu es le moteur de création de Lumio, un outil qui crée des sites vitrines professionnels pour des TPE et PME françaises.

Ta mission est de produire un contenu réellement adapté au métier, à la ville et aux services fournis. Deux entreprises de métiers différents ne doivent pas recevoir le même site avec seulement quelques mots remplacés.

MÉTHODE DE TRAVAIL :
- commence par identifier silencieusement le besoin client principal, les services réellement fournis et les informations factuelles disponibles
- construis ensuite un angle éditorial propre à cette entreprise ; n'affiche jamais cette analyse
- écris chaque bloc avec une fonction distincte : comprendre, choisir, être rassuré ou agir
- termine par une relecture silencieuse de cohérence, de précision et de non-invention avant de produire le JSON

OBJECTIFS :
- donner immédiatement au visiteur une compréhension claire de l'activité
- mettre en avant les services de façon concrète
- rassurer sans inventer de faits
- encourager une prise de contact naturelle
- produire un contenu utile au référencement local
- garder un style professionnel, humain et crédible

RÈGLES ABSOLUES :
- français uniquement
- ne jamais inventer de certification, label ou qualification
- ne jamais inventer d'années d'expérience
- ne jamais inventer de nombre de clients
- ne jamais inventer de tarif, remise ou prix
- ne jamais inventer d'avis client
- ne jamais inventer de garantie
- ne jamais inventer de disponibilité 24h/24 ou 7j/7
- ne jamais inventer de délai d'intervention
- ne jamais inventer d'adresse, d'email ou d'information de contact absente
- ne jamais présenter comme un fait une information que l'utilisateur n'a pas fournie
- éviter les superlatifs non prouvés comme "le meilleur", "numéro 1", "leader"
- éviter le remplissage générique et les phrases vagues
- ne pas répéter la même idée dans plusieurs blocs
- bannir les clichés interchangeables comme "à votre écoute", "solutions sur mesure", "savoir-faire reconnu", "qualité, réactivité et proximité" lorsqu'aucun élément concret ne les justifie
- ne pas créer de rubrique "Avis clients" si aucun témoignage réel n'est fourni
- ne pas transformer une rubrique éditoriale comme "Pourquoi nous choisir" en service commercial
- chaque affirmation factuelle doit être directement issue des informations fournies ; sinon, la formuler comme une possibilité ou l'omettre

PERSONNALISATION :
- adapte le vocabulaire au secteur d'activité
- adapte les besoins clients évoqués au métier
- utilise la ville de manière naturelle, sans bourrage de mots-clés
- si des services sont fournis, donne-leur la priorité
- si aucun service détaillé n'est fourni, reste sur des catégories générales cohérentes avec l'activité
- prends réellement en compte l'objectif du site, la clientèle cible, le ton et le style de communication fournis
- le hero doit parler en priorité au public cible et soutenir l'objectif principal
- les sections doivent être ordonnées selon ce qui aide le mieux à atteindre l'objectif
- le CTA principal doit suivre l'action souhaitée quand elle est compatible avec les fonctionnalités réelles du site
- si l'action souhaitée suppose une fonctionnalité non disponible, reformule vers une prise de contact cohérente au lieu de promettre cette fonctionnalité
- les CTA doivent rester courts, naturels et spécifiques au métier
- privilégier des verbes d'action concrets et un vocabulaire que les clients de ce métier utilisent réellement
- varier la structure des titres et des phrases ; ne pas commencer plusieurs blocs de la même manière

STRUCTURE À PRODUIRE :
- metaTitle : titre SEO naturel, idéalement autour de 50 à 60 caractères
- metaDescription : description SEO claire, idéalement autour de 140 à 160 caractères
- heroEyebrow : courte ligne de contexte, par exemple activité + ville
- heroTitle : titre principal spécifique et orienté bénéfice client
- heroText : 1 à 2 phrases qui expliquent clairement la proposition de valeur
- primaryCta : CTA principal court et adapté au métier
- secondaryCta : CTA secondaire court
- aboutTitle : titre de présentation de l'entreprise
- aboutText : 2 à 3 phrases de présentation sans inventer d'historique
- sections : entre 4 et 6 blocs de services ou besoins clients, chacun avec un titre précis et un texte utile
- benefits : exactement 3 avantages formulés comme bénéfices, méthode de travail ou simplicité pour le client, sans fausse preuve
- faq : 4 questions-réponses utiles et spécifiques au secteur ; les réponses doivent rester prudentes lorsqu'une information dépend de l'entreprise
- contactTitle : titre de prise de contact
- contactText : 1 à 2 phrases pour encourager le contact sans fausse promesse

STYLE ÉDITORIAL HAUT DE GAMME :
- aucun emoji, aucun symbole décoratif et aucun point d'exclamation
- heroTitle court et mémorable : 4 à 9 mots, sans deux-points ni énumération
- heroEyebrow très court : 2 à 5 mots, sans ponctuation finale
- titres de sections en 2 à 6 mots, précis plutôt que génériques
- phrases nettes, rythme varié, un seul message par phrase ; préférer le concret au promotionnel
- ton sobre et assuré, comme une marque premium du secteur : ni familier, ni publicitaire

Le résultat doit être directement publiable sur un site professionnel.

BARRE DE QUALITÉ AVANT RETOUR :
- le hero doit être impossible à réutiliser tel quel pour une entreprise d'un autre secteur
- chaque section doit apporter une information nouvelle
- aucun avantage ne doit ressembler à une preuve inventée
- aucun texte ne doit mentionner une disponibilité, un délai, un tarif, une garantie ou une qualification absents du brief
- le ton doit sembler écrit par un bon rédacteur humain, pas par un générateur de texte
`

	userPrompt := fmt.Sprintf(
		`Entreprise : %s

Activité : %s

Ville : %s

Téléphone : %s

Services fournis : %s

Objectif principal du site : %s

Clientèle cible : %s

Ton souhaité : %s

Style de communication : %s

Action principale souhaitée : %s

Crée une version complète et réellement personnalisée du contenu du site en utilisant ces préférences sans inventer de faits.`,
		input.BusinessName,
		input.Activity,
		input.City,
		input.Phone,
		services,
		goal,
		targetAudience,
		tone,
		communicationStyle,
		primaryAction,
	)

	outputText, err := callOpenAI(

		ctx,

		usageID,

		instructions,

		userPrompt,

		"siteai_generated_site_v3",

		generatedContentSchema(),
	)

	if err != nil {

		return GeneratedSite{}, err

	}

	var content AIContent

	err = json.Unmarshal(

		[]byte(outputText),

		&content,
	)

	if err != nil {

		return GeneratedSite{}, err

	}

	return GeneratedSite{

		BusinessName: input.BusinessName,

		Slug: slugify(input.BusinessName),

		MetaTitle: content.MetaTitle,

		MetaDescription: content.MetaDescription,

		HeroEyebrow: content.HeroEyebrow,

		HeroTitle: content.HeroTitle,

		HeroText: content.HeroText,

		PrimaryCTA: content.PrimaryCTA,

		SecondaryCTA: content.SecondaryCTA,

		Phone: input.Phone,

		AboutTitle: content.AboutTitle,

		AboutText: content.AboutText,

		Sections: content.Sections,

		Benefits: content.Benefits,

		FAQ: content.FAQ,

		ContactTitle: content.ContactTitle,

		ContactText: content.ContactText,
	}, nil

}

func modifySiteWithAI(

	ctx context.Context,

	usageID int64,

	input ModifySiteInput,

) (ModifySiteOutput, error) {

	// Give each existing section a stable reference for this request, so media
	// stays attached when the AI reorders or inserts services.
	annotatedSite := input.Site
	annotatedSite.Sections = append([]SiteSection(nil), input.Site.Sections...)
	for index := range annotatedSite.Sections {
		oldIndex := index
		annotatedSite.Sections[index].SourceIndex = &oldIndex
	}

	currentJSON, err := json.MarshalIndent(

		annotatedSite,

		"",

		"  ",
	)

	if err != nil {

		return ModifySiteOutput{}, err

	}

	currentDesign := normalizeDesignStyle(

		input.DesignStyle,
	)

	currentColor := normalizeAccentColor(

		input.AccentColor,

		"#2563eb",
	)

	instructions := `
Tu es l'éditeur intelligent de Lumio.

Tu reçois le contenu complet d'un site vitrine existant et une demande de modification de l'utilisateur.

PRINCIPE :
- modifie uniquement ce qui est nécessaire pour répondre à la demande
- conserve toutes les informations et tous les blocs non concernés
- retourne toujours l'objet complet du site, même si une seule phrase change
- si la demande est ambiguë, applique la modification la plus petite, la plus sûre et la plus facilement réversible
- relis silencieusement le résultat complet avant de retourner le JSON afin d'éviter contradictions et répétitions
- chaque section de service existante conserve son sourceIndex du SITE ACTUEL, même si son titre ou sa position change
- pour un nouveau service, définis sourceIndex à null ; ne réutilise jamais un sourceIndex deux fois
- tu peux changer layoutOrder pour réorganiser les blocs, hiddenBlocks pour les masquer ou les afficher, et designSettings pour modifier l'apparence
- utilise uniquement ces identifiants de blocs : about, services, process, faq, gallery, contact
- animations : designSettings.motion vaut auto (aucune animation), subtle (apparitions douces) ou dynamic (plus vivant) ; designSettings.heroBackground vaut auto (fond fixe), zoom (zoom lent sur la photo), gradient (dégradé animé) ou aurora (formes lumineuses qui flottent)
- conserve exactement layoutOrder, hiddenBlocks et designSettings lorsqu'aucun changement n'est demandé
- ne crée pas de faux témoignages ; laisse la liste des avis vide lorsqu'aucun avis réel n'est fourni
- une demande impliquant une fonctionnalité non représentée par ces champs ne doit pas être simulée en affirmant qu'elle est réalisée

QUALITÉ :
- français uniquement
- ton professionnel, naturel et adapté au métier
- vocabulaire spécifique à l'activité lorsque c'est pertinent
- référencement local naturel lorsque la demande concerne le contenu
- éviter les répétitions, le jargon inutile et les formulations génériques
- bannir les clichés interchangeables comme "à votre écoute", "solutions sur mesure" ou "savoir-faire reconnu" sans preuve concrète
- si l'utilisateur demande une réécriture globale, harmonise hero, à propos, services, avantages, FAQ et contact
- si l'utilisateur demande un texte plus professionnel, rends-le plus précis et plus crédible, sans le rendre plus long par défaut

SÉCURITÉ DU CONTENU :
- ne jamais inventer de certification, label ou qualification
- ne jamais inventer d'années d'expérience
- ne jamais inventer de nombre de clients
- ne jamais inventer de tarif ou de remise
- ne jamais inventer d'avis client
- ne jamais inventer de garantie
- ne jamais inventer de disponibilité 24h/24 ou 7j/7
- ne jamais inventer de délai d'intervention
- ne jamais inventer d'adresse, d'email ou d'information factuelle absente
- éviter les superlatifs non prouvés
- ne pas créer de rubrique "Avis clients" sans témoignages réels fournis
- chaque nouvelle affirmation factuelle doit être traçable à la demande ou au site actuel

DESIGN :
- designStyle doit être exactement moderne, elegant ou artisan
- accentColor doit être une couleur hexadécimale valide
- ne change le style ou la couleur que si la demande le justifie

MÉDIAS :
- le logo, l'image principale et la galerie sont gérés séparément par l'utilisateur
- ne tente jamais de remplacer, supprimer ou inventer leurs URL

CTA :
- primaryCta et secondaryCta doivent être courts et cohérents avec le métier
- ne promets pas une réservation en ligne, un devis instantané ou une autre fonctionnalité absente

FAQ :
- conserve des réponses prudentes lorsque la réponse dépend de l'entreprise
- n'invente jamais une politique commerciale ou un engagement non fourni
`

	userPrompt := fmt.Sprintf(
		`SITE ACTUEL :

%s

ACTIVITÉ :
%s

VILLE :
%s

STYLE ACTUEL :
%s

COULEUR ACTUELLE :
%s

DEMANDE DE L'UTILISATEUR :
%s

Retourne le site complet après modification.`,
		string(currentJSON),
		input.Activity,
		input.City,
		currentDesign,
		currentColor,
		input.Instruction,
	)

	outputText, err := callOpenAI(

		ctx,

		usageID,

		instructions,

		userPrompt,

		"siteai_modified_site_v3",

		modifiedSiteSchema(),
	)

	if err != nil {

		return ModifySiteOutput{}, err

	}

	var result ModifySiteOutput

	err = json.Unmarshal(

		[]byte(outputText),

		&result,
	)

	if err != nil {

		return ModifySiteOutput{}, err

	}

	// Discard invalid or duplicated AI references before returning the sections.
	seenSourceIndexes := map[int]bool{}
	for index := range result.Site.Sections {
		sourceIndex := result.Site.Sections[index].SourceIndex
		if sourceIndex == nil {
			continue
		}
		if *sourceIndex < 0 || *sourceIndex >= len(input.Site.Sections) || seenSourceIndexes[*sourceIndex] {
			result.Site.Sections[index].SourceIndex = nil
			continue
		}
		seenSourceIndexes[*sourceIndex] = true
	}

	if strings.TrimSpace(

		result.Site.BusinessName,
	) == "" {

		result.Site.BusinessName = input.Site.BusinessName

	}

	if strings.TrimSpace(

		result.Site.Phone,
	) == "" {

		result.Site.Phone = input.Site.Phone

	}

	if strings.TrimSpace(

		result.Site.MetaTitle,
	) == "" {

		result.Site.MetaTitle = input.Site.MetaTitle

	}

	if strings.TrimSpace(

		result.Site.MetaDescription,
	) == "" {

		result.Site.MetaDescription = input.Site.MetaDescription

	}

	if strings.TrimSpace(

		result.Site.HeroEyebrow,
	) == "" {

		result.Site.HeroEyebrow = input.Site.HeroEyebrow

	}

	if strings.TrimSpace(

		result.Site.HeroTitle,
	) == "" {

		result.Site.HeroTitle = input.Site.HeroTitle

	}

	if strings.TrimSpace(

		result.Site.HeroText,
	) == "" {

		result.Site.HeroText = input.Site.HeroText

	}

	if strings.TrimSpace(

		result.Site.PrimaryCTA,
	) == "" {

		result.Site.PrimaryCTA = input.Site.PrimaryCTA

	}

	if strings.TrimSpace(

		result.Site.SecondaryCTA,
	) == "" {

		result.Site.SecondaryCTA = input.Site.SecondaryCTA

	}

	if strings.TrimSpace(

		result.Site.AboutTitle,
	) == "" {

		result.Site.AboutTitle = input.Site.AboutTitle

	}

	if strings.TrimSpace(

		result.Site.AboutText,
	) == "" {

		result.Site.AboutText = input.Site.AboutText

	}

	if len(

		result.Site.Sections,
	) == 0 {

		result.Site.Sections = input.Site.Sections

	}

	if len(

		result.Site.Benefits,
	) == 0 {

		result.Site.Benefits = input.Site.Benefits

	}

	if len(

		result.Site.FAQ,
	) == 0 {

		result.Site.FAQ = input.Site.FAQ

	}

	if strings.TrimSpace(

		result.Site.ContactTitle,
	) == "" {

		result.Site.ContactTitle = input.Site.ContactTitle

	}

	if strings.TrimSpace(

		result.Site.ContactText,
	) == "" {

		result.Site.ContactText = input.Site.ContactText

	}

	// Existing growth metadata is outside the AI-edit schema. Preserve it.
	result.Site.Testimonials = input.Site.Testimonials
	result.Site.ServiceArea = input.Site.ServiceArea
	result.Site.OpeningHours = input.Site.OpeningHours
	result.Site.ClientName = input.Site.ClientName
	result.Site.ClientEmail = input.Site.ClientEmail
	result.Site.SocialLinks = input.Site.SocialLinks

	// Preserve the existing style when the model leaves an optional design
	// setting blank, but allow explicit valid modifications.
	previousDesign := input.Site.DesignSettings
	updatedDesign := &result.Site.DesignSettings
	previousValue := reflect.ValueOf(previousDesign)
	updatedValue := reflect.ValueOf(updatedDesign).Elem()
	for i := 0; i < updatedValue.NumField(); i++ {
		if updatedValue.Field(i).String() == "" {
			updatedValue.Field(i).SetString(previousValue.Field(i).String())
		}
	}

	// Les médias sont gérés par l'utilisateur dans Supabase Storage.
	// L'IA ne doit jamais les supprimer ou les remplacer.
	result.Site.SiteGoal = input.Site.SiteGoal
	result.Site.BookingURL = input.Site.BookingURL
	result.Site.LogoURL = input.Site.LogoURL
	result.Site.HeroImageURL = input.Site.HeroImageURL
	result.Site.Gallery = input.Site.Gallery

	result.Site.Slug = slugify(

		result.Site.BusinessName,
	)

	result.DesignStyle = normalizeDesignStyle(

		result.DesignStyle,
	)

	result.AccentColor = normalizeAccentColor(

		result.AccentColor,

		currentColor,
	)

	return result, nil

}

func calculateOpenAICostUSD(
	model string,
	inputTokens int64,
	cachedTokens int64,
	cacheWriteTokens int64,
	outputTokens int64,
) (float64, bool) {
	var inputPrice float64
	var cachedInputPrice float64
	var cacheWritePrice float64
	var outputPrice float64

	normalizedModel := strings.ToLower(strings.TrimSpace(model))
	switch {
	case strings.HasPrefix(normalizedModel, "gpt-5.6-luna"):
		inputPrice = 0.20
		cachedInputPrice = 0.02
		cacheWritePrice = 0.25
		outputPrice = 1.20
	case strings.HasPrefix(normalizedModel, "gpt-6-luna"):
		inputPrice = 0.10
		cachedInputPrice = 0.01
		cacheWritePrice = 0.125
		outputPrice = 0.50
	case strings.HasPrefix(normalizedModel, "gpt-6.1-sol"):
		inputPrice = 2.00
		cachedInputPrice = 0.10
		cacheWritePrice = 2.50
		outputPrice = 10.00
	default:
		return 0, false
	}

	ordinaryInputTokens :=
		inputTokens -
			cachedTokens -
			cacheWriteTokens

	if ordinaryInputTokens < 0 {
		ordinaryInputTokens = 0
	}

	cost :=
		(float64(ordinaryInputTokens)*inputPrice +
			float64(cachedTokens)*cachedInputPrice +
			float64(cacheWriteTokens)*cacheWritePrice +
			float64(outputTokens)*outputPrice) /
			1_000_000

	return cost, true
}

func saveAIUsageMetrics(
	ctx context.Context,
	usageID int64,
	response OpenAIResponse,
	requestedModel string,
) error {
	model := strings.TrimSpace(response.Model)

	if model == "" {
		model = strings.TrimSpace(requestedModel)
	}

	inputTokens := response.Usage.InputTokens
	cachedTokens :=
		response.Usage.InputTokensDetails.CachedTokens
	cacheWriteTokens :=
		response.Usage.InputTokensDetails.CacheWriteTokens
	outputTokens := response.Usage.OutputTokens
	totalTokens := response.Usage.TotalTokens

	if totalTokens == 0 {
		totalTokens = inputTokens + outputTokens
	}

	costUSD, hasPrice := calculateOpenAICostUSD(
		model,
		inputTokens,
		cachedTokens,
		cacheWriteTokens,
		outputTokens,
	)

	var estimatedCost any
	if hasPrice {
		estimatedCost = costUSD
	}

	_, err := db.Exec(
		ctx,
		`
		UPDATE ai_usage
		SET
			model = $2,
			input_tokens = $3,
			cached_input_tokens = $4,
			cache_write_tokens = $5,
			output_tokens = $6,
			total_tokens = $7,
			estimated_cost_usd = $8,
			openai_response_id = $9
		WHERE id = $1;
		`,
		usageID,
		model,
		inputTokens,
		cachedTokens,
		cacheWriteTokens,
		outputTokens,
		totalTokens,
		estimatedCost,
		response.ID,
	)

	return err
}

func callOpenAI(

	ctx context.Context,

	usageID int64,

	instructions string,

	input string,

	schemaName string,

	schema map[string]any,

) (string, error) {

	model := selectOpenAIModel(schemaName)

	requestBody := map[string]any{

		"model": model,

		"store": false,

		"instructions": instructions,

		"input": input,

		"text": map[string]any{

			"format": map[string]any{

				"type": "json_schema",

				"name": schemaName,

				"strict": true,

				"schema": schema,
			},
		},
	}

	if strings.HasPrefix(model, "gpt-5.6-") || strings.HasPrefix(model, "gpt-6") {
		requestBody["reasoning"] = map[string]any{
			"effort": "medium",
		}
	}

	body, err := json.Marshal(requestBody)

	if err != nil {

		return "", err

	}

	request, err := http.NewRequestWithContext(

		ctx,

		http.MethodPost,

		"https://api.openai.com/v1/responses",

		bytes.NewBuffer(body),
	)

	if err != nil {

		return "", err

	}

	request.Header.Set(

		"Content-Type",

		"application/json",
	)

	request.Header.Set(

		"Authorization",

		"Bearer "+os.Getenv("OPENAI_API_KEY"),
	)

	client := &http.Client{

		Timeout: 60 * time.Second,
	}

	response, err := client.Do(request)

	if err != nil {

		return "", err

	}

	defer response.Body.Close()

	responseBody, err := io.ReadAll(

		response.Body,
	)

	if err != nil {

		return "", err

	}

	if response.StatusCode < 200 ||

		response.StatusCode >= 300 {

		return "",

			fmt.Errorf(

				"OpenAI HTTP %d : %s",

				response.StatusCode,

				string(responseBody),
			)

	}

	var parsed OpenAIResponse

	err = json.Unmarshal(

		responseBody,

		&parsed,
	)

	if err != nil {

		return "", err

	}

	if err := saveAIUsageMetrics(
		ctx,
		usageID,
		parsed,
		model,
	); err != nil {
		log.Println(
			"Erreur enregistrement coût IA :",
			err,
		)
	}

	for _, output := range parsed.Output {

		for _, content := range output.Content {

			if content.Type == "output_text" {

				return content.Text, nil

			}

		}

	}

	return "", errors.New("aucun texte retourné")

}

func selectOpenAIModel(schemaName string) string {
	if strings.Contains(schemaName, "generated_site") {
		if model := strings.TrimSpace(os.Getenv("OPENAI_GENERATION_MODEL")); model != "" {
			return model
		}
	} else if model := strings.TrimSpace(os.Getenv("OPENAI_MODIFICATION_MODEL")); model != "" {
		return model
	}

	if model := strings.TrimSpace(os.Getenv("OPENAI_MODEL")); model != "" {
		return model
	}

	if strings.Contains(schemaName, "generated_site") {
		return "gpt-6.1-sol"
	}

	return "gpt-6-luna"
}

func aiStringSchema(description string) map[string]any {
	return map[string]any{
		"type":        "string",
		"description": description,
	}
}

func generatedContentSchema() map[string]any {

	return map[string]any{

		"type": "object",

		"additionalProperties": false,

		"properties": map[string]any{

			"metaTitle": aiStringSchema("Titre SEO naturel contenant l'activité ou l'entreprise et la ville, sans slogan générique."),

			"metaDescription": aiStringSchema("Résumé SEO précis de la proposition de valeur et de la zone géographique, sans promesse inventée."),

			"heroEyebrow": aiStringSchema("Repère très court combinant naturellement activité et localisation."),

			"heroTitle": aiStringSchema("Titre principal distinctif, concret et orienté vers le besoin prioritaire du client."),

			"heroText": aiStringSchema("Une ou deux phrases expliquant clairement l'offre, le public et l'intérêt de contacter l'entreprise."),

			"primaryCta": aiStringSchema("Action principale courte, concrète et compatible avec les fonctions réelles du site."),

			"secondaryCta": aiStringSchema("Action secondaire courte et différente de l'action principale."),

			"aboutTitle": aiStringSchema("Titre de présentation spécifique à l'entreprise, sans cliché publicitaire."),

			"aboutText": aiStringSchema("Deux ou trois phrases factuelles présentant l'activité et l'approche sans inventer d'historique."),

			"sections": sectionsSchema(),

			"benefits": benefitsSchema(),

			"faq": faqSchema(),

			"contactTitle": aiStringSchema("Titre de prise de contact naturel et spécifique au projet du visiteur."),

			"contactText": aiStringSchema("Une ou deux phrases indiquant clairement quoi communiquer et ce qui se passera ensuite, sans délai inventé."),
		},

		"required": []string{

			"metaTitle",

			"metaDescription",

			"heroEyebrow",

			"heroTitle",

			"heroText",

			"primaryCta",

			"secondaryCta",

			"aboutTitle",

			"aboutText",

			"sections",

			"benefits",

			"faq",

			"contactTitle",

			"contactText",
		},
	}

}

func modifiedSiteSchema() map[string]any {

	return map[string]any{

		"type": "object",

		"additionalProperties": false,

		"properties": map[string]any{

			"site": modifiedSiteDataSchema(),

			"designStyle": map[string]any{

				"type": "string",

				"enum": []string{

					"moderne",

					"elegant",

					"artisan",
				},
			},

			"accentColor": map[string]any{

				"type": "string",
			},
		},

		"required": []string{

			"site",

			"designStyle",

			"accentColor",
		},
	}

}

// Keep initial generation's schema unchanged; only AI modifications can edit
// layout, appearance and source references to existing service cards.
func modifiedSiteDataSchema() map[string]any {
	schema := siteSchema()
	properties := schema["properties"].(map[string]any)
	blocks := []string{"about", "services", "process", "faq", "gallery", "contact"}
	properties["layoutOrder"] = map[string]any{"type": "array", "items": map[string]any{"type": "string", "enum": blocks}}
	properties["hiddenBlocks"] = map[string]any{"type": "array", "items": map[string]any{"type": "string", "enum": blocks}}
	properties["designSettings"] = modifiedDesignSettingsSchema()
	properties["sections"] = modifiedSectionsSchema()
	schema["required"] = append(schema["required"].([]string), "layoutOrder", "hiddenBlocks", "designSettings")
	return schema
}

func modifiedSectionsSchema() map[string]any {
	return map[string]any{
		"type": "array",
		"items": map[string]any{
			"type": "object", "additionalProperties": false,
			"properties": map[string]any{
				"title":       map[string]any{"type": "string"},
				"text":        map[string]any{"type": "string"},
				"sourceIndex": map[string]any{"type": []string{"integer", "null"}},
			},
			"required": []string{"title", "text", "sourceIndex"},
		},
	}
}

func modifiedDesignSettingsSchema() map[string]any {
	fields := []string{
		"font", "buttonStyle", "cardStyle", "logoSize", "heroLayout",
		"contentWidth", "spacing", "background", "titleScale", "textScale",
		"titleWeight", "titleCase", "lineHeight", "cardRadius",
		"shadowStrength", "imageRadius", "imageRatio", "imageFit", "buttonSize",
		"motion", "heroBackground",
	}
	properties := make(map[string]any, len(fields))
	for _, field := range fields {
		properties[field] = map[string]any{"type": "string"}
	}
	return map[string]any{
		"type": "object", "additionalProperties": false,
		"properties": properties, "required": fields,
	}
}

func siteSchema() map[string]any {

	return map[string]any{

		"type": "object",

		"additionalProperties": false,

		"properties": map[string]any{

			"businessName": aiStringSchema("Nom de l'entreprise, à conserver sauf demande explicite."),

			"slug": aiStringSchema("Identifiant d'URL existant, à conserver sauf renommage explicite."),

			"metaTitle": aiStringSchema("Titre SEO naturel, précis et localisé."),

			"metaDescription": aiStringSchema("Résumé SEO clair sans affirmation factuelle nouvelle."),

			"heroEyebrow": aiStringSchema("Repère très court combinant activité et localisation."),

			"heroTitle": aiStringSchema("Titre principal concret et distinctif."),

			"heroText": aiStringSchema("Proposition de valeur claire en une ou deux phrases."),

			"primaryCta": aiStringSchema("Action principale courte et réalisable sur le site."),

			"secondaryCta": aiStringSchema("Action secondaire courte et complémentaire."),

			"phone": aiStringSchema("Téléphone existant, à conserver sauf demande explicite."),

			"aboutTitle": aiStringSchema("Titre de présentation spécifique et sans cliché."),

			"aboutText": aiStringSchema("Présentation factuelle de l'activité et de l'approche."),

			"sections": sectionsSchema(),

			"benefits": benefitsSchema(),

			"faq": faqSchema(),

			"contactTitle": aiStringSchema("Titre de contact adapté au besoin du visiteur."),

			"contactText": aiStringSchema("Texte de contact clair, utile et sans promesse inventée."),
		},

		"required": []string{

			"businessName",

			"slug",

			"metaTitle",

			"metaDescription",

			"heroEyebrow",

			"heroTitle",

			"heroText",

			"primaryCta",

			"secondaryCta",

			"phone",

			"aboutTitle",

			"aboutText",

			"sections",

			"benefits",

			"faq",

			"contactTitle",

			"contactText",
		},
	}

}

func sectionsSchema() map[string]any {

	return map[string]any{

		"type": "array",

		"description": "Quatre à six services ou besoins clients distincts, ordonnés par importance commerciale.",

		"minItems": 4,

		"maxItems": 6,

		"items": map[string]any{

			"type": "object",

			"additionalProperties": false,

			"properties": map[string]any{

				"title": aiStringSchema("Nom précis d'un service ou d'un besoin client ; jamais un titre générique comme Pourquoi nous choisir."),

				"text": aiStringSchema("Explication concrète, utile et distincte des autres sections, sans modalité inventée."),
			},

			"required": []string{

				"title",

				"text",
			},
		},
	}

}

func benefitsSchema() map[string]any {

	return map[string]any{

		"type": "array",

		"description": "Exactement trois bénéfices crédibles portant sur la méthode, la clarté ou la simplicité du parcours client.",

		"minItems": 3,

		"maxItems": 3,

		"items": map[string]any{

			"type": "object",

			"additionalProperties": false,

			"properties": map[string]any{

				"title": aiStringSchema("Bénéfice court, précis et non présenté comme une preuve non fournie."),

				"text": aiStringSchema("Explication concrète de ce bénéfice pour le client."),
			},

			"required": []string{

				"title",

				"text",
			},
		},
	}

}

func faqSchema() map[string]any {

	return map[string]any{

		"type": "array",

		"description": "Exactement quatre questions fréquentes réellement utiles avant une prise de contact.",

		"minItems": 4,

		"maxItems": 4,

		"items": map[string]any{

			"type": "object",

			"additionalProperties": false,

			"properties": map[string]any{

				"question": aiStringSchema("Question naturelle et spécifique qu'un prospect de ce métier peut réellement se poser."),

				"answer": aiStringSchema("Réponse utile et prudente ; inviter au contact lorsque la réponse dépend de l'entreprise ou du projet."),
			},

			"required": []string{

				"question",

				"answer",
			},
		},
	}

}
