package main

import "testing"

func TestSelectOpenAIModelRoutesByTask(t *testing.T) {
	t.Setenv("OPENAI_MODEL", "")
	t.Setenv("OPENAI_GENERATION_MODEL", "")
	t.Setenv("OPENAI_MODIFICATION_MODEL", "")

	if got := selectOpenAIModel("siteai_generated_site_v3"); got != "gpt-6.1-sol" {
		t.Fatalf("generation model = %q, want gpt-6.1-sol", got)
	}

	if got := selectOpenAIModel("siteai_modified_site_v3"); got != "gpt-6-luna" {
		t.Fatalf("modification model = %q, want gpt-6-luna", got)
	}
}

func TestSelectOpenAIModelSupportsOverrides(t *testing.T) {
	t.Setenv("OPENAI_MODEL", "shared-model")
	t.Setenv("OPENAI_GENERATION_MODEL", "generation-model")
	t.Setenv("OPENAI_MODIFICATION_MODEL", "modification-model")

	if got := selectOpenAIModel("siteai_generated_site_v3"); got != "generation-model" {
		t.Fatalf("generation override = %q, want generation-model", got)
	}

	if got := selectOpenAIModel("siteai_modified_site_v3"); got != "modification-model" {
		t.Fatalf("modification override = %q, want modification-model", got)
	}
}

func TestGeneratedSchemasEnforceContentCounts(t *testing.T) {
	sections := sectionsSchema()
	if sections["minItems"] != 4 || sections["maxItems"] != 6 {
		t.Fatalf("sections bounds = %v..%v, want 4..6", sections["minItems"], sections["maxItems"])
	}

	benefits := benefitsSchema()
	if benefits["minItems"] != 3 || benefits["maxItems"] != 3 {
		t.Fatalf("benefits bounds = %v..%v, want 3..3", benefits["minItems"], benefits["maxItems"])
	}

	faq := faqSchema()
	if faq["minItems"] != 4 || faq["maxItems"] != 4 {
		t.Fatalf("faq bounds = %v..%v, want 4..4", faq["minItems"], faq["maxItems"])
	}
}

func TestCalculateOpenAICostSupportsCurrentModels(t *testing.T) {
	tests := []struct {
		model string
		want  float64
	}{
		{model: "gpt-6-luna", want: 0.0006},
		{model: "gpt-6.1-sol-2026-10-01", want: 0.012},
	}

	for _, test := range tests {
		cost, ok := calculateOpenAICostUSD(test.model, 1000, 0, 0, 1000)
		if !ok || cost != test.want {
			t.Fatalf("cost for %s = %v, %v; want %v, true", test.model, cost, ok, test.want)
		}
	}
}

