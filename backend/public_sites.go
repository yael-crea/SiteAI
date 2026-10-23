package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var errPublishedSnapshotUnavailable = errors.New("published snapshot unavailable")

const publicSiteBySlugQuery = `
SELECT published_snapshot, public_slug, published_at
FROM sites
WHERE public_slug = $1
  AND published = TRUE;
`

const publicSiteByDomainQuery = `
SELECT published_snapshot, public_slug, published_at
FROM sites
WHERE LOWER(custom_domain) = LOWER($1)
  AND published = TRUE
  AND custom_domain_verified = TRUE
LIMIT 1;
`

// PublicSiteSection intentionally omits SourceIndex, which is only useful to
// the editor and the AI modification flow.
type PublicSiteSection struct {
	Title     string `json:"title"`
	Text      string `json:"text"`
	IconMode  string `json:"iconMode"`
	Icon      string `json:"icon"`
	ImageMode string `json:"imageMode"`
	ImageURL  string `json:"imageUrl"`
	Hidden    bool   `json:"hidden"`
}

type PublicTestimonial struct {
	Name   string  `json:"name"`
	Role   string  `json:"role,omitempty"`
	Text   string  `json:"text"`
	Rating float64 `json:"rating,omitempty"`
}

type PublicSocialLinks struct {
	Instagram string `json:"instagram,omitempty"`
	Facebook  string `json:"facebook,omitempty"`
	TikTok    string `json:"tiktok,omitempty"`
	LinkedIn  string `json:"linkedin,omitempty"`
	YouTube   string `json:"youtube,omitempty"`
	WhatsApp  string `json:"whatsapp,omitempty"`
}

// PublicGeneratedSite is an allowlist. Fields used only to manage a client or
// edit a draft must never be added here unless they are intentionally public.
type PublicGeneratedSite struct {
	SiteGoal        string              `json:"siteGoal,omitempty"`
	BookingURL      string              `json:"bookingUrl,omitempty"`
	BusinessName    string              `json:"businessName"`
	Slug            string              `json:"slug"`
	MetaTitle       string              `json:"metaTitle"`
	MetaDescription string              `json:"metaDescription"`
	HeroEyebrow     string              `json:"heroEyebrow"`
	HeroTitle       string              `json:"heroTitle"`
	HeroText        string              `json:"heroText"`
	PrimaryCTA      string              `json:"primaryCta"`
	SecondaryCTA    string              `json:"secondaryCta"`
	Phone           string              `json:"phone"`
	LogoURL         string              `json:"logoUrl"`
	HeroImageURL    string              `json:"heroImageUrl"`
	Gallery         []string            `json:"gallery"`
	AboutTitle      string              `json:"aboutTitle"`
	AboutText       string              `json:"aboutText"`
	Sections        []PublicSiteSection `json:"sections"`
	Benefits        []SiteBenefit       `json:"benefits"`
	FAQ             []FAQItem           `json:"faq"`
	ContactTitle    string              `json:"contactTitle"`
	ContactText     string              `json:"contactText"`
	LayoutOrder     []string            `json:"layoutOrder"`
	HiddenBlocks    []string            `json:"hiddenBlocks"`
	DesignSettings  DesignSettings      `json:"designSettings"`
	Testimonials    []PublicTestimonial `json:"testimonials"`
	ServiceArea     string              `json:"serviceArea"`
	OpeningHours    string              `json:"openingHours"`
	SocialLinks     PublicSocialLinks   `json:"socialLinks,omitempty"`
}

type publishedSiteSnapshot struct {
	Site        *GeneratedSite `json:"site"`
	Activity    string         `json:"activity"`
	City        string         `json:"city"`
	DesignStyle string         `json:"designStyle"`
	AccentColor string         `json:"accentColor"`
}

func publicRating(value any) float64 {
	switch rating := value.(type) {
	case float64:
		return rating
	case float32:
		return float64(rating)
	case int:
		return float64(rating)
	case int64:
		return float64(rating)
	case json.Number:
		parsed, _ := rating.Float64()
		return parsed
	default:
		return 0
	}
}

