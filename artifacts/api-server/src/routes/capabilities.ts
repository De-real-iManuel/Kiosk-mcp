import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, businessCapabilitiesTable } from "@workspace/db";
import {
  CapabilityParams,
  UpsertCapabilityBody,
  BusinessIdParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { assertOwnership } from "../lib/ownership";

const router = Router();
router.use(requireAuth);

// GET /businesses/:id/capabilities
router.get("/businesses/:id/capabilities", async (req, res): Promise<void> => {
  const params = BusinessIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await assertOwnership(params.data.id, res.locals.clerkUserId);
  const caps = await db
    .select()
    .from(businessCapabilitiesTable)
    .where(eq(businessCapabilitiesTable.businessId, params.data.id));
  res.json(caps);
});

// PUT /businesses/:id/capabilities/:capability
router.put(
  "/businesses/:id/capabilities/:capability",
  async (req, res): Promise<void> => {
    const params = CapabilityParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UpsertCapabilityBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    await assertOwnership(params.data.id, res.locals.clerkUserId);
    const [row] = await db
      .insert(businessCapabilitiesTable)
      .values({
        businessId: params.data.id,
        capability: params.data.capability,
        enabled: body.data.enabled,
        configuration: body.data.configuration,
      })
      .onConflictDoUpdate({
        target: [
          businessCapabilitiesTable.businessId,
          businessCapabilitiesTable.capability,
        ],
        set: {
          enabled: body.data.enabled,
          configuration: body.data.configuration,
        },
      })
      .returning();
    res.json(row);
  },
);

// DELETE /businesses/:id/capabilities/:capability  (soft-disable)
router.delete(
  "/businesses/:id/capabilities/:capability",
  async (req, res): Promise<void> => {
    const params = CapabilityParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    await assertOwnership(params.data.id, res.locals.clerkUserId);
    const [row] = await db
      .update(businessCapabilitiesTable)
      .set({ enabled: false })
      .where(
        and(
          eq(businessCapabilitiesTable.businessId, params.data.id),
          eq(businessCapabilitiesTable.capability, params.data.capability),
        ),
      )
      .returning();
    res.json(row ?? { capability: params.data.capability, enabled: false });
  },
);

export default router;
