package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// Draft columns remain the editable source. Only explicit publication changes this snapshot.
const siteSnapshotSQL = `jsonb_build_object('site', site_data, 'activity', activity, 'city', city, 'designStyle', design_style, 'accentColor', accent_color)`
const savedColumns = `id, business_name, activity, city, phone, design_style, accent_color, site_data,
 published, COALESCE(public_slug,''), published_at, created_at, updated_at, draft_revision, published_revision`
const versionMigrationSQL = `
BEGIN;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS published_snapshot JSONB;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS draft_revision BIGINT NOT NULL DEFAULT 1;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS published_revision BIGINT NOT NULL DEFAULT 0;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sites FROM anon, authenticated;
CREATE TABLE IF NOT EXISTS site_versions (
 id BIGSERIAL PRIMARY KEY,
 site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
 revision BIGINT NOT NULL,
 snapshot JSONB NOT NULL,
 reason TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(site_id, revision)
);
ALTER TABLE site_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON site_versions FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_site_versions_site ON site_versions(site_id, revision DESC);
INSERT INTO site_versions(site_id, revision, snapshot, reason)
 SELECT id, draft_revision, ` + siteSnapshotSQL + `, 'Version initiale' FROM sites
 ON CONFLICT(site_id, revision) DO NOTHING;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notification_status TEXT NOT NULL DEFAULT 'unknown';
UPDATE leads SET notification_status = 'sent' WHERE notification_sent_at IS NOT NULL AND notification_status <> 'sent';
COMMIT;`

var errDraftConflict = errors.New("draft revision conflict")

func scanSavedSite(row pgx.Row) (SavedSite, error) {
	var s SavedSite
	var raw []byte
	err := row.Scan(&s.ID, &s.BusinessName, &s.Activity, &s.City, &s.Phone, &s.DesignStyle, &s.AccentColor, &raw,
		&s.Published, &s.PublicSlug, &s.PublishedAt, &s.CreatedAt, &s.UpdatedAt, &s.DraftRevision, &s.PublishedRevision)
	if err != nil {
		return s, err
	}
	err = json.Unmarshal(raw, &s.Site)
	return s, err
}

func versionError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		http.Error(w, "Site ou version introuvable dans ton compte.", 404)
	case errors.Is(err, errDraftConflict):
		http.Error(w, "Le site a changé depuis son ouverture. Tes modifications restent dans cet éditeur. Conserve une version sur cet appareil, puis rouvre le site pour récupérer le dernier brouillon.", 409)
	default:
		log.Println("Erreur brouillon/version :", err)
		http.Error(w, "L’enregistrement n’a pas pu être confirmé. Tes modifications restent dans l’éditeur. Rouvre le site pour vérifier avant de réessayer.", 500)
	}
}

func recordSiteVersion(ctx context.Context, tx pgx.Tx, id int64, reason string) error {
	_, err := tx.Exec(ctx, `INSERT INTO site_versions(site_id,revision,snapshot,reason)
 SELECT id,draft_revision,`+siteSnapshotSQL+`,$2 FROM sites WHERE id=$1
 ON CONFLICT(site_id,revision) DO NOTHING`, id, reason)
	if err != nil {
		return err
	}
	// Keep 20 visible saves, one restore buffer, and the currently public revision.
	_, err = tx.Exec(ctx, `DELETE FROM site_versions WHERE site_id=$1
 AND id NOT IN (SELECT id FROM site_versions WHERE site_id=$1 ORDER BY revision DESC LIMIT 21)
 AND revision <> (SELECT published_revision FROM sites WHERE id=$1)`, id)
	return err
}

