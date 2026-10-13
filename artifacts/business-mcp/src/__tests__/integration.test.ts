/**
 * Integration tests for MCP tool registration, tenant isolation, and get_contact
 * field mapping.
 *
 * Uses InMemoryTransport + Client to create a real connected server/client pair
 * inside each test — no live database, no HTTP.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerBusinessTools } from "../tools/register.js";
import { buildToolList, BASE_TOOLS } from "../tools/index.js";
import type { BusinessSession } from "../businessSession.js";
import type { Business } from "@workspace/db";

// ─── Mock db so tool handlers never hit a real database ───────────────────────
vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          and: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        catch: vi.fn(),
      }),
    }),
  },
  businessServicesTable: {},
  businessProductsTable: {},
  businessCapabilitiesTable: {},
  agentEventsTable: {},
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-001",
    ownerClerkId: "user_clerk_secret",
    slug: "test-biz",
    businessName: "Test Business",
    description: "A test business",
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
    whatsapp: "2348012345678",
    website: "https://testbiz.example",
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
  overrides: Partial<Business> = {},
  capabilityKeys: string[] = [],
): BusinessSession {
  return {
    business: makeBusiness(overrides),
    capabilities: [],
    enabledCapabilityKeys: capabilityKeys,
  };
}

/**
 * Spin up a connected McpServer + Client pair for a given session.
 * The server has tools registered; the client can call them via the protocol.
 */
async function makeConnectedPair(session: BusinessSession): Promise<{
  server: McpServer;
  client: Client;
  cleanup: () => Promise<void>;
}> {
  const server = new McpServer({ name: "test-server", version: "1.0.0" });
  registerBusinessTools(server, session);

  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [serverTransport, clientTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  const cleanup = async () => {
    await client.close();
  };

  return { server, client, cleanup };
}

// ─── tools/list ───────────────────────────────────────────────────────────────

describe("tools/list — tool registration completeness", () => {
  it("exposes all 5 base tools after registerBusinessTools", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession());
    try {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name);
      for (const base of BASE_TOOLS) {
        expect(names).toContain(base);
      }
    } finally {
      await cleanup();
    }
  });

  it("does NOT expose optional tools when no capabilities are enabled", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession({}, []));
    try {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name);
      expect(names).not.toContain("get_products");
      expect(names).not.toContain("create_order_request");
      expect(names).not.toContain("request_booking");
      expect(names).not.toContain("get_delivery_information");
    } finally {
      await cleanup();
    }
  });

  it("exposes get_products when products capability is enabled", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({}, ["products"]),
    );
    try {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain("get_products");
    } finally {
      await cleanup();
    }
  });

  it("total tool count equals base tools only when no capabilities are enabled", async () => {
    const { client, cleanup } = await makeConnectedPair(makeSession({}, []));
    try {
      const { tools } = await client.listTools();
      expect(tools.length).toBe(BASE_TOOLS.length);
    } finally {
      await cleanup();
    }
  });
});

// ─── get_business_info ────────────────────────────────────────────────────────

describe("get_business_info — correct tenant data", () => {
  it("returns the correct business name for this tenant", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({ businessName: "Tenant A Salon" }),
    );
    try {
      const result = await client.callTool({
        name: "get_business_info",
        arguments: {},
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      const data = JSON.parse(text) as Record<string, unknown>;
      expect(data.name).toBe("Tenant A Salon");
    } finally {
      await cleanup();
    }
  });

  it("does NOT expose ownerClerkId in get_business_info response", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({ ownerClerkId: "user_super_secret_id" }),
    );
    try {
      const result = await client.callTool({
        name: "get_business_info",
        arguments: {},
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).not.toContain("user_super_secret_id");
      expect(text).not.toContain("ownerClerkId");
    } finally {
      await cleanup();
    }
  });
});

// ─── get_contact ──────────────────────────────────────────────────────────────

