package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"unicode/utf8"
)

// Assistant Lumio : un seul point d'entrée pour discuter avec l'IA.
// Il répond aux questions sur Lumio et, quand l'utilisateur le demande depuis
// l'éditeur, applique la modification au site via modifySiteWithAI.
//
// Quotas : un message d'aide utilise l'action "assistant", comptée dans la
// limite horaire mais pas dans le quota mensuel. Une modification de site
// utilise l'action "modify", comptée comme une modification classique.

const (
	assistantMaxMessageLength = 2000
	assistantMaxHistory       = 8
	assistantMaxHistoryLength = 1500
)

type AssistantMessage struct {
	Role string `json:"role"`
	Text string `json:"text"`
}

type AssistantInput struct {
	Message     string             `json:"message"`
	History     []AssistantMessage `json:"history"`
	Page        string             `json:"page"`
	Site        *GeneratedSite     `json:"site,omitempty"`
	DesignStyle string             `json:"designStyle"`
	AccentColor string             `json:"accentColor"`
	Activity    string             `json:"activity"`
	City        string             `json:"city"`
}

type AssistantOutput struct {
	Reply       string         `json:"reply"`
	Action      string         `json:"action"`
	Suggestions []string       `json:"suggestions"`
	Site        *GeneratedSite `json:"site,omitempty"`
	DesignStyle string         `json:"designStyle,omitempty"`
	AccentColor string         `json:"accentColor,omitempty"`
}

type assistantDecision struct {
	Reply       string   `json:"reply"`
	Intent      string   `json:"intent"`
	Instruction string   `json:"instruction"`
	Suggestions []string `json:"suggestions"`
}

const lumioAssistantKnowledge = `Tu es l'assistant intégré de Lumio (lumio.business), un service français qui permet aux TPE, PME et indépendants de créer, modifier et publier leur site vitrine avec l'IA.

Ce que tu sais de Lumio (ne donne jamais d'autre tarif ou fonctionnalité que ceux-ci) :
- Création gratuite sans carte bancaire : aperçu, édition manuelle, sauvegarde et 15 demandes IA par mois. Un abonnement est nécessaire uniquement pour publier.
- Formules mensuelles : Essentiel 19,90 € (1 site publié, domaine personnel, 9 styles, galerie, référencement de base, 50 demandes IA/mois) ; Pro 39,90 € (tout Essentiel, 200 demandes IA/mois, statistiques détaillées : visiteurs, appels, e-mails, prospects) ; Agence 79,90 € (espace multi-clients, jusqu'à 10 sites publiés, 1 000 demandes IA/mois, un domaine par site). TVA non applicable (article 293 B du CGI) : le prix affiché est le prix payé.
- Quota IA : créations et modifications comptées ensemble, partagé entre les sites du compte, renouvelé le 1er du mois à 00 h UTC, sans report, 20 demandes maximum par heure. Les questions posées à l'assistant ne consomment pas le quota mensuel. L'édition manuelle reste toujours disponible.
- Éditeur (page « Éditeur ») : étapes Infos, Contenu, Apparence, Aperçu, Publication. On peut modifier les textes à la main, changer le style et la couleur, ajouter logo, image d'accueil, images de services, galerie, avis clients, horaires, réseaux sociaux, réorganiser ou masquer des blocs. Un historique de versions permet de revenir en arrière.
- Publication : bouton « Publier » dans l'étape Publication (abonnement actif requis). Le site reçoit une adresse publique Lumio /site/nom-du-site.
- Domaine personnel : depuis « Mes sites », ouvrir le site puis la partie domaine, saisir le domaine, ajouter chez le fournisseur du domaine les enregistrements DNS affichés (A ou CNAME), puis cliquer sur « Vérifier ». L'achat du domaine se fait chez un fournisseur (OVH, IONOS, Gandi…) et reste à la charge du client.
- Prospects : les demandes de contact et de devis envoyées depuis le site arrivent dans « Prospects » (tableau de bord) avec statuts, relances, montants et export CSV.
- Abonnement : page « Abonnement » ; gestion, changement de formule et résiliation depuis le portail Stripe. En cas de résiliation, le site reste en ligne jusqu'à la fin de la période payée, puis repasse en brouillon.
- Connexion par e-mail ou avec Google.

Règles :
- Réponds toujours en français, en tutoyant, de façon courte, concrète et chaleureuse (2 à 5 phrases, ou une courte liste d'étapes).
- Si tu ne sais pas, dis-le simplement et propose d'écrire au support plutôt que d'inventer.
- N'invente jamais de faits sur l'entreprise de l'utilisateur (prix, certifications, avis, délais).
- intent = "modify_site" seulement si l'utilisateur demande clairement de changer son site ET que le contexte indique qu'un site est ouvert dans l'éditeur. Écris alors dans "instruction" une consigne précise et complète pour le moteur de modification (en reprenant les détails donnés), et dans "reply" une phrase courte qui annonce ce que tu vas faire.
- Si l'utilisateur veut modifier son site mais qu'aucun site n'est ouvert, intent = "answer" et explique qu'il faut ouvrir le site dans l'éditeur (bouton « Modifier »).
- Sinon intent = "answer" et "instruction" vide.
- "suggestions" : 2 ou 3 relances courtes (moins de 45 caractères) que l'utilisateur pourrait envoyer ensuite.`