func saveDraft(ctx context.Context, id int64, userID, email string, input SaveSiteInput, reason string) (SavedSite, error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return SavedSite{}, err
	}
	defer tx.Rollback(ctx)
	if id != 0 {
		var revision int64
		if err = tx.QueryRow(ctx, `SELECT draft_revision FROM sites WHERE id=$1 AND user_id=$2::uuid FOR UPDATE`, id, userID).Scan(&revision); err != nil {
			return SavedSite{}, err
		}
		if input.ExpectedRevision == nil || *input.ExpectedRevision != revision {
			return SavedSite{}, errDraftConflict
		}
	}
	input.DesignStyle = normalizeDesignStyle(input.DesignStyle)
	input.AccentColor = normalizeAccentColor(input.AccentColor, "#2563eb")
	normalizeGrowthFields(&input.Site)
	raw, err := json.Marshal(input.Site)
	if err != nil {
		return SavedSite{}, err
	}
	var saved SavedSite
	if id == 0 {
		saved, err = scanSavedSite(tx.QueryRow(ctx, `INSERT INTO sites(user_id,business_name,activity,city,phone,notification_email,design_style,accent_color,site_data)
   VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING `+savedColumns,
			userID, input.Site.BusinessName, input.Activity, input.City, input.Site.Phone, strings.TrimSpace(email), input.DesignStyle, input.AccentColor, raw))
	} else {
		saved, err = scanSavedSite(tx.QueryRow(ctx, `UPDATE sites SET business_name=$1,activity=$2,city=$3,phone=$4,design_style=$5,accent_color=$6,site_data=$7::jsonb,
   updated_at=NOW(),draft_revision=draft_revision+1 WHERE id=$8 AND user_id=$9::uuid RETURNING `+savedColumns,
			input.Site.BusinessName, input.Activity, input.City, input.Site.Phone, input.DesignStyle, input.AccentColor, raw, id, userID))
	}
	if err != nil {
		return SavedSite{}, err
	}
	if err = recordSiteVersion(ctx, tx, saved.ID, reason); err != nil {
		return SavedSite{}, err
	}
	return saved, tx.Commit(ctx)
}

func saveDraftHandler(w http.ResponseWriter, r *http.Request, id int64, userID, email string) {
	var input SaveSiteInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 12<<20)).Decode(&input); err != nil {
		http.Error(w, "Le contenu est trop volumineux ou illisible. Réduis les images puis réessaie.", 400)
		return
	}
	if strings.TrimSpace(input.Site.BusinessName) == "" {
		http.Error(w, "Ajoute le nom de l’entreprise avant d’enregistrer.", 400)
		return
	}
	saved, err := saveDraft(r.Context(), id, userID, email, input, "Brouillon enregistré")
	if err != nil {
		versionError(w, err)
		return
	}
	status := http.StatusOK
	if id == 0 {
		status = http.StatusCreated
	}
	writeJSON(w, status, saved)
}

