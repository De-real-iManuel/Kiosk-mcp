import { and, eq } from "drizzle-orm";
import { db, businessesTable } from "@workspace/db";
import type { Business } from "@workspace/db";

export interface OwnershipError extends Error {
  status: number;
}

/**
 * Asserts that the given business exists and is owned by the given ownerId.
 * Throws an error with status 404 if the business is not found or not owned.
 * Returns the full business record on success.
 */
export async function assertOwnership(
  businessId: string,
  ownerId: string,
): Promise<Business> {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, businessId),
        eq(businessesTable.ownerClerkId, ownerId),
      ),
    )
    .limit(1);

  if (!business) {
    const error = new Error("Business not found") as OwnershipError;
    error.status = 404;
    throw error;
  }

  return business;
}
