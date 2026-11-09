import { createPublicKey, verify as verifySignature, type JsonWebKey } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "express";
import { db, adminUsersTable } from "@workspace/db";

type AdminPermission = "business.read" | "business.suspend" | "business.publish.override" | "verification.decide" | "support.manage" | "telemetry.read" | "incident.manage" | "admin.manage";
type AdminRole = "super_admin" | "technical_admin" | "support_agent" | "verification_reviewer";
const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: ["business.read", "business.suspend", "business.publish.override", "verification.decide", "support.manage", "telemetry.read", "incident.manage", "admin.manage"],
  technical_admin: ["business.read", "telemetry.read", "incident.manage"],
  support_agent: ["business.read", "support.manage"],
  verification_reviewer: ["business.read", "verification.decide"],
};
interface JwtClaims { iss?: string; sub?: string; exp?: number; token_use?: string; client_id?: string }
interface JwkSet { keys: Array<JsonWebKey & { kid?: string; use?: string }> }
let cachedKeys: JwkSet | undefined;
let keysFetchedAt = 0;
function decodePart<T>(part: string): T { return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T; }

async function getSigningKey(kid: string, issuer: string, forceRefresh = false): Promise<ReturnType<typeof createPublicKey>> {
  if (forceRefresh || !cachedKeys || Date.now() - keysFetchedAt > 60 * 60 * 1000) {
    const response = await fetch(`${issuer.replace(/\/$/, "")}/.well-known/jwks.json`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Unable to load admin identity signing keys");
    cachedKeys = (await response.json()) as JwkSet;
    keysFetchedAt = Date.now();
  }
  const jwk = cachedKeys.keys.find((key) => key.kid === kid && key.use !== "enc");
  if (!jwk) {
    if (!forceRefresh) return getSigningKey(kid, issuer, true);
    throw new Error("Signing key ID was not found in the identity provider key set");
  }
  return createPublicKey({ key: jwk, format: "jwk" });
}

async function verifyAdminAccessToken(token: string): Promise<JwtClaims> {
  const issuer = process.env.ADMIN_OIDC_ISSUER;
  const audience = process.env.ADMIN_OIDC_AUDIENCE;
  if (!issuer || !audience) throw new Error("Admin identity provider is not configured");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed access token");
  const header = decodePart<{ alg?: string; kid?: string }>(parts[0]!);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported access token");
  const claims = decodePart<JwtClaims>(parts[1]!);
  if (claims.iss !== issuer || claims.token_use !== "access") throw new Error("Invalid access token issuer or type");
  if (!claims.sub || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) throw new Error("Expired or incomplete access token");
  if (claims.client_id !== audience) throw new Error("Access token was issued to another client");
  const key = await getSigningKey(header.kid, issuer);
  const valid = verifySignature("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2]!, "base64url"));
  if (!valid) throw new Error("Invalid access token signature");
  return claims;
}

declare global {
  namespace Express {
    interface Locals { adminUser?: typeof adminUsersTable.$inferSelect; adminPermissions?: readonly AdminPermission[] }
  }
}

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) { res.status(401).json({ error: "Admin authentication required" }); return; }
  try {
    const claims = await verifyAdminAccessToken(token);
    const [admin] = await db.select().from(adminUsersTable).where(and(
      eq(adminUsersTable.identityProvider, claims.iss!),
      eq(adminUsersTable.identitySubject, claims.sub!),
      eq(adminUsersTable.status, "active"),
    )).limit(1);
    if (!admin || !Object.hasOwn(ROLE_PERMISSIONS, admin.role)) {
      res.status(403).json({ error: "This identity is not provisioned for Kiosk administration" }); return;
    }
    res.locals.adminUser = admin;
    res.locals.adminPermissions = ROLE_PERMISSIONS[admin.role as AdminRole];
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid admin credentials";
    if (message === "Admin identity provider is not configured") { res.status(503).json({ error: "Admin sign-in is not configured" }); return; }
    res.status(401).json({ error: "Invalid or expired admin credentials" });
  }
};

export function requireAdminPermission(permission: AdminPermission): RequestHandler {
  return (_req, res, next) => {
    if (!res.locals.adminUser || !res.locals.adminPermissions?.includes(permission)) {
      res.status(403).json({ error: "Insufficient administrative permission" }); return;
    }
    next();
  };
}
export function getAdminActor(res: import("express").Response) {
  const admin = res.locals.adminUser;
  if (!admin) throw new Error("Admin context is missing");
  return admin;
}
