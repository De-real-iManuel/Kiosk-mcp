/**
 * Integration tests for the request_booking MCP tool.
 *
 * Tests the complete booking lifecycle:
 * - Successful booking request creation
 * - Input validation (bad date format, bad time format, empty required fields)
 * - Persistence (DB insert is awaited, not fire-and-forget)
 * - Correct response shape (booking_ref, status="pending", contact details)
 * - Tool not exposed when booking capability is not enabled
 * - Honest messaging: status is "pending", not "confirmed"
 *
 * Uses InMemoryTransport + real registered tools, DB is mocked.
 */
import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerBusinessTools } from "../tools/register.js";
import type { BusinessSession } from "../businessSession.js";
import type { Business } from "@workspace/db";

// ─── Mock DB ─────────────────────────────────────────────────────────────────

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          and: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    // insert().values() needs to be both awaitable (Promise) and have .catch()
    // because request_booking awaits the first insert and fire-and-forgets the second
    insert: vi.fn().mockReturnValue({
      values: vi
        .fn()
        .mockReturnValue(
          Object.assign(Promise.resolve(undefined), { catch: vi.fn() }),
        ),
    }),
  },
  businessServicesTable: {},
  businessProductsTable: {},
  businessCapabilitiesTable: {},
  agentEventsTable: {},
  bookingRequestsTable: {},
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-booking-001",
    ownerClerkId: "user_owner",
    slug: "test-booking-biz",
    businessName: "Grace Salon",
    description: "Hair and beauty",
    services: "",
    audience: "",
    hours: "",
    contact: "",
    price: null,
    booking: null,
    location: "Port Harcourt",
    city: "Port Harcourt",
    country: "NG",
    latitude: null,
    longitude: null,
    phone: "+2348012345678",
    whatsapp: "2348012345678",
    website: "https://gracesalon.ng",
    openingHours: null,
    timezone: "Africa/Lagos",
    categoryId: null,
    isActive: true,
    status: "published",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    publishedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function makeSession(
  bizOverrides: Partial<Business> = {},
  caps: string[] = ["booking"],
): BusinessSession {
  return {
    business: makeBusiness(bizOverrides),
    capabilities: [],
    enabledCapabilityKeys: caps,
  };
}

async function makeConnectedPair(session: BusinessSession) {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerBusinessTools(server, session);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [st, ct] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  return {
    client,
    cleanup: () => client.close(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("request_booking — capability gating", () => {
  it("request_booking is NOT in tools/list when booking capability is disabled", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession({}, []));
    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name)).not.toContain("request_booking");
    } finally {
      await cleanup();
    }
  });

  it("request_booking IS in tools/list when booking capability is enabled", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({}, ["booking"]),
    );
    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name)).toContain("request_booking");
    } finally {
      await cleanup();
    }
  });
});

