import type { Request, Response, NextFunction, RequestHandler } from "express";

interface BucketEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const REQUEST_LIMIT = 120;
const MAX_BUCKETS = 10_000;
const buckets = new Map<string, BucketEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}, WINDOW_MS).unref();

/**
 * Public discovery MCP endpoint protection. This in-memory limit is per
 * process; use an edge/WAF or shared store before horizontally scaling.
 */
export const mcpRateLimiter: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // req.ip is resolved through the single trusted ALB hop configured in app.ts.
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let entry = buckets.get(ip);

  if (!entry || now > entry.resetAt) {
    if (!buckets.has(ip) && buckets.size >= MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }
    entry = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(ip, entry);
  } else {
    entry.count += 1;
  }

  const remaining = Math.max(0, REQUEST_LIMIT - entry.count);
  const resetSecs = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  res.setHeader("RateLimit-Limit", REQUEST_LIMIT);
  res.setHeader("RateLimit-Remaining", remaining);
  res.setHeader("RateLimit-Reset", resetSecs);

  if (entry.count > REQUEST_LIMIT) {
    res.setHeader("Retry-After", resetSecs);
    res.status(429).json({ error: "Too many requests. Please slow down." });
    return;
  }

  next();
};
