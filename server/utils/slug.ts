/**
 * Generates a URL-safe slug from an event title, plus a short random suffix
 * to avoid collisions between events with the same title.
 */
export function generateEventSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const suffix = Math.random().toString(36).slice(2, 8);

  return base ? `${base}-${suffix}` : suffix;
}
