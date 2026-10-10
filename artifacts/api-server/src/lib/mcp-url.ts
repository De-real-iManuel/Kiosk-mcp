/**
 * Returns the canonical MCP endpoint URL for a business slug.
 *
 * Reads MCP_BASE_URL from the environment; falls back to http://localhost:5001
 * so that local development works without any extra .env configuration.
 *
 * In production, set:  MCP_BASE_URL=https://mcp.kiosk.example
 * In local dev, leave unset or set: MCP_BASE_URL=http://localhost:5001
 */
export function getMcpEndpoint(slug: string): string {
  const base = (process.env.MCP_BASE_URL ?? 'http://localhost:5001').replace(/\/$/, '');
  return `${base}/mcp/business/${slug}`;
}
