import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

/**
 * Central Express error-handling middleware.
 * MUST be the last middleware registered in app.ts.
 *
 * Handles:
 *  - ZodError          → 400 with flattened field errors
 *  - Errors with .status (e.g. ownership errors) → that status code
 *  - Postgres / database errors  → 503
 *  - Everything else             → 500
 *
 * Never exposes stack traces in the response body.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Always log the full error server-side
  logger.error({ err }, "Unhandled error");

  // ── Zod validation errors ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // ── Errors with an explicit HTTP status (e.g. ownership / not-found) ────
  if (isStatusError(err)) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // ── Postgres / database errors ───────────────────────────────────────────
  if (isDatabaseError(err)) {
    res.status(503).json({ error: "Service temporarily unavailable" });
    return;
  }

  // ── Catch-all ────────────────────────────────────────────────────────────
  res.status(500).json({ error: "Internal server error" });
};

// ─── Type guards ──────────────────────────────────────────────────────────────

interface StatusError extends Error {
  status: number;
}

function isStatusError(err: unknown): err is StatusError {
  return (
    err instanceof Error &&
    "status" in err &&
    typeof (err as StatusError).status === "number"
  );
}

/**
 * Detects errors originating from the `pg` (node-postgres) driver.
 * These errors have a `code` property that is a 5-character SQLSTATE string
 * (e.g. "23505" for unique-violation, "08006" for connection failure).
 */
function isDatabaseError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const e = err as unknown as Record<string, unknown>;
  // node-postgres DatabaseError always has a string `code`
  return (
    typeof e["code"] === "string" && /^[0-9A-Z]{5}$/.test(e["code"] as string)
  );
}
