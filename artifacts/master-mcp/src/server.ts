import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDiscoveryTools } from "./tools/discovery.js";
import { registerProfileTools } from "./tools/profile.js";
import { registerUtilityTools } from "./tools/utility.js";
import { instrumentMcpServer } from "@workspace/db";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "kiosk-master-mcp",
    version: "1.0.0",
  });

  instrumentMcpServer(server, "master_mcp");
  registerDiscoveryTools(server);
  registerProfileTools(server);
  registerUtilityTools(server);

  return server;
}
