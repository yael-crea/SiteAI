package main

import (
	"strings"
	"testing"
)

func TestBuildAssistantPromptWithoutSite(t *testing.T) {
	prompt := buildAssistantPrompt(AssistantInput{Message: "Comment publier ?", Page: "dashboard"})
	if !strings.Contains(prompt, "Aucun site n'est ouvert") {
		t.Fatalf("le prompt doit signaler l'absence de site : %q", prompt)
	}
	if !strings.Contains(prompt, "Comment publier ?") {
		t.Fatalf("le message doit être repris : %q", prompt)
	}
}

func TestBuildAssistantPromptKeepsRecentHistory(t *testing.T) {
	history := make([]AssistantMessage, 0, 12)
	for i := 0; i < 12; i++ {
		history = append(history, AssistantMessage{Role: "user", Text: strings.Repeat("x", i+1)})
	}
	site := GeneratedSite{BusinessName: "Nova Plomberie", Sections: []SiteSection{{Title: "Dépannage"}}}
	prompt := buildAssistantPrompt(AssistantInput{Message: "Passe en vert", History: history, Site: &site, City: "Marseille"})
	if strings.Contains(prompt, "Utilisateur : x\n") {
		t.Fatal("les messages les plus anciens doivent être retirés")
	}
	if !strings.Contains(prompt, "Nova Plomberie") || !strings.Contains(prompt, "Dépannage") {
		t.Fatalf("le contexte du site doit être présent : %q", prompt)
	}
}

func TestCleanSuggestions(t *testing.T) {
	got := cleanSuggestions([]string{" ", "Un", "Deux", "Trois", "Quatre"})
	if len(got) != 3 || got[0] != "Un" {
		t.Fatalf("suggestions inattendues : %v", got)
	}
}

func TestAssistantSchemaRequiresFields(t *testing.T) {
	required, _ := assistantDecisionSchema()["required"].([]string)
	if len(required) != 4 {
		t.Fatalf("schéma incomplet : %v", required)
	}
}
