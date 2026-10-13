import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createBusinessMcpServer(businessName: string): McpServer {
  return new McpServer({
    name: `kiosk-business-${businessName}`,
    version: "1.0.0",
  });
}
