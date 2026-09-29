// Stable key order avoids false changes after server JSON serialization.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
export function sameContent(current: unknown, saved: unknown): boolean {
  return (
    JSON.stringify(canonical(current)) === JSON.stringify(canonical(saved))
  );
}
