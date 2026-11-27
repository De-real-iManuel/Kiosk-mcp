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
 *   - city (structured — required for AI discovery country filtering)
 *   - country (structured — required for AI discovery country filtering)
 *   - at least one contact method: phone, whatsapp, website, or legacy contact
 *
 * Recommended (soft — shown as hints in the dashboard):
 *   - categoryId
 *   - description
 *   - openingHours
 */
export function checkPublishReadiness(business: Business): ReadinessResult {
  const blocking: string[] = [];
  const recommended: string[] = [];

  if (!business.businessName?.trim()) {
    blocking.push("businessName");
  }

  // Require either the legacy freetext location OR the structured city/country pair.
  const hasLocation =
    business.location?.trim() ||
    (business.city?.trim() && business.country?.trim());
  if (!hasLocation) {
    blocking.push("location");
  }

  // city and country are individually required for correct AI discovery.
  // An agent calling search_businesses with country="NG" will miss this business
  // if its country column is null.
  if (!business.city?.trim()) {
    blocking.push("city");
  }
  if (!business.country?.trim()) {
    blocking.push("country");
  }

  const hasContact =
    business.phone?.trim() ||
    business.whatsapp?.trim() ||
    business.website?.trim() ||
    business.contact?.trim();
  if (!hasContact) {
    blocking.push("contact");
  }

  // Recommended (improves discoverability but not required to publish)
  if (!business.categoryId) {
    recommended.push("categoryId");
  }
  if (!business.description?.trim()) {
    recommended.push("description");
  }
  if (!business.openingHours) {
    recommended.push("openingHours");
  }

  return {
    ready: blocking.length === 0,
    blocking,
    recommended,
  };
}