func toPublicGeneratedSite(site GeneratedSite) PublicGeneratedSite {
	sections := make([]PublicSiteSection, 0, len(site.Sections))
	for _, section := range site.Sections {
		sections = append(sections, PublicSiteSection{
			Title:     section.Title,
			Text:      section.Text,
			IconMode:  section.IconMode,
			Icon:      section.Icon,
			ImageMode: section.ImageMode,
			ImageURL:  section.ImageURL,
			Hidden:    section.Hidden,
		})
	}

	testimonials := make([]PublicTestimonial, 0, len(site.Testimonials))
	for _, item := range site.Testimonials {
		name, _ := item["name"].(string)
		role, _ := item["role"].(string)
		text, _ := item["text"].(string)
		testimonials = append(testimonials, PublicTestimonial{
			Name:   name,
			Role:   role,
			Text:   text,
			Rating: publicRating(item["rating"]),
		})
	}

	return PublicGeneratedSite{
		SiteGoal:        site.SiteGoal,
		BookingURL:      site.BookingURL,
		BusinessName:    site.BusinessName,
		Slug:            site.Slug,
		MetaTitle:       site.MetaTitle,
		MetaDescription: site.MetaDescription,
		HeroEyebrow:     site.HeroEyebrow,
		HeroTitle:       site.HeroTitle,
		HeroText:        site.HeroText,
		PrimaryCTA:      site.PrimaryCTA,
		SecondaryCTA:    site.SecondaryCTA,
		Phone:           site.Phone,
		LogoURL:         site.LogoURL,
		HeroImageURL:    site.HeroImageURL,
		Gallery:         site.Gallery,
		AboutTitle:      site.AboutTitle,
		AboutText:       site.AboutText,
		Sections:        sections,
		Benefits:        site.Benefits,
		FAQ:             site.FAQ,
		ContactTitle:    site.ContactTitle,
		ContactText:     site.ContactText,
		LayoutOrder:     site.LayoutOrder,
		HiddenBlocks:    site.HiddenBlocks,
		DesignSettings:  site.DesignSettings,
		Testimonials:    testimonials,
		ServiceArea:     site.ServiceArea,
		OpeningHours:    site.OpeningHours,
		SocialLinks: PublicSocialLinks{
			Instagram: site.SocialLinks["instagram"],
			Facebook:  site.SocialLinks["facebook"],
			TikTok:    site.SocialLinks["tiktok"],
			LinkedIn:  site.SocialLinks["linkedin"],
			YouTube:   site.SocialLinks["youtube"],
			WhatsApp:  site.SocialLinks["whatsapp"],
		},
	}
}

func decodePublishedSite(raw []byte, publicSlug string, publishedAt *time.Time) (PublicSite, error) {
	if len(raw) == 0 || strings.TrimSpace(string(raw)) == "null" {
		return PublicSite{}, errPublishedSnapshotUnavailable
	}

	var snapshot publishedSiteSnapshot
	if err := json.Unmarshal(raw, &snapshot); err != nil {
		return PublicSite{}, fmt.Errorf("decode published snapshot: %w", err)
	}
	if snapshot.Site == nil {
		return PublicSite{}, errPublishedSnapshotUnavailable
	}

	publicContent := toPublicGeneratedSite(*snapshot.Site)
	return PublicSite{
		BusinessName: snapshot.Site.BusinessName,
		Activity:     snapshot.Activity,
		City:         snapshot.City,
		Phone:        snapshot.Site.Phone,
		DesignStyle:  snapshot.DesignStyle,
		AccentColor:  snapshot.AccentColor,
		Site:         publicContent,
		PublicSlug:   publicSlug,
		PublishedAt:  publishedAt,
	}, nil
}

func loadPublicSiteBySlug(ctx context.Context, slug string) (PublicSite, error) {
	var raw []byte
	var publicSlug string
	var publishedAt *time.Time
	if err := db.QueryRow(ctx, publicSiteBySlugQuery, slug).Scan(&raw, &publicSlug, &publishedAt); err != nil {
		return PublicSite{}, err
	}
	return decodePublishedSite(raw, publicSlug, publishedAt)
}

func loadPublicSiteByDomain(ctx context.Context, domain string) (PublicSite, error) {
	var raw []byte
	var publicSlug string
	var publishedAt *time.Time
	if err := db.QueryRow(ctx, publicSiteByDomainQuery, domain).Scan(&raw, &publicSlug, &publishedAt); err != nil {
		return PublicSite{}, err
	}
	return decodePublishedSite(raw, publicSlug, publishedAt)
}
