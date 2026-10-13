import { and, eq } from "drizzle-orm";
import { db, businessesTable, businessCapabilitiesTable } from "@workspace/db";
import type { Business, BusinessCapability } from "@workspace/db";

export interface BusinessSession {
  business: Business;
  capabilities: BusinessCapability[];
  enabledCapabilityKeys: string[];
}

interface CacheEntry {
  session: BusinessSession;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(slug: string): BusinessSession | null {
  const entry = cache.get(slug);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(slug);
    return null;
  }
  return entry.session;
}

function setCached(slug: string, session: BusinessSession): void {
  cache.set(slug, { session, expiresAt: Date.now() + 30_000 });
}

export async function resolveBusinessSession(
  slug: string,
): Promise<BusinessSession> {
  if (!slug)
    throw Object.assign(new Error("Business not found"), { status: 404 });

  const cached = getCached(slug);
  if (cached) return cached;

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
  setCached(slug, session);
  return session;
}
