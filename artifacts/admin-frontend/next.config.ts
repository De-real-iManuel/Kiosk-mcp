import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadRootEnv(): Record<string, string> {
  const vars: Record<string, string> = {};
  try {
    const envPath = resolve(import.meta.dirname, "../../.env");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      vars[key] = val;
    }
  } catch {
    // Root .env not present (e.g. CI) — fall back to process.env
  }
  return vars;
}

const rootEnv = loadRootEnv();

function pick(key: string): string {
  return rootEnv[key] ?? process.env[key] ?? "";
}

const nextConfig: NextConfig = {
  // basePath is always /internal-admin — both dev and production.
  // This matches the Cognito callback URI and the CloudFront path.
  // output: "export" is only applied in production builds; the dev server
  // cannot run as a static export.
  basePath: "/internal-admin",
  trailingSlash: true,
  ...(process.env.NODE_ENV !== "development" ? { output: "export" } : {}),
  images: { unoptimized: true },
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_ADMIN_OIDC_DOMAIN:       pick("NEXT_PUBLIC_ADMIN_OIDC_DOMAIN"),
    NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID:    pick("NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID"),
    NEXT_PUBLIC_ADMIN_OIDC_REDIRECT_URI: pick("NEXT_PUBLIC_ADMIN_OIDC_REDIRECT_URI"),
    NEXT_PUBLIC_API_URL:                 pick("NEXT_PUBLIC_API_URL"),
  },
};

export default nextConfig;