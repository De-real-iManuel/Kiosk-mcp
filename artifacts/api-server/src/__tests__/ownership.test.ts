import { describe, it, expect } from "vitest";
import fc from "fast-check";

// Unit-level simulation of the ownership-filtering logic:
// assertOwnership and GET /api/businesses both rely on the same predicate.

interface FakeBusiness {
  id: string;
  ownerClerkId: string;
}

function filterByOwner(
  businesses: FakeBusiness[],
  callerId: string,
): FakeBusiness[] {
  return businesses.filter((b) => b.ownerClerkId === callerId);
}

function findOwned(
  businesses: FakeBusiness[],
  businessId: string,
  callerId: string,
): FakeBusiness | undefined {
  return businesses.find(
    (b) => b.id === businessId && b.ownerClerkId === callerId,
  );
}

describe("Owner Isolation � Property Tests", () => {
  it("Property 3: filterByOwner only returns businesses owned by the caller", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            ownerClerkId: fc.constantFrom("user_a", "user_b", "user_c"),
          }),
          { minLength: 0, maxLength: 50 },
        ),
        fc.constantFrom("user_a", "user_b", "user_c"),
        (businesses, callerId) => {
          const result = filterByOwner(businesses, callerId);
          expect(result.every((b) => b.ownerClerkId === callerId)).toBe(true);
          const expected = businesses.filter(
            (b) => b.ownerClerkId === callerId,
          ).length;
          expect(result.length).toBe(expected);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("findOwned returns undefined for cross-owner access (simulates 404)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            ownerClerkId: fc.constantFrom("user_a", "user_b"),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (businesses) => {
          const userBBusiness = businesses.find(
            (b) => b.ownerClerkId === "user_b",
          );
          if (!userBBusiness) return;
          const result = findOwned(businesses, userBBusiness.id, "user_a");
          expect(result).toBeUndefined();
        },
      ),
    );
  });

  it("findOwned returns the business for the correct owner", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.uuid(), ownerClerkId: fc.constant("user_a") }),
          { minLength: 1, maxLength: 10 },
        ),
        (businesses) => {
          const target = businesses[0]!;
          const result = findOwned(businesses, target.id, "user_a");
          expect(result).toBeDefined();
          expect(result!.id).toBe(target.id);
        },
      ),
    );
  });
});
