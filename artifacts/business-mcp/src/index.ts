import { startServer } from "./app.js";

const port = Number(process.env.BUSINESS_MCP_PORT ?? process.env.MCP_PORT ?? 5001);

startServer(port).catch((err) => {
  console.error("Failed to start kiosk-business-mcp", err);
  process.exit(1);
});
