/**
 * E2E Agent Flow Test
 * Tests the complete AI agent discovery journey:
 *   Master MCP ? discover ? search ? endpoint ? Business MCP ? capabilities ? order
 *
 * Prerequisites: api-server (4000), master-mcp (5000), business-mcp (5001) all running
 * with seed data loaded (pnpm --filter @workspace/db seed)
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MASTER_MCP_URL = process.env["MASTER_MCP_URL"] ?? "http://localhost:5000/mcp";
const BUSINESS_MCP_BASE = process.env["BUSINESS_MCP_BASE"] ?? "http://localhost:5001";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function parseToolResult(result: unknown): unknown {
  const r = result as { content: Array<{ type: string; text: string }> };
  return JSON.parse(r.content[0].text);
}

async function main(): Promise<void> {
  console.log("=== Kiosk E2E Agent Flow Test ===\n");

  // -- Step 1: Connect to Master MCP -----------------------------------------
  console.log("[1] Connecting to Master MCP at", MASTER_MCP_URL);
  const masterClient = new Client({ name: "kiosk-e2e-test", version: "1.0.0" });
  const masterTransport = new StreamableHTTPClientTransport(new URL(MASTER_MCP_URL));
  await masterClient.connect(masterTransport);
  console.log("    ? Connected");

  // -- Step 2: Discover categories --------------------------------------------
  console.log("[2] discover_categories");
  const catResult = await masterClient.callTool({ name: "discover_categories", arguments: {} });
  const categories = parseToolResult(catResult) as Array<{ name: string; slug: string }>;
  assert(Array.isArray(categories) && categories.length >= 1, "discover_categories must return at least 1 category");
  console.log(`    ? ${categories.length} categories: ${categories.map((c) => c.name).join(", ")}`);

  // -- Step 3: Search for jollof rice -----------------------------------------
  console.log("[3] search_businesses { query: 'jollof rice', city: 'Port Harcourt' }");
  const searchResult = await masterClient.callTool({
    name: "search_businesses",
    arguments: {
      query: "jollof rice",
      city: "Port Harcourt",
      limit: 10,
    },
  });
  const businesses = parseToolResult(searchResult) as Array<{
    slug: string;
    name: string;
    mcpEndpoint: string;
    capabilities: string[];
  }>;
  assert(Array.isArray(businesses) && businesses.length >= 1, "search_businesses must return at least 1 result");
  const mamasFound = businesses.find((b) => b.name.toLowerCase().includes("mama"));
  assert(!!mamasFound, "Mama's Kitchen must appear in jollof rice search");
  const mamas = mamasFound!;
  console.log(`    ? Found: ${mamas.name} (slug: ${mamas.slug})`);
  console.log(`    ? MCP endpoint: ${mamas.mcpEndpoint}`);

  // -- Step 4: Get business endpoint ------------------------------------------
  console.log(`[4] get_business_endpoint { slug: '${mamas.slug}' }`);
  const endpointResult = await masterClient.callTool({
    name: "get_business_endpoint",
    arguments: { slug: mamas.slug },
  });
  const endpoint = parseToolResult(endpointResult) as { endpoint_url: string; transport: string };
  assert(typeof endpoint.endpoint_url === "string", "endpoint_url must be a string");
  assert(endpoint.transport === "streamable-http", "transport must be streamable-http");
  console.log(`    ? endpoint_url: ${endpoint.endpoint_url}`);

  // -- Step 5: Check business status ------------------------------------------
  console.log("[5] check_business_status");
  const statusResult = await masterClient.callTool({
    name: "check_business_status",
    arguments: { slug: mamas.slug, iso_time: new Date().toISOString() },
  });
  const status = parseToolResult(statusResult) as { is_open: boolean };
  console.log(`    ? is_open: ${status.is_open}`);

  // -- Step 6: Connect to Business MCP ---------------------------------------
  const businessMcpUrl = endpoint.endpoint_url.replace(
    "https://mcp.kiosk.example",
    BUSINESS_MCP_BASE,
  );
  console.log(`[6] Connecting to Business MCP at ${businessMcpUrl}`);
  const businessClient = new Client({ name: "kiosk-e2e-business", version: "1.0.0" });
  const businessTransport = new StreamableHTTPClientTransport(new URL(businessMcpUrl));
  await businessClient.connect(businessTransport);
  console.log("    ? Connected");

  // -- Step 7: Get capabilities -----------------------------------------------
  console.log("[7] get_capabilities");
  const capsResult = await businessClient.callTool({ name: "get_capabilities", arguments: {} });
  const capsData = parseToolResult(capsResult) as { capabilities: string[] };
  assert(Array.isArray(capsData.capabilities), "capabilities must be an array");
  assert(capsData.capabilities.includes("ordering"), "ordering capability must be enabled");
  assert(capsData.capabilities.includes("delivery"), "delivery capability must be enabled");
  console.log(`    ? capabilities: ${capsData.capabilities.join(", ")}`);

  // -- Step 8: Get products ---------------------------------------------------
  console.log("[8] get_products");
  const prodsResult = await businessClient.callTool({ name: "get_products", arguments: {} });
  const products = parseToolResult(prodsResult) as Array<{ name: string; price: string }>;
  assert(Array.isArray(products) && products.length >= 1, "get_products must return at least 1 product");
  console.log(`    ? ${products.length} products: ${products.map((p) => p.name).join(", ")}`);

  // -- Step 9: Create order request -------------------------------------------
  console.log("[9] create_order_request");
  const orderResult = await businessClient.callTool({
    name: "create_order_request",
    arguments: {
      items: [{ product_name: "Jollof Rice", quantity: 2 }],
      contact_name: "Test Agent",
      contact_phone: "+2348000000000",
    },
  });
  const order = parseToolResult(orderResult) as { order_ref: string; whatsapp_url: string };
  assert(typeof order.order_ref === "string" && order.order_ref.startsWith("ORD-"), "order_ref must start with ORD-");
  assert(typeof order.whatsapp_url === "string" && order.whatsapp_url.startsWith("https://wa.me/"), "whatsapp_url must be a wa.me link");
  console.log(`    ? order_ref: ${order.order_ref}`);
  console.log(`    ? whatsapp_url: ${order.whatsapp_url}`);

  // -- Done -------------------------------------------------------------------
  await masterClient.close();
  await businessClient.close();

  console.log("\n? Full E2E agent flow passed");
}

main().catch((err) => {
  console.error("\nE2E test failed:", err);
  process.exit(1);
});