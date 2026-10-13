import { startServer } from "./app.js";

const port = Number(process.env.PORT ?? 5001);

startServer(port).catch((err) => {
  console.error("Failed to start kiosk-business-mcp", err);
  process.exit(1);
});