func publishDraftHandler(w http.ResponseWriter, r *http.Request, id int64, userID string) {
	var input struct {
		ExpectedRevision *int64 `json:"expectedRevision"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&input); err != nil || input.ExpectedRevision == nil {
		versionError(w, errDraftConflict)
		return
	}
	billing, _, _, err := getBillingStatus(r.Context(), userID)
	if err != nil {
		versionError(w, err)
		return
	}
	rights := billingEntitlements(billing)
	if rights.MaxPublishedSites == 0 {
		http.Error(w, "La publication nécessite une formule active. Ton brouillon reste enregistré dans ton compte.", 403)
		return
	}
	tx, err := db.Begin(r.Context())
	if err != nil {
		versionError(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	// Serialize publications by account so concurrent sites cannot exceed the plan limit.
	if _, err = tx.Exec(r.Context(), `SELECT pg_advisory_xact_lock(hashtextextended($1, 1))`, userID); err != nil {
		versionError(w, err)
		return
	}
	saved, err := scanSavedSite(tx.QueryRow(r.Context(), `SELECT `+savedColumns+` FROM sites WHERE id=$1 AND user_id=$2::uuid FOR UPDATE`, id, userID))
	if err != nil {
		versionError(w, err)
		return
	}
	if saved.DraftRevision != *input.ExpectedRevision {
		versionError(w, errDraftConflict)
		return
	}
	if !saved.Published && rights.MaxPublishedSites > 0 {
		var count int
		if err = tx.QueryRow(r.Context(), `SELECT COUNT(*) FROM sites WHERE user_id=$1::uuid AND published=TRUE AND id<>$2`, userID, id).Scan(&count); err != nil {
			versionError(w, err)
			return
		}
		if count >= rights.MaxPublishedSites {
			http.Error(w, publishedSiteLimitMessage(billing.Plan, rights.MaxPublishedSites), 403)
			return
		}
	}
	slug := saved.PublicSlug
	if slug == "" {
		base := slugify(saved.BusinessName)
		if base == "" {
			base = "site"
		}
		slug = fmt.Sprintf("%s-%d", base, id)
	}
	saved, err = scanSavedSite(tx.QueryRow(r.Context(), `UPDATE sites SET published=TRUE,public_slug=$1,published_at=NOW(),
  published_snapshot=`+siteSnapshotSQL+`,published_revision=draft_revision WHERE id=$2 AND user_id=$3::uuid RETURNING `+savedColumns, slug, id, userID))
	if err != nil {
		versionError(w, err)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		versionError(w, err)
		return
	}
	writeJSON(w, 200, saved)
}

type SiteVersion struct {
	ID        int64     `json:"id"`
	Revision  int64     `json:"revision"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"createdAt"`
	Published bool      `json:"published"`
}

func siteVersionsHandler(w http.ResponseWriter, r *http.Request, id int64, userID string) {
	if r.Method != http.MethodGet {
		http.Error(w, "Méthode non autorisée", 405)
		return
	}
	// An empty history must not disguise a different user's site as an accessible resource.
	if _, err := getSavedSiteByID(r.Context(), id, userID); err != nil {
		versionError(w, err)
		return
	}
	rows, err := db.Query(r.Context(), `SELECT v.id,v.revision,v.reason,v.created_at,(s.published AND s.published_revision=v.revision)
 FROM site_versions v JOIN sites s ON s.id=v.site_id WHERE s.id=$1 AND s.user_id=$2::uuid
 AND (v.revision=s.published_revision OR v.id IN (SELECT id FROM site_versions WHERE site_id=$1 ORDER BY revision DESC LIMIT 20))
 ORDER BY v.revision DESC LIMIT 21`, id, userID)
	if err != nil {
		versionError(w, err)
		return
	}
	defer rows.Close()
	list := []SiteVersion{}
	for rows.Next() {
		var v SiteVersion
		if err = rows.Scan(&v.ID, &v.Revision, &v.Reason, &v.CreatedAt, &v.Published); err != nil {
			versionError(w, err)
			return
		}
		list = append(list, v)
	}
	if err = rows.Err(); err != nil {
		versionError(w, err)
		return
	}
	writeJSON(w, 200, list)
}

func restoreSiteVersionHandler(w http.ResponseWriter, r *http.Request, id int64, userID string) {
	if r.Method != http.MethodPost {
		http.Error(w, "Méthode non autorisée", 405)
		return
	}
	var input struct {
		VersionID        int64  `json:"versionId"`
		ExpectedRevision *int64 `json:"expectedRevision"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&input); err != nil || input.VersionID <= 0 {
		http.Error(w, "Choisis une version à restaurer.", 400)
		return
	}
	var raw []byte
	err := db.QueryRow(r.Context(), `SELECT v.snapshot FROM site_versions v JOIN sites s ON s.id=v.site_id
 WHERE v.id=$1 AND s.id=$2 AND s.user_id=$3::uuid`, input.VersionID, id, userID).Scan(&raw)
	if err != nil {
		versionError(w, err)
		return
	}
	var snapshot SaveSiteInput
	if err = json.Unmarshal(raw, &snapshot); err != nil {
		versionError(w, err)
		return
	}
	snapshot.ExpectedRevision = input.ExpectedRevision
	saved, err := saveDraft(r.Context(), id, userID, "", snapshot, "Version restaurée")
	if err != nil {
		versionError(w, err)
		return
	}
	writeJSON(w, 200, saved)
}

func setLeadNotificationStatus(id int64, status string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := db.Exec(ctx, `UPDATE leads SET notification_status=$2 WHERE id=$1`, id, status); err != nil {
		log.Println("Statut notification indisponible :", err)
	}
}
