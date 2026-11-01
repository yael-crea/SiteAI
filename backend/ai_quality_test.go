package main

import (
	"strings"
	"testing"
)

func goodContent() AIContent {
	return AIContent{
		MetaTitle:        "Plombier à Montpellier | Atelier du Robinet",
		MetaDescription:  "Dépannage, recherche de fuite et rénovation de salle de bain à Montpellier. Demandez votre devis à l'Atelier du Robinet.",
		HeroEyebrow:      "Plombier à Montpellier",
		HeroTitle:        "Votre salle de bain entre de bonnes mains",
		HeroTitleOptions: []string{"Votre salle de bain entre de bonnes mains", "Une fuite réparée, une maison sereine", "Le plombier de votre quartier à Montpellier"},
		HeroText:         "Dépannage et rénovation à Montpellier.",
		PrimaryCTA:       "Demander un devis",
		SecondaryCTA:     "Voir nos services",
		AboutTitle:       "Un atelier de quartier",
		AboutText:        "Nous intervenons chez les particuliers.",
		Sections: []SiteSection{
			{Title: "Recherche de fuite", Text: "Diagnostic précis."},
			{Title: "Débouchage", Text: "Canalisations dégagées."},
			{Title: "Chauffe-eau", Text: "Remplacement et entretien."},
			{Title: "Salle de bain", Text: "Rénovation complète."},
		},
		Benefits: []SiteBenefit{{Title: "Devis clair", Text: "Avant travaux."}, {Title: "Chantier propre", Text: "Protection des sols."}, {Title: "Explications", Text: "Chaque étape détaillée."}},
		FAQ: []FAQItem{
			{Question: "Intervenez-vous le samedi ?", Answer: "Contactez-nous pour connaître nos disponibilités."},
			{Question: "Faites-vous les devis ?", Answer: "Oui, avant toute intervention."},
			{Question: "Quelle zone couvrez-vous ?", Answer: "Montpellier et ses environs."},
			{Question: "Posez-vous des chauffe-eau ?", Answer: "Oui."},
		},
		ContactTitle: "Parlons de votre projet",
		ContactText:  "Décrivez votre besoin, nous vous rappelons.",
	}
}

func TestContentQualityAcceptsGoodContent(t *testing.T) {
	if issues := contentQualityIssues(goodContent()); len(issues) != 0 {
		t.Fatalf("contenu correct refusé : %v", issues)
	}
}

func TestContentQualityFindsProblems(t *testing.T) {
	cases := []struct {
		name   string
		change func(*AIContent)
		want   string
	}{
		{"point d'exclamation", func(c *AIContent) { c.HeroText = "Appelez-nous !" }, "heroText contient un point d'exclamation"},
		{"emoji", func(c *AIContent) { c.AboutText = "Un atelier 🔧 de quartier." }, "aboutText contient un emoji"},
		{"cliché", func(c *AIContent) { c.ContactText = "Toujours à votre écoute." }, "« à votre écoute »"},
		{"titre trop long", func(c *AIContent) {
			c.HeroTitle = "Le meilleur service de plomberie rapide et efficace pour toute la région de Montpellier"
		}, "heroTitle fait"},
		{"trop peu de services", func(c *AIContent) { c.Sections = c.Sections[:2] }, "2 blocs de services"},
		{"FAQ incomplète", func(c *AIContent) { c.FAQ = c.FAQ[:3] }, "3 questions dans la FAQ"},
		{"service en double", func(c *AIContent) { c.Sections[1].Title = "Recherche de fuite !" }, "apparaît deux fois"},
		{"accroches identiques", func(c *AIContent) {
			c.HeroTitleOptions = []string{c.HeroTitle, c.HeroTitle, "Autre accroche"}
		}, "heroTitleOptions doit contenir 3 accroches différentes"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			content := goodContent()
			tc.change(&content)
			issues := strings.Join(contentQualityIssues(content), "\n")
			if !strings.Contains(issues, tc.want) {
				t.Fatalf("problème attendu « %s », trouvé :\n%s", tc.want, issues)
			}
		})
	}
}

func TestHeroTitleChoices(t *testing.T) {
	got := heroTitleChoices("Accroche A", []string{"accroche a", " Accroche B ", "", "Accroche C", "Accroche D"})
	want := []string{"Accroche A", "Accroche B", "Accroche C"}
	if strings.Join(got, "|") != strings.Join(want, "|") {
		t.Fatalf("accroches %v, attendu %v", got, want)
	}
}

func TestQualityCorrectionPromptListsIssues(t *testing.T) {
	prompt := qualityCorrectionPrompt("BRIEF", `{"heroTitle":"x"}`, []string{"problème 1", "problème 2"})
	for _, part := range []string{"BRIEF", `{"heroTitle":"x"}`, "- problème 1", "- problème 2", "JSON complet corrigé"} {
		if !strings.Contains(prompt, part) {
			t.Fatalf("la demande de correction ne contient pas %q", part)
		}
	}
}

func TestLimitRunesKeepsAccents(t *testing.T) {
	if got := limitRunes("éééé", 2); got != "éé" {
		t.Fatalf("%q", got)
	}
}
