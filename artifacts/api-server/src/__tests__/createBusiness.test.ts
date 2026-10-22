/**
 * Regression tests for CreateBusinessBodyV2 schema.
 *
 * Critical regression: the form initialises legacy fields (services, audience,
 * hours, contact) to "". Zod's .optional() does NOT skip "" — it still runs
 * .min(1) and fails with a 400. The fix adds .or(z.literal("")) so empty
 * strings are accepted and treated as "not provided".
 *
 * Without the fix, every real business creation from the production form
 * returned 400 and showed the generic error message.
 */
import { describe, it, expect } from "vitest";
import { CreateBusinessBodyV2 } from "@workspace/api-zod";

const minimalValid = {
  businessName: "Mama's Kitchen",
};

const formPayload = {
  businessName: "Mama's Kitchen",
  // Legacy fields — form sends empty strings for all of these
  services: "",
  audience: "",
  hours: "",
  contact: "",
  price: null,
  booking: null,
  // Structured contact fields
  phone: "+2348012345678",
  whatsapp: null,
  website: null,
};

describe("CreateBusinessBodyV2 — schema regression", () => {
  // ── Critical regression: empty legacy strings must not fail .min(1) ────────

  it("accepts empty string for services (form sends empty string on submit)", () => {
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      services: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for audience", () => {
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      audience: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for hours", () => {
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      hours: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for contact", () => {
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      contact: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts the exact payload the production form sends (all empty legacy fields)", () => {
    const result = CreateBusinessBodyV2.safeParse(formPayload);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error(result.error.message);
    expect(result.data.businessName).toBe("Mama's Kitchen");
  });

  // ── Required fields ────────────────────────────────────────────────────────

  it("rejects when businessName is missing entirely", () => {
    const result = CreateBusinessBodyV2.safeParse({ services: "Food" });
    expect(result.success).toBe(false);
  });

  it("rejects empty businessName", () => {
    const result = CreateBusinessBodyV2.safeParse({ businessName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects businessName over 120 characters", () => {
    const result = CreateBusinessBodyV2.safeParse({
      businessName: "a".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  // ── Contact field validation ───────────────────────────────────────────────

  it("rejects a URL in the phone field", () => {
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      phone: "https://example.com",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid international phone number", () => {
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      phone: "+2348012345678",
    });
    expect(result.success).toBe(true);
  });

  it("normalises WhatsApp by stripping non-digit characters via transform", () => {
    // The whatsapp field refine checks digits-only (after space removal).
    // Input must already be digits + optional spaces to pass the refine.
    // The transform then strips any remaining non-digits.
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      whatsapp: "234 801 234 5678", // spaces allowed by refine (stripped in test)
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.whatsapp).toBe("2348012345678");
    }
  });

  it("rejects WhatsApp with non-digit, non-space characters", () => {
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      whatsapp: "not-a-number",
    });
    expect(result.success).toBe(false);
  });

  it("rejects website URL without http/https scheme", () => {
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      website: "mamaskitchen.ng",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid https website URL", () => {
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      website: "https://mamaskitchen.ng",
    });
    expect(result.success).toBe(true);
  });

  // ── Optional structured fields ─────────────────────────────────────────────

  it("accepts only businessName with all other fields absent", () => {
    const result = CreateBusinessBodyV2.safeParse(minimalValid);
    expect(result.success).toBe(true);
  });

  it("accepts a valid capabilities array", () => {
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      capabilities: [
        { capability: "contact", enabled: true },
        { capability: "ordering", enabled: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown capability key", () => {
    const result = CreateBusinessBodyV2.safeParse({
      ...minimalValid,
      capabilities: [{ capability: "unknown_cap", enabled: true }],
    });
    expect(result.success).toBe(false);
  });
});
