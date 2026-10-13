/**
 * Generates a URL-safe slug from a business name and a unique ID.
 *
 * Algorithm:
 * 1. NFKD unicode normalisation
 * 2. Strip combining diacritics (U+0300–U+036F)
 * 3. Lowercase
 * 4. Replace runs of non-alphanumeric characters with a single dash
 * 5. Trim leading/trailing dashes
 * 6. Truncate base to max 48 characters
 * 7. Fallback to 'business' if base is empty after processing
 * 8. Append `-${suffix}` where suffix is the first 12 hex chars of the UUID
 *    (hyphens stripped) — long enough to be collision-resistant even when two
 *    UUIDs share the same first 8 characters.
 *
 * Final result matches: ^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$
 *
 * @example
 * generateSlug("Mama's Kitchen", "a1b2c3d4-e5f6-...") // "mama-s-kitchen-a1b2c3d4e5f6"
 * generateSlug("Résumé Café", "x9y8z7w6-...")          // "resume-cafe-x9y8z7w60000"
 * generateSlug("!!!###", "a1b2c3d4-...")               // "business-a1b2c3d4e5f6"
 */
export function generateSlug(businessName: string, id: string): string {
  const base = businessName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  // Use 12 hex chars from the UUID (hyphens stripped) for a collision-resistant suffix.
  // id.slice(0,8) alone collides when two UUIDs share the same first segment.
  const suffix = id.replace(/-/g, "").slice(0, 12);

  return (base || "business") + `-${suffix}`;
}
