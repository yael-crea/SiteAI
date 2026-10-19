"use client";
import type { ChangeEvent } from "react";
import type { GeneratedSite } from "@/lib/builderTypes";

type Props = {
  site: GeneratedSite;
  logoUploading: boolean;
  logoError: string;
  handleLogoUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  removeLogo: () => void;
  heroImageUploading: boolean;
  heroImageError: string;
  handleHeroImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  removeHeroImage: () => void;
  MAX_GALLERY_IMAGES: number;
  galleryUploading: boolean;
  galleryRemovingIndex: number | null;
  galleryError: string;
  moveGalleryImage: (index: number, direction: "left" | "right") => void;
  removeGalleryImage: (index: number) => void;
  handleGalleryUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function ContentMediaPanel({
  site,
  logoUploading,
  logoError,
  handleLogoUpload,
  removeLogo,
  heroImageUploading,
  heroImageError,
  handleHeroImageUpload,
  removeHeroImage,
  MAX_GALLERY_IMAGES,
  galleryUploading,
  galleryRemovingIndex,
  galleryError,
  moveGalleryImage,
  removeGalleryImage,
  handleGalleryUpload,
}: Props) {
  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-white">
            {site.logoUrl ? (
              <img
                src={site.logoUrl}
                alt={`Logo ${site.businessName}`}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="px-2 text-center text-xs text-slate-500">
                Aucun logo
              </span>
            )}
          </div>

          <div className="flex-1">
            <p className="font-bold">Logo de l&apos;entreprise</p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              JPG, PNG, WebP ou AVIF • 5 Mo maximum.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <label
                data-builder-edit="logoUrl"
                tabIndex={-1}
                className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500"
              >
                {logoUploading
                  ? "Envoi..."
                  : site.logoUrl
                    ? "Remplacer le logo"
                    : "Ajouter un logo"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={logoUploading}
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>

              {site.logoUrl && (
                <button
                  type="button"
                  onClick={removeLogo}
                  disabled={logoUploading}
                  className="rounded-lg border border-red-900 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950 disabled:opacity-50"
                >
                  Retirer le logo
                </button>
              )}
            </div>

            {logoError && (
              <p className="mt-3 text-sm text-red-400">{logoError}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4">
        <p className="font-bold">Image de couverture</p>

        <p className="mt-1 text-xs leading-5 text-slate-400">
          Grande photo affichée derrière le titre principal du site.
        </p>

        {site.heroImageUrl && (
          <img
            src={site.heroImageUrl}
            alt="Image de couverture"
            className="mt-3 h-40 w-full rounded-xl object-cover"
          />
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <label
            data-builder-edit="heroImageUrl"
            tabIndex={-1}
            className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500"
          >
            {heroImageUploading
              ? "Envoi..."
              : site.heroImageUrl
                ? "Remplacer l'image"
                : "Ajouter une image"}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={heroImageUploading}
              onChange={handleHeroImageUpload}
              className="hidden"
            />
          </label>

          {site.heroImageUrl && (
            <button
              type="button"
              onClick={removeHeroImage}
              disabled={heroImageUploading}
              className="rounded-lg border border-red-900 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950 disabled:opacity-50"
            >
              Retirer l&apos;image
            </button>
          )}
        </div>

        {heroImageError && (
          <p className="mt-3 text-sm text-red-400">{heroImageError}</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-bold">Galerie photos</p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Ajoute jusqu&apos;à {MAX_GALLERY_IMAGES} photos. Tu peux ensuite
              changer leur ordre.
            </p>
          </div>

          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
            {(site.gallery ?? []).length}/{MAX_GALLERY_IMAGES}
          </span>
        </div>

        {(site.gallery ?? []).length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(site.gallery ?? []).map((imageUrl, index) => (
              <div
                key={`${imageUrl}-${index}`}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
              >
                <img
                  src={imageUrl}
                  alt={`Photo ${index + 1} de ${site.businessName}`}
                  className="h-32 w-full object-cover"
                />

                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={index === 0 || galleryUploading}
                      onClick={() => moveGalleryImage(index, "left")}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs disabled:opacity-30"
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      disabled={
                        index === (site.gallery ?? []).length - 1 ||
                        galleryUploading
                      }
                      onClick={() => moveGalleryImage(index, "right")}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={
                      galleryRemovingIndex === index || galleryUploading
                    }
                    onClick={() => removeGalleryImage(index)}
                    className="rounded-lg border border-red-900 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950 disabled:opacity-40"
                  >
                    {galleryRemovingIndex === index
                      ? "Suppression..."
                      : "Supprimer"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <label
            data-builder-edit="gallery"
            tabIndex={-1}
            className={`inline-block rounded-lg px-3 py-2 text-xs font-bold ${
              galleryUploading ||
              (site.gallery ?? []).length >= MAX_GALLERY_IMAGES
                ? "cursor-not-allowed bg-slate-700 text-slate-400"
                : "cursor-pointer bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {galleryUploading ? "Envoi des photos..." : "Ajouter des photos"}

            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={
                galleryUploading ||
                (site.gallery ?? []).length >= MAX_GALLERY_IMAGES
              }
              onChange={handleGalleryUpload}
              className="hidden"
            />
          </label>
        </div>

        {galleryError && (
          <p className="mt-3 text-sm text-red-400">{galleryError}</p>
        )}
      </div>
    </>
  );
}