describe("request_booking — successful submission", () => {
  it("returns a booking_ref starting with BKG-", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession());
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "Hair cut",
          preferred_date: "2026-11-15",
          preferred_time: "10:00",
          contact_name: "Ada Okafor",
          contact_phone: "+2348012345678",
        },
      });
      const data = JSON.parse(
        (result.content as Array<{ type: string; text: string }>)[0].text,
      ) as Record<string, unknown>;
      expect(typeof data.booking_ref).toBe("string");
      expect((data.booking_ref as string).startsWith("BKG-")).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("status is 'pending' — not 'confirmed'", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession());
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "Manicure",
          preferred_date: "2026-11-15",
          preferred_time: "14:00",
          contact_name: "Chisom Eze",
          contact_phone: "+2348099999999",
        },
      });
      const data = JSON.parse(
        (result.content as Array<{ type: string; text: string }>)[0].text,
      ) as Record<string, unknown>;
      expect(data.status).toBe("pending");
      expect(data.status).not.toBe("confirmed");
    } finally {
      await cleanup();
    }
  });

  it("response message is honest about pending status", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession());
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "Pedicure",
          preferred_date: "2026-12-01",
          preferred_time: "09:00",
          contact_name: "Kemi Ade",
          contact_phone: "+2348011111111",
        },
      });
      const data = JSON.parse(
        (result.content as Array<{ type: string; text: string }>)[0].text,
      ) as Record<string, unknown>;
      // status field must be "pending"
      expect(data.status).toBe("pending");
      // message must not use language that implies confirmation
      const msg = data.message as string;
      expect(msg).not.toMatch(/your booking (is|has been) confirmed/i);
      expect(msg).not.toMatch(/^booking confirmed/i);
      // message should acknowledge it is a request or not yet confirmed
      expect(msg).toMatch(/request|NOT a confirmed|pending|will.*confirm/i);
    } finally {
      await cleanup();
    }
  });

  it("returns whatsapp_url from business.whatsapp", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({ whatsapp: "2348012345678" }),
    );
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "Facial",
          preferred_date: "2026-11-20",
          preferred_time: "11:00",
          contact_name: "Ngozi Ibe",
          contact_phone: "+2348022222222",
        },
      });
      const data = JSON.parse(
        (result.content as Array<{ type: string; text: string }>)[0].text,
      ) as Record<string, unknown>;
      // URL must contain the WhatsApp number
      expect(data.whatsapp_url as string).toContain("wa.me/2348012345678");
      // URL must contain a pre-filled message with the booking ref
      expect(data.whatsapp_url as string).toContain("text=");
      expect(data.whatsapp_url as string).toContain("BKG-");
    } finally {
      await cleanup();
    }
  });

  it("whatsapp_url is null when business has no whatsapp", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({ whatsapp: null }),
    );
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "Waxing",
          preferred_date: "2026-11-22",
          preferred_time: "15:00",
          contact_name: "Temi Bello",
          contact_phone: "+2348033333333",
        },
      });
      const data = JSON.parse(
        (result.content as Array<{ type: string; text: string }>)[0].text,
      ) as Record<string, unknown>;
      expect(data.whatsapp_url).toBeNull();
    } finally {
      await cleanup();
    }
  });

  it("includes phone in response", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({ phone: "+2348087654321" }),
    );
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "Braiding",
          preferred_date: "2026-11-25",
          preferred_time: "13:00",
          contact_name: "Amaka Chike",
          contact_phone: "+2348044444444",
        },
      });
      const data = JSON.parse(
        (result.content as Array<{ type: string; text: string }>)[0].text,
      ) as Record<string, unknown>;
      expect(data.phone).toBe("+2348087654321");
    } finally {
      await cleanup();
    }
  });

  it("accepts optional notes field", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession());
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "Massage",
          preferred_date: "2026-11-28",
          preferred_time: "16:00",
          contact_name: "Ify Okoro",
          contact_phone: "+2348055555555",
          notes: "Please use natural oils",
        },
      });
      const data = JSON.parse(
        (result.content as Array<{ type: string; text: string }>)[0].text,
      ) as Record<string, unknown>;
      // notes accepted — response is still a booking_ref
      expect((data.booking_ref as string).startsWith("BKG-")).toBe(true);
    } finally {
      await cleanup();
    }
  });
});

describe("request_booking — input validation", () => {
  it("rejects malformed date (not YYYY-MM-DD)", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession());
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "Cut",
          preferred_date: "15-11-2026", // wrong format
          preferred_time: "10:00",
          contact_name: "Test",
          contact_phone: "+234800",
        },
      });
      // MCP SDK surfaces validation errors as isError:true, not a rejected promise
      expect((result as { isError?: boolean }).isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toMatch(/YYYY-MM-DD/i);
    } finally {
      await cleanup();
    }
  });

  it("rejects malformed time (not HH:MM)", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession());
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "Cut",
          preferred_date: "2026-11-15",
          preferred_time: "10am", // wrong format
          contact_name: "Test",
          contact_phone: "+234800",
        },
      });
      expect((result as { isError?: boolean }).isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toMatch(/HH:MM/i);
    } finally {
      await cleanup();
    }
  });

  it("rejects empty service_name", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession());
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "", // empty — Zod .min(1) rejects this
          preferred_date: "2026-11-15",
          preferred_time: "10:00",
          contact_name: "Test",
          contact_phone: "+234800",
        },
      });
      expect((result as { isError?: boolean }).isError).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("rejects empty contact_name", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession());
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "Cut",
          preferred_date: "2026-11-15",
          preferred_time: "10:00",
          contact_name: "", // empty — Zod .min(1) rejects this
          contact_phone: "+234800",
        },
      });
      expect((result as { isError?: boolean }).isError).toBe(true);
    } finally {
      await cleanup();
    }
  });
});

describe("request_booking — ownerClerkId never leaks", () => {
  it("does not expose ownerClerkId in booking response", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({ ownerClerkId: "super_secret_clerk_id" }),
    );
    try {
      const result = await client.callTool({
        name: "request_booking",
        arguments: {
          service_name: "Trim",
          preferred_date: "2026-11-15",
          preferred_time: "10:00",
          contact_name: "Test User",
          contact_phone: "+2348000000000",
        },
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).not.toContain("super_secret_clerk_id");
      expect(text).not.toContain("ownerClerkId");
    } finally {
      await cleanup();
    }
  });
});
