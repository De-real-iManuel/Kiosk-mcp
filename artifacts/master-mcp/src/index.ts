import { startServer } from "./app.js";

startServer(Number(process.env["MCP_PORT"] ?? process.env["PORT"] ?? 5000)).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
