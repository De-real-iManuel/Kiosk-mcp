import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateSlug } from "./slug.js";

describe("generateSlug � Property Tests", () => {
  it("Property 4: every non-empty name produces a correctly-formatted slug", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.uuid(), (name, id) => {
        const slug = generateSlug(name, id);
        expect(slug).toMatch(/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/);
      }),
      { numRuns: 1000 },
    );
  });

  it("Property 5: distinct UUIDs always produce distinct slugs regardless of name", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.uuid(),
        fc.uuid(),
        (name, id1, id2) => {
          fc.pre(id1 !== id2);
          expect(generateSlug(name, id1)).not.toBe(generateSlug(name, id2));
        },
      ),
      { numRuns: 500 },
    );
  });

  it('falls back to "business" for all-symbol names', () => {
    const slug = generateSlug("!!!###", "a1b2c3d4-0000-0000-0000-000000000000");
    expect(slug).toBe("business-a1b2c3d40000");
  });

  it("strips diacritics from unicode names", () => {
    const slug = generateSlug(
      "Resume Cafe",
      "a1b2c3d4-0000-0000-0000-000000000000",
    );
    expect(slug).toMatch(/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/);
  });

  it("handles apostrophes in names like Mama's Kitchen", () => {
    const slug = generateSlug(
      "Mama's Kitchen",
      "a1b2c3d4-0000-0000-0000-000000000000",
    );
    expect(slug).toBe("mama-s-kitchen-a1b2c3d40000");
  });
});
