import { db } from "../index.js";
import { categoriesTable } from "../schema/index.js";

const CATEGORIES = [
  {
    name: "Restaurant",
    slug: "restaurant",
    description:
      "Food and dining establishments including cafes, fast food, fine dining, and takeaways.",
  },
  {
    name: "Salon & Beauty",
    slug: "salon-beauty",
    description:
      "Hair salons, barbershops, nail salons, spas, and beauty service providers.",
  },
  {
    name: "Retail Shop",
    slug: "retail-shop",
    description:
      "General retail stores, boutiques, and shops selling consumer goods.",
  },
  {
    name: "Pharmacy",
    slug: "pharmacy",
    description:
      "Pharmacies, chemists, and health product stores dispensing medications and wellness products.",
  },
  {
    name: "Logistics & Delivery",
    slug: "logistics-delivery",
    description:
      "Courier services, freight companies, last-mile delivery, and logistics providers.",
  },
  {
    name: "Professional Services",
    slug: "professional-services",
    description:
      "Legal, accounting, consulting, HR, and other knowledge-based professional services.",
  },
  {
    name: "Hotel & Hospitality",
    slug: "hotel-hospitality",
    description:
      "Hotels, guesthouses, lodges, event venues, and hospitality businesses.",
  },
  {
    name: "Fitness & Wellness",
    slug: "fitness-wellness",
    description:
      "Gyms, yoga studios, personal trainers, physiotherapy, and wellness centres.",
  },
  {
    name: "Electronics & Repairs",
    slug: "electronics-repairs",
    description:
      "Electronics retailers, phone repair shops, IT support, and gadget servicing.",
  },
  {
    name: "Grocery & Market",
    slug: "grocery-market",
    description:
      "Supermarkets, local markets, fresh produce sellers, and grocery suppliers.",
  },
] as const;

export async function seedCategories(): Promise<void> {
  console.log("Seeding categories...");

  await db
    .insert(categoriesTable)
    .values(CATEGORIES.map((c) => ({ ...c })))
    .onConflictDoNothing({ target: categoriesTable.slug });

  console.log(`✓ Categories seeded (${CATEGORIES.length} rows, idempotent)`);
}
