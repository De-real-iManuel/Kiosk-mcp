import { and, eq } from "drizzle-orm";
import { db, businessesTable, businessCapabilitiesTable } from "@workspace/db";
import type { Business, BusinessCapability } from "@workspace/db";

export interface BusinessSession {
  business: Business;
  capabilities: BusinessCapability[];
  enabledCapabilityKeys: string[];
}

export async function resolveBusinessSession(
  slug: string,
): Promise<BusinessSession> {
  if (!slug)
    throw Object.assign(new Error("Business not found"), { status: 404 });

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.slug, slug),
        eq(businessesTable.status, "published"),
        eq(businessesTable.isActive, true),
      ),
    )
    .limit(1);

  if (!business)
    throw Object.assign(new Error("Business not found"), { status: 404 });

  const capabilities = await db
    .select()
    .from(businessCapabilitiesTable)
    .where(
      and(
        eq(businessCapabilitiesTable.businessId, business.id),
        eq(businessCapabilitiesTable.enabled, true),
      ),
    );

  const session: BusinessSession = {
    business,
    capabilities,
    enabledCapabilityKeys: capabilities.map((c) => c.capability),
  };
  // Resolve current publication and capability state on every request. A
  // cached snapshot could keep a suspended business or revoked capability
  // reachable for the cache TTL after an admin/owner change.
  return session;
}
