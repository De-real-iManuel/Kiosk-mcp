import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, businessServicesTable } from "@workspace/db";
import {
  ServiceParams,
  BusinessIdParams,
  ServiceInputSchema,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { assertOwnership } from "../lib/ownership";

const router: IRouter = Router();
router.use(requireAuth);

// GET /businesses/:id/services
router.get("/businesses/:id/services", async (req, res): Promise<void> => {
  const params = BusinessIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    await assertOwnership(params.data.id, res.locals.clerkUserId);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    res.status(status).json({ error: (err as Error).message });
    return;
  }

  const services = await db
    .select()
    .from(businessServicesTable)
    .where(eq(businessServicesTable.businessId, params.data.id))
    .orderBy(asc(businessServicesTable.createdAt));

  res.json(services);
});

// POST /businesses/:id/services
router.post("/businesses/:id/services", async (req, res): Promise<void> => {
  const params = BusinessIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    await assertOwnership(params.data.id, res.locals.clerkUserId);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    res.status(status).json({ error: (err as Error).message });
    return;
  }

  const body = ServiceInputSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [service] = await db
    .insert(businessServicesTable)
    .values({
      businessId: params.data.id,
      name: body.data.name,
      description: body.data.description ?? null,
      price: body.data.price ?? null,
      available: body.data.available,
    })
    .returning();

  res.status(201).json(service);
});

// PATCH /businesses/:id/services/:serviceId
router.patch(
  "/businesses/:id/services/:serviceId",
  async (req, res): Promise<void> => {
    const params = ServiceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    try {
      await assertOwnership(params.data.id, res.locals.clerkUserId);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status ?? 500;
      res.status(status).json({ error: (err as Error).message });
      return;
    }

    const body = ServiceInputSchema.partial().safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [service] = await db
      .update(businessServicesTable)
      .set(body.data)
      .where(
        and(
          eq(businessServicesTable.id, params.data.serviceId),
          eq(businessServicesTable.businessId, params.data.id),
        ),
      )
      .returning();

    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    res.json(service);
  },
);

// DELETE /businesses/:id/services/:serviceId
router.delete(
  "/businesses/:id/services/:serviceId",
  async (req, res): Promise<void> => {
    const params = ServiceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    try {
      await assertOwnership(params.data.id, res.locals.clerkUserId);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status ?? 500;
      res.status(status).json({ error: (err as Error).message });
      return;
    }

    const [deleted] = await db
      .delete(businessServicesTable)
      .where(
        and(
          eq(businessServicesTable.id, params.data.serviceId),
          eq(businessServicesTable.businessId, params.data.id),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    res.status(204).send();
  },
);

export default router;
