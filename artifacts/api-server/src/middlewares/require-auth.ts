import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

// Augment Express's Locals interface so res.locals.clerkUserId is typed everywhere
declare global {
  namespace Express {
    interface Locals {
      clerkUserId: string;
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  res.locals.clerkUserId = userId;
  next();
};
