package main

import (
	"encoding/json"
	"testing"
)

func TestSiteLegalSurvivesSave(t *testing.T) {
	input := `{"businessName":"Atelier","legal":{"companyName":"Atelier du Robinet SARL","address":"12 rue des Lilas, 34000 Montpellier","siren":"123 456 789","email":"contact@atelier.fr"}}`
	var site GeneratedSite
	if err := json.Unmarshal([]byte(input), &site); err != nil {
		t.Fatal(err)
	}
	if site.Legal == nil || site.Legal.Siren != "123 456 789" || site.Legal.Address == "" {
		t.Fatalf("mentions légales perdues : %+v", site.Legal)
	}

	var old GeneratedSite
	if err := json.Unmarshal([]byte(`{"businessName":"Ancien site"}`), &old); err != nil {
		t.Fatal(err)
	}
	output, err := json.Marshal(old)
	if err != nil {
		t.Fatal(err)
	}
	if string(output) == "" || json.Valid(output) == false {
		t.Fatal("JSON invalide")
	}
	var reread map[string]any
	_ = json.Unmarshal(output, &reread)
	if _, present := reread["legal"]; present {
		t.Fatal("un site sans mentions ne doit pas recevoir de champ legal vide")
	}
}
