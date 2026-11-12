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

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // basePath and static export are only needed for the CloudFront deployment.
  // In local dev Next.js serves from / on port 3001 and handles the OAuth
  // callback at /?code=... without needing a basePath.
  ...(isDev
    ? {}
    : {
        output: "export",
        basePath: "/internal-admin",
        trailingSlash: true,
      }),
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