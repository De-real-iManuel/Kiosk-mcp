import { describe, expect, it } from "vitest";
import { keywordFallbackRank } from "../lib/bedrock.js";

const businesses = [
  {
    name: "Emperor's Digital",
    description: null,
    city: "Port Harcourt",
    location: null,
  },
  {
    name: "Grace Handmade Shoes",
    description: "Handcrafted leather shoes and sandals",
    city: "Port Harcourt",
    location: "Rivers State",
  },
  {
    name: "Glow & Grace Salon",
    description: "Hair styling and beauty services",
    city: "Port Harcourt",
    location: null,
  },
];

describe("keywordFallbackRank", () => {
  it("ranks matching businesses first and excludes unrelated profiles", () => {
    const results = keywordFallbackRank("handmade shoes", businesses);

    expect(results.map((business) => business.name)).toEqual([
      "Grace Handmade Shoes",
    ]);
  });

  it("returns no results when no meaningful query words match", () => {
    expect(keywordFallbackRank("find me a place", businesses)).toEqual([]);
  });

  it("matches service descriptions when a product name is not present", () => {
    const results = keywordFallbackRank("hair styling", businesses);

    expect(results.map((business) => business.name)).toEqual([
      "Glow & Grace Salon",
    ]);
  });
});
