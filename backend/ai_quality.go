package main

import (
	"fmt"
	"strings"
	"unicode"
)

// Automatic quality check of a generated site. The prompt already asks for
// all of this; the check catches what the model still gets wrong, and the
// generation asks once for a correction of exactly these points (see
// generateSiteWithAI). The client never sees the first draft.

var bannedPhrases = []string{
	"à votre écoute",
	"solutions sur mesure",
	"solution sur mesure",
	"savoir-faire reconnu",
	"qualité, réactivité et proximité",
	"n'hésitez pas",
	"n’hésitez pas",
	"numéro 1",
	"leader",
	"le meilleur",
	"la meilleure",
	"les meilleurs",
}

func wordCount(text string) int {
	return len(strings.Fields(text))
}

func hasEmoji(text string) bool {
	for _, r := range text {
		if (r >= 0x1F300 && r <= 0x1FAFF) || (r >= 0x2600 && r <= 0x27BF) {
			return true
		}
	}
	return false
}

func normalizedTitle(text string) string {
	return strings.Join(strings.FieldsFunc(strings.ToLower(text), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	}), " ")
}

// contentTexts lists every visible text of the generated content with a
// label used in the correction request.
func contentTexts(content AIContent) [][2]string {
	texts := [][2]string{
		{"metaTitle", content.MetaTitle},
		{"metaDescription", content.MetaDescription},
		{"heroEyebrow", content.HeroEyebrow},
		{"heroTitle", content.HeroTitle},
		{"heroText", content.HeroText},
		{"primaryCta", content.PrimaryCTA},
		{"secondaryCta", content.SecondaryCTA},
		{"aboutTitle", content.AboutTitle},
		{"aboutText", content.AboutText},
		{"contactTitle", content.ContactTitle},
		{"contactText", content.ContactText},
	}
	for index, option := range content.HeroTitleOptions {
		texts = append(texts, [2]string{fmt.Sprintf("heroTitleOptions[%d]", index), option})
	}
	for index, section := range content.Sections {
		texts = append(texts,
			[2]string{fmt.Sprintf("sections[%d].title", index), section.Title},
			[2]string{fmt.Sprintf("sections[%d].text", index), section.Text})
	}
	for index, benefit := range content.Benefits {
		texts = append(texts,
			[2]string{fmt.Sprintf("benefits[%d].title", index), benefit.Title},
			[2]string{fmt.Sprintf("benefits[%d].text", index), benefit.Text})
	}
	for index, item := range content.FAQ {
		texts = append(texts,
			[2]string{fmt.Sprintf("faq[%d].question", index), item.Question},
			[2]string{fmt.Sprintf("faq[%d].answer", index), item.Answer})
	}
	return texts
}

// contentQualityIssues returns the problems to correct, in French, ready to
// be sent back to the model. Empty means the content passes.
func contentQualityIssues(content AIContent) []string {
	var issues []string

	for _, text := range contentTexts(content) {
		lower := strings.ToLower(text[1])
		if strings.Contains(text[1], "!") {
			issues = append(issues, fmt.Sprintf("%s contient un point d'exclamation : retire-le", text[0]))
		}
		if hasEmoji(text[1]) {
			issues = append(issues, fmt.Sprintf("%s contient un emoji ou un symbole décoratif : retire-le", text[0]))
		}
		for _, phrase := range bannedPhrases {
			if strings.Contains(lower, phrase) {
				issues = append(issues, fmt.Sprintf("%s utilise le cliché « %s » : remplace-le par une formulation concrète", text[0], phrase))
			}
		}
	}

	if count := wordCount(content.HeroTitle); count < 3 || count > 10 {
		issues = append(issues, fmt.Sprintf("heroTitle fait %d mots : vise 4 à 9 mots", count))
	}
	if count := wordCount(content.HeroEyebrow); count == 0 || count > 6 {
		issues = append(issues, fmt.Sprintf("heroEyebrow fait %d mots : vise 2 à 5 mots", count))
	}
	if length := len([]rune(content.MetaTitle)); length > 70 {
		issues = append(issues, fmt.Sprintf("metaTitle fait %d caractères : reste sous 60", length))
	}
	if length := len([]rune(content.MetaDescription)); length > 175 {
		issues = append(issues, fmt.Sprintf("metaDescription fait %d caractères : reste entre 140 et 160", length))
	}

	if count := len(content.Sections); count < 4 || count > 6 {
		issues = append(issues, fmt.Sprintf("%d blocs de services : il en faut entre 4 et 6", count))
	}
	if count := len(content.Benefits); count != 3 {
		issues = append(issues, fmt.Sprintf("%d avantages : il en faut exactement 3", count))
	}
	if count := len(content.FAQ); count != 4 {
		issues = append(issues, fmt.Sprintf("%d questions dans la FAQ : il en faut exactement 4", count))
	}

	seen := map[string]bool{}
	for _, section := range content.Sections {
		key := normalizedTitle(section.Title)
		if key != "" && seen[key] {
			issues = append(issues, fmt.Sprintf("le titre de service « %s » apparaît deux fois", section.Title))
		}
		seen[key] = true
	}

	options := map[string]bool{}
	for _, option := range content.HeroTitleOptions {
		if key := normalizedTitle(option); key != "" {
			options[key] = true
		}
	}
	if len(options) != 3 {
		issues = append(issues, "heroTitleOptions doit contenir 3 accroches différentes, la première identique à heroTitle")
	}

	return issues
}

func qualityCorrectionPrompt(userPrompt, draftJSON string, issues []string) string {
	return userPrompt + `

VOICI UNE PREMIÈRE VERSION DU CONTENU (JSON) :
` + draftJSON + `

CORRECTIONS OBLIGATOIRES :
- ` + strings.Join(issues, "\n- ") + `

Renvoie le JSON complet corrigé. Ne modifie que ce qui est nécessaire pour corriger ces points ; garde tout le reste à l'identique.`
}

// heroTitleChoices returns up to three distinct headlines, the chosen
// heroTitle first.
func heroTitleChoices(heroTitle string, options []string) []string {
	choices := []string{}
	seen := map[string]bool{}
	for _, option := range append([]string{heroTitle}, options...) {
		option = strings.TrimSpace(option)
		key := normalizedTitle(option)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		choices = append(choices, option)
		if len(choices) == 3 {
			break
		}
	}
	return choices
}

func limitRunes(text string, max int) string {
	runes := []rune(text)
	if len(runes) <= max {
		return text
	}
	return strings.TrimSpace(string(runes[:max]))
}

func orNotProvided(text string) string {
	if strings.TrimSpace(text) == "" {
		return "non précisé"
	}
	return text
}
