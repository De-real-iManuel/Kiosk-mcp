import { describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
const { requireAdmin, requireAdminPermission } =
  await import("../middlewares/require-admin.js");

function response() {
  const res = {
    locals: {} as Record<string, unknown>,
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json: vi.fn(function (this: { statusCode: number }, _body: unknown) {
      return this;
    }),
  };
  return res;
}

describe("internal admin authorization middleware", () => {
  it("rejects requests without an admin bearer token", async () => {
    const res = response();
    const next = vi.fn();
    await requireAdmin({ headers: {} } as never, res as never, next);
    expect(res.statusCode).toBe(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Admin authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("denies a permission when no provisioned admin context exists", () => {
    const res = response();
    const next = vi.fn();
    requireAdminPermission("telemetry.read")({} as never, res as never, next);
    expect(res.statusCode).toBe(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Insufficient administrative permission",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows a permission only when the server-resolved role includes it", () => {
    const res = response();
    res.locals.adminUser = { id: "admin-1" };
    res.locals.adminPermissions = ["telemetry.read", "incident.manage"];
    const next = vi.fn();
    requireAdminPermission("telemetry.read")({} as never, res as never, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("does not let a different role inherit a permission from the frontend", () => {
    const res = response();
    res.locals.adminUser = { id: "admin-2", role: "support_agent" };
    res.locals.adminPermissions = ["business.read", "support.manage"];
    const next = vi.fn();
    requireAdminPermission("admin.manage")({} as never, res as never, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
