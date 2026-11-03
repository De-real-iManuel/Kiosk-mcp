import { describe, it, expect } from "vitest";
import { checkPublishReadiness } from "../lib/publishReadiness.js";
import type { Business } from "@workspace/db";

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-001",
    ownerClerkId: "user_123",
    slug: "test-biz",
    businessName: "Test Business",
    description: "A good description",
    services: "",
    audience: "",
    hours: "",
    contact: "",
    price: null,
    booking: null,
    location: "Lagos, Nigeria",
    city: "Lagos",
    country: "Nigeria",
    latitude: null,
    longitude: null,
    phone: "+2348012345678",
    whatsapp: null,
    website: null,
    openingHours: null,
    timezone: "Africa/Lagos",
    categoryId: "cat-uuid-0001-0000-0000-000000000001",
    isActive: true,
    status: "draft",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    publishedAt: null,
    ...overrides,
  };
}

describe("checkPublishReadiness", () => {
  it("returns ready=true when all required fields are present", () => {
    const result = checkPublishReadiness(makeBusiness());
    expect(result.ready).toBe(true);
    expect(result.blocking).toHaveLength(0);
  });

  it("blocks when businessName is missing", () => {
    const result = checkPublishReadiness(makeBusiness({ businessName: "" }));
    expect(result.ready).toBe(false);
    expect(result.blocking).toContain("businessName");
  });

  it("blocks when both location and city/country are missing", () => {
    const result = checkPublishReadiness(
      makeBusiness({ location: "", city: null, country: null }),
    );
    expect(result.ready).toBe(false);
    expect(result.blocking).toContain("location");
  });

  it("passes location check when only city+country are set (no legacy location)", () => {
    const result = checkPublishReadiness(
      makeBusiness({ location: "", city: "Abuja", country: "Nigeria" }),
    );
    expect(result.blocking).not.toContain("location");
  });

  it("passes location check when only location string is set", () => {
    const result = checkPublishReadiness(
      makeBusiness({ location: "Lagos Island", city: null, country: null }),
    );
    expect(result.blocking).not.toContain("location");
  });

  it("blocks when no contact method is present", () => {
    const result = checkPublishReadiness(
      makeBusiness({ phone: null, whatsapp: null, website: null }),
    );
    expect(result.ready).toBe(false);
    expect(result.blocking).toContain("contact");
  });

  it("passes contact check with only website", () => {
    const result = checkPublishReadiness(
      makeBusiness({
        phone: null,
        whatsapp: null,
        website: "https://example.com",
      }),
    );
    expect(result.blocking).not.toContain("contact");
  });

  it("passes contact check with only whatsapp", () => {
    const result = checkPublishReadiness(
      makeBusiness({ phone: null, whatsapp: "2348012345678", website: null }),
    );
    expect(result.blocking).not.toContain("contact");
  });

  it("recommends categoryId when missing but does not block", () => {
    const result = checkPublishReadiness(makeBusiness({ categoryId: null }));
    expect(result.recommended).toContain("categoryId");
    expect(result.blocking).not.toContain("categoryId");
    // Missing categoryId alone should not prevent publishing
    expect(result.ready).toBe(true);
  });

  it("recommends description when missing", () => {
    const result = checkPublishReadiness(makeBusiness({ description: null }));
    expect(result.recommended).toContain("description");
  });

  it("recommends openingHours when missing", () => {
    const result = checkPublishReadiness(makeBusiness({ openingHours: null }));
    expect(result.recommended).toContain("openingHours");
  });

  it("does NOT recommend city when already set — city is now a blocking field", () => {
    // city is blocking (not recommended) — a missing city prevents publishing
    const result = checkPublishReadiness(makeBusiness({ city: null }));
    expect(result.blocking).toContain("city");
    expect(result.recommended).not.toContain("city");
  });

  it("blocks when city is missing", () => {
    const result = checkPublishReadiness(makeBusiness({ city: null }));
    expect(result.ready).toBe(false);
    expect(result.blocking).toContain("city");
  });

  it("blocks when country is missing", () => {
    const result = checkPublishReadiness(makeBusiness({ country: null }));
    expect(result.ready).toBe(false);
    expect(result.blocking).toContain("country");
  });

  it("reports all blocking fields at once", () => {
    const result = checkPublishReadiness(
      makeBusiness({
        businessName: "",
        location: "",
        city: null,
        country: null,
        phone: null,
        whatsapp: null,
        website: null,
        contact: "",
        categoryId: null,
      }),
    );
    expect(result.blocking).toContain("businessName");
    expect(result.blocking).toContain("location");
    expect(result.blocking).toContain("city");
    expect(result.blocking).toContain("country");
    expect(result.blocking).toContain("contact");
    // categoryId is recommended, not blocking
    expect(result.blocking).not.toContain("categoryId");
    expect(result.recommended).toContain("categoryId");
    expect(result.ready).toBe(false);
  });
});