describe("get_contact — field mapping and REGRESSION: website-in-phone bug", () => {
  it("returns phone, whatsapp_url, and website in their correct fields", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({
        phone: "+2348012345678",
        whatsapp: "2348012345678",
        website: "https://mybiz.example.com",
      }),
    );
    try {
      const result = await client.callTool({
        name: "get_contact",
        arguments: {},
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      const data = JSON.parse(text) as Record<string, unknown>;
      expect(data.phone).toBe("+2348012345678");
      expect(data.website).toBe("https://mybiz.example.com");
      expect(typeof data.whatsapp_url).toBe("string");
      expect(data.whatsapp_url as string).toContain("wa.me/2348012345678");
    } finally {
      await cleanup();
    }
  });

  it("REGRESSION: website URL must NOT appear in the phone field", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({
        phone: "+2348099999999",
        website: "https://should-not-be-in-phone.example",
      }),
    );
    try {
      const result = await client.callTool({
        name: "get_contact",
        arguments: {},
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      const data = JSON.parse(text) as Record<string, unknown>;
      // phone field must never contain a URL
      expect(data.phone).not.toMatch(/^https?:\/\//);
      // website belongs in its own field
      expect(data.website).toBe("https://should-not-be-in-phone.example");
    } finally {
      await cleanup();
    }
  });

  it("whatsapp_url is null when whatsapp is null", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({ whatsapp: null }),
    );
    try {
      const result = await client.callTool({
        name: "get_contact",
        arguments: {},
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      const data = JSON.parse(text) as Record<string, unknown>;
      expect(data.whatsapp_url).toBeNull();
    } finally {
      await cleanup();
    }
  });

  it("whatsapp_url is built correctly from digits-only whatsapp value", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({ whatsapp: "2348012345678" }),
    );
    try {
      const result = await client.callTool({
        name: "get_contact",
        arguments: {},
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      const data = JSON.parse(text) as Record<string, unknown>;
      expect(data.whatsapp_url).toBe("https://wa.me/2348012345678");
    } finally {
      await cleanup();
    }
  });

  it("does NOT expose ownerClerkId in get_contact response", async () => {
    const { client, cleanup } = await makeConnectedPair(
      makeSession({ ownerClerkId: "user_private_clerk_id_xyz" }),
    );
    try {
      const result = await client.callTool({
        name: "get_contact",
        arguments: {},
      });
      const text = (result.content as Array<{ type: string; text: string }>)[0]
        .text;
      expect(text).not.toContain("user_private_clerk_id_xyz");
      expect(text).not.toContain("ownerClerkId");
    } finally {
      await cleanup();
    }
  });
});

// ─── Tenant isolation ─────────────────────────────────────────────────────────

describe("tenant isolation — each server returns only its own tenant data", () => {
  it("two independent servers return different business names", async () => {
    const pairA = await makeConnectedPair(
      makeSession({ businessName: "Tenant A Bakery" }),
    );
    const pairB = await makeConnectedPair(
      makeSession({ businessName: "Tenant B Laundry" }),
    );
    try {
      const [resA, resB] = await Promise.all([
        pairA.client.callTool({ name: "get_business_info", arguments: {} }),
        pairB.client.callTool({ name: "get_business_info", arguments: {} }),
      ]);
      const dataA = JSON.parse(
        (resA.content as Array<{ type: string; text: string }>)[0].text,
      ) as { name: string };
      const dataB = JSON.parse(
        (resB.content as Array<{ type: string; text: string }>)[0].text,
      ) as { name: string };
      expect(dataA.name).toBe("Tenant A Bakery");
      expect(dataB.name).toBe("Tenant B Laundry");
      expect(dataA.name).not.toBe(dataB.name);
    } finally {
      await Promise.all([pairA.cleanup(), pairB.cleanup()]);
    }
  });

  it("calling get_contact on server A never returns server B contact data", async () => {
    const pairA = await makeConnectedPair(
      makeSession({
        phone: "+2340000000001",
        website: "https://tenant-a.example",
      }),
    );
    const pairB = await makeConnectedPair(
      makeSession({
        phone: "+2340000000002",
        website: "https://tenant-b.example",
      }),
    );
    try {
      const resA = await pairA.client.callTool({
        name: "get_contact",
        arguments: {},
      });
      const dataA = JSON.parse(
        (resA.content as Array<{ type: string; text: string }>)[0].text,
      ) as { phone: string; website: string };
      expect(dataA.phone).toBe("+2340000000001");
      expect(dataA.website).toBe("https://tenant-a.example");
      // Crucially — tenant B's data must not appear in tenant A's response
      expect(dataA.phone).not.toBe("+2340000000002");
      expect(dataA.website).not.toBe("https://tenant-b.example");
    } finally {
      await Promise.all([pairA.cleanup(), pairB.cleanup()]);
    }
  });

  it("buildToolList is deterministic for the same capability set", () => {
    expect(buildToolList(["products", "booking"]).sort()).toEqual(
      buildToolList(["products", "booking"]).sort(),
    );
  });
});