func assistantDecisionSchema() map[string]any {
	return map[string]any{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]any{
			"reply": aiStringSchema("Réponse affichée à l'utilisateur."),
			"intent": map[string]any{
				"type": "string",
				"enum": []string{"answer", "modify_site"},
			},
			"instruction": aiStringSchema("Consigne de modification du site, vide si intent = answer."),
			"suggestions": map[string]any{
				"type":  "array",
				"items": map[string]any{"type": "string"},
			},
		},
		"required": []string{"reply", "intent", "instruction", "suggestions"},
	}
}

func truncateRunes(value string, max int) string {
	value = strings.TrimSpace(value)
	if utf8.RuneCountInString(value) <= max {
		return value
	}
	runes := []rune(value)
	return string(runes[:max])
}

func buildAssistantPrompt(input AssistantInput) string {
	var builder strings.Builder

	page := truncateRunes(input.Page, 60)
	if page == "" {
		page = "inconnue"
	}
	fmt.Fprintf(&builder, "Page actuelle de l'utilisateur : %s\n", page)

	if input.Site != nil {
		fmt.Fprintf(
			&builder,
			"Site ouvert dans l'éditeur : %s (%s, %s). Style : %s. Couleur : %s.\n",
			truncateRunes(input.Site.BusinessName, 120),
			truncateRunes(input.Activity, 120),
			truncateRunes(input.City, 80),
			truncateRunes(input.DesignStyle, 30),
			truncateRunes(input.AccentColor, 20),
		)
		sections := make([]string, 0, len(input.Site.Sections))
		for _, section := range input.Site.Sections {
			sections = append(sections, truncateRunes(section.Title, 80))
		}
		if len(sections) > 0 {
			fmt.Fprintf(&builder, "Services du site : %s.\n", strings.Join(sections, ", "))
		}
	} else {
		builder.WriteString("Aucun site n'est ouvert dans l'éditeur.\n")
	}

	history := input.History
	if len(history) > assistantMaxHistory {
		history = history[len(history)-assistantMaxHistory:]
	}
	if len(history) > 0 {
		builder.WriteString("\nConversation récente :\n")
		for _, message := range history {
			role := "Utilisateur"
			if message.Role == "assistant" {
				role = "Assistant"
			}
			fmt.Fprintf(&builder, "%s : %s\n", role, truncateRunes(message.Text, assistantMaxHistoryLength))
		}
	}

	fmt.Fprintf(&builder, "\nNouveau message de l'utilisateur : %s\n", input.Message)
	return builder.String()
}

