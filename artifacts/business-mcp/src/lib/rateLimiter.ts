import type { Request, Response, NextFunction, RequestHandler } from "express";

interface BucketEntry {
  count: number;
  resetAt: number;
}

function createLimiter(options: {
  windowMs: number;
  limit: number;
}): RequestHandler {
  const buckets = new Map<string, BucketEntry>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (now > entry.resetAt) buckets.delete(key);
    }
  }, options.windowMs).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)
        ?.split(",")[0]
        ?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const now = Date.now();
    let entry = buckets.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + options.windowMs };
      buckets.set(ip, entry);
    } else {
      entry.count += 1;
    }

    const remaining = Math.max(0, options.limit - entry.count);
    const resetSecs = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader("RateLimit-Limit", options.limit);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", resetSecs);

    if (entry.count > options.limit) {
      res.setHeader("Retry-After", resetSecs);
      res.status(429).json({ error: "Too many requests. Please slow down." });
      return;
    }

    next();
  };
}

/**
 * Per-IP limit for MCP tool calls: 60 requests/min.
 * Each real agent session typically makes 5–10 tool calls,
 * so this allows ~6 concurrent agent sessions per IP.
 */
export const mcpRateLimiter = createLimiter({
  windowMs: 60_000,
  limit: 60,
});
