import { eq, inArray } from "drizzle-orm";
import { db } from "../index.js";
import {
  businessCapabilitiesTable,
  businessEndpointsTable,
  businessProductsTable,
  businessServicesTable,
  businessesTable,
} from "../schema/index.js";

const SEED_OWNER = "seed_demo";

export async function cleanupDemoBusinesses(): Promise<void> {
  console.log("Cleaning up seed_demo businesses...");

  const rows = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.ownerClerkId, SEED_OWNER));

  if (rows.length === 0) {
    console.log("  No seed_demo businesses found — nothing to do.");
    return;
  }

  const ids = rows.map((r) => r.id);

  // Delete child records first (FK constraints), then parent
  await db.delete(businessCapabilitiesTable).where(inArray(businessCapabilitiesTable.businessId, ids));
  await db.delete(businessProductsTable).where(inArray(businessProductsTable.businessId, ids));
  await db.delete(businessServicesTable).where(inArray(businessServicesTable.businessId, ids));
  await db.delete(businessEndpointsTable).where(inArray(businessEndpointsTable.businessId, ids));
  await db.delete(businessesTable).where(inArray(businessesTable.id, ids));

  console.log(`✓ Removed ${ids.length} seed_demo business${ids.length === 1 ? "" : "es"}.`);
}

// Allow running directly: pnpm --filter @workspace/db cleanup-demo
const isMain =
  process.argv[1]?.endsWith("cleanup-demo.ts") ||
  process.argv[1]?.endsWith("cleanup-demo.js");

if (isMain) {
  const { pool } = await import("../index.js");
  cleanupDemoBusinesses()
    .then(() => pool.end())
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
      pool.end();
    });
}