func cleanSuggestions(values []string) []string {
	cleaned := make([]string, 0, 3)
	for _, value := range values {
		value = truncateRunes(value, 60)
		if value == "" {
			continue
		}
		cleaned = append(cleaned, value)
		if len(cleaned) == 3 {
			break
		}
	}
	return cleaned
}

func assistantHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", http.StatusMethodNotAllowed)
		return
	}

	user, authenticated := requireUser(w, r)
	if !authenticated {
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 2<<20)

	var input AssistantInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}

	input.Message = strings.TrimSpace(input.Message)
	if input.Message == "" {
		http.Error(w, "Message vide", http.StatusBadRequest)
		return
	}
	if utf8.RuneCountInString(input.Message) > assistantMaxMessageLength {
		http.Error(w, "Message trop long (2 000 caractères maximum)", http.StatusBadRequest)
		return
	}

	usageID, allowed := enforceAIRateLimit(w, r, user.ID, "assistant")
	if !allowed {
		return
	}

	raw, err := callOpenAI(
		r.Context(),
		usageID,
		lumioAssistantKnowledge,
		buildAssistantPrompt(input),
		"lumio_assistant",
		assistantDecisionSchema(),
	)
	if err != nil {
		log.Println("Erreur assistant IA :", err)
		http.Error(w, "L'assistant ne répond pas pour le moment. Réessaie dans un instant.", http.StatusBadGateway)
		return
	}

	var decision assistantDecision
	if err := json.Unmarshal([]byte(raw), &decision); err != nil {
		log.Println("Réponse assistant illisible :", err)
		http.Error(w, "L'assistant ne répond pas pour le moment. Réessaie dans un instant.", http.StatusBadGateway)
		return
	}

	output := AssistantOutput{
		Reply:       strings.TrimSpace(decision.Reply),
		Action:      "answer",
		Suggestions: cleanSuggestions(decision.Suggestions),
	}
	if output.Reply == "" {
		output.Reply = "Je n'ai pas bien compris. Peux-tu reformuler ta demande ?"
	}

	instruction := strings.TrimSpace(decision.Instruction)
	if decision.Intent != "modify_site" || input.Site == nil || instruction == "" {
		writeJSON(w, http.StatusOK, output)
		return
	}

	modifyUsageID, _, allowedModify, err := consumeAIUsage(r.Context(), user.ID, "modify")
	if errors.Is(err, errMonthlyAIQuota) {
		output.Reply = "Ton quota mensuel de modifications IA est atteint, je ne peux pas modifier le site pour l'instant. Tu peux toujours le modifier à la main, ou passer à une formule supérieure depuis « Abonnement »."
		output.Suggestions = []string{"Comparer les formules", "Comment modifier à la main ?"}
		writeJSON(w, http.StatusOK, output)
		return
	}
	if err != nil {
		log.Println("Erreur quota assistant :", err)
		http.Error(w, "Impossible de vérifier la limite IA", http.StatusInternalServerError)
		return
	}
	if !allowedModify {
		output.Reply = "Tu as atteint la limite de 20 demandes IA par heure. Réessaie un peu plus tard : ta modification n'a pas été appliquée."
		output.Suggestions = nil
		writeJSON(w, http.StatusOK, output)
		return
	}

	result, err := modifySiteWithAI(r.Context(), modifyUsageID, ModifySiteInput{
		Site:        *input.Site,
		Instruction: instruction,
		DesignStyle: input.DesignStyle,
		AccentColor: input.AccentColor,
		Activity:    input.Activity,
		City:        input.City,
	})
	if err != nil {
		log.Println("Erreur modification via assistant :", err)
		output.Reply = "Je n'ai pas réussi à appliquer la modification. Ton site n'a pas changé ; réessaie ou reformule ta demande."
		writeJSON(w, http.StatusOK, output)
		return
	}

	output.Action = "modified"
	output.Site = &result.Site
	output.DesignStyle = result.DesignStyle
	output.AccentColor = result.AccentColor
	writeJSON(w, http.StatusOK, output)
}
