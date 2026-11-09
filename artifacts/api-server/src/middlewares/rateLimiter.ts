import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Minimal in-process token-bucket rate limiter.
 * Drop-in replacement for express-rate-limit that requires no external package.
 *
 * Replace with express-rate-limit in production for Redis-backed distributed limiting.
 */

interface BucketEntry {
  count: number;
  resetAt: number;
}

function createLimiter(options: {
  windowMs: number;
  limit: number;
  message: object;
}): RequestHandler {
  const buckets = new Map<string, BucketEntry>();

  // Prune stale buckets every window to avoid unbounded memory growth
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (now > entry.resetAt) buckets.delete(key);
    }
  }, options.windowMs).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // req.ip uses Express's explicitly configured one-hop ALB trust. Never
    // parse X-Forwarded-For directly: its left-most value may be client-spoofed.
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    // Bound memory even if an attacker rotates source addresses faster than
    // expired buckets are pruned.
    if (!buckets.has(ip) && buckets.size >= 10_000) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }

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
      res.status(429).json(options.message);
      return;
    }

    next();
  };
}

/**
 * Public marketplace endpoints — 120 requests/min per IP.
 */
export const marketplaceLimiter = createLimiter({
  windowMs: 60_000,
  limit: 120,
  message: { error: "Too many requests. Please slow down." },
});

/**
 * Authenticated write endpoints — 30 requests/min per IP.
 * Tighter because these mutate state.
 */
export const writeLimiter = createLimiter({
  windowMs: 60_000,
  limit: 30,
  message: { error: "Too many requests. Please slow down." },
});
