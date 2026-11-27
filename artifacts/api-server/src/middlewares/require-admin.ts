import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "express";
import { db, adminUsersTable } from "@workspace/db";
import { verifyAdminAccessToken } from "../lib/admin-token.js";

type AdminPermission =
  | "business.read"
  | "business.suspend"
  | "business.publish.override"
  | "verification.decide"
  | "support.manage"
  | "telemetry.read"
  | "incident.manage"
  | "admin.manage";
type AdminRole =
  "super_admin" | "technical_admin" | "support_agent" | "verification_reviewer";
const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: [
    "business.read",
    "business.suspend",
    "business.publish.override",
    "verification.decide",
    "support.manage",
    "telemetry.read",
    "incident.manage",
    "admin.manage",
  ],
  technical_admin: ["business.read", "telemetry.read", "incident.manage"],
  support_agent: ["business.read", "support.manage"],
  verification_reviewer: ["business.read", "verification.decide"],
};

declare global {
  namespace Express {
    interface Locals {
      adminUser?: typeof adminUsersTable.$inferSelect;
      adminPermissions?: readonly AdminPermission[];
    }
  }
}

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!token) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  try {
    const claims = await verifyAdminAccessToken(token);
    const [admin] = await db
      .select()
      .from(adminUsersTable)
      .where(
        and(
          eq(adminUsersTable.identityProvider, claims.iss!),
          eq(adminUsersTable.identitySubject, claims.sub!),
          eq(adminUsersTable.status, "active"),
        ),
      )
      .limit(1);
    if (!admin || !Object.hasOwn(ROLE_PERMISSIONS, admin.role)) {
      res.status(403).json({
        error: "This identity is not provisioned for Kiosk administration",
      });
      return;
    }
    res.locals.adminUser = admin;
    res.locals.adminPermissions = ROLE_PERMISSIONS[admin.role as AdminRole];
    next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid admin credentials";
    // Temporarily surface the real error message to aid debugging
    console.error("[require-admin] token verification failed:", message);
    if (message === "Admin identity provider is not configured") {
      res.status(503).json({ error: "Admin sign-in is not configured" });
      return;
    }
    res.status(401).json({ error: message });
  }
};

export function requireAdminPermission(
  permission: AdminPermission,
): RequestHandler {
  return (_req, res, next) => {
    if (
      !res.locals.adminUser ||
      !res.locals.adminPermissions?.includes(permission)
    ) {
      res.status(403).json({ error: "Insufficient administrative permission" });
      return;
    }
    next();
  };
}

export function getAdminActor(res: import("express").Response) {
  const admin = res.locals.adminUser;
  if (!admin) throw new Error("Admin context is missing");
  return admin;
}
