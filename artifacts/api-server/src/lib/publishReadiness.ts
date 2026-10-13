import type { Business } from "@workspace/db";

export interface ReadinessResult {
  ready: boolean;
  /** Fields that must be filled before publishing */
  blocking: string[];
  /** Fields that improve the MCP profile but are not required */
  recommended: string[];
}

/**
 * Checks whether a business profile has the minimum required fields to publish.
 *
 * Blocking (hard requirements):
 *   - businessName
 *   - location OR (city AND country)
 *   - at least one contact method: phone, whatsapp, or website
 *   - categoryId
 *
 * Recommended (soft — shown as hints in the dashboard):
 *   - description
 *   - openingHours
 *   - city / country (if not already blocking)
 */
export function checkPublishReadiness(business: Business): ReadinessResult {
  const blocking: string[] = [];
  const recommended: string[] = [];

  if (!business.businessName?.trim()) {
    blocking.push("businessName");
  }

  const hasLocation =
    business.location?.trim() ||
    (business.city?.trim() && business.country?.trim());
  if (!hasLocation) {
    blocking.push("location");
  }

  const hasContact =
    business.phone?.trim() ||
    business.whatsapp?.trim() ||
    business.website?.trim();
  if (!hasContact) {
    blocking.push("contact");
  }

  if (!business.categoryId) {
    blocking.push("categoryId");
  }

  // Recommended fields
  if (!business.description?.trim()) {
    recommended.push("description");
  }
  if (!business.openingHours) {
    recommended.push("openingHours");
  }
  if (!business.city?.trim()) {
    recommended.push("city");
  }

  return {
    ready: blocking.length === 0,
    blocking,
    recommended,
  };
}
