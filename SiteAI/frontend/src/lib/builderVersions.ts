export type BuilderVersion<T> = { id: string; label: string; savedAt: string; value: T };
export const VERSION_LIMIT = 8;

export function readVersions<T>(raw: string | null, validate: (value: unknown) => value is T): BuilderVersion<T>[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Historique illisible");
  return parsed.filter((item): item is BuilderVersion<T> => Boolean(
    item && typeof item === "object" && typeof item.id === "string" &&
    typeof item.label === "string" && typeof item.savedAt === "string" &&
    Number.isFinite(Date.parse(item.savedAt)) && validate(item.value),
  )).slice(0, VERSION_LIMIT);
}

export function addVersion<T>(versions: BuilderVersion<T>[], version: BuilderVersion<T>): BuilderVersion<T>[] {
  if (versions[0] && JSON.stringify(versions[0].value) === JSON.stringify(version.value)) return versions;
  return [version, ...versions].slice(0, VERSION_LIMIT);
}
