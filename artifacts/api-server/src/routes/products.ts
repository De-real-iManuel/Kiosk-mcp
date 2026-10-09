import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, businessProductsTable } from "@workspace/db";
import { ProductParams, BusinessIdParams, ProductInputSchema } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { assertOwnership } from "../lib/ownership";

const router: IRouter = Router();
router.use(requireAuth);

// GET /businesses/:id/products
router.get("/businesses/:id/products", async (req, res): Promise<void> => {
  const params = BusinessIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await assertOwnership(params.data.id, res.locals.clerkUserId);
  const products = await db
    .select()
    .from(businessProductsTable)
    .where(eq(businessProductsTable.businessId, params.data.id))
    .orderBy(asc(businessProductsTable.createdAt));
  res.json(products);
});

// POST /businesses/:id/products
router.post("/businesses/:id/products", async (req, res): Promise<void> => {
  const params = BusinessIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = ProductInputSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await assertOwnership(params.data.id, res.locals.clerkUserId);
  const [product] = await db
    .insert(businessProductsTable)
    .values({ businessId: params.data.id, ...body.data, available: body.data.available ?? true })
    .returning();
  res.status(201).json(product);
});

// PATCH /businesses/:id/products/:productId
router.patch("/businesses/:id/products/:productId", async (req, res): Promise<void> => {
  const params = ProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = ProductInputSchema.partial().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await assertOwnership(params.data.id, res.locals.clerkUserId);
  const [product] = await db
    .update(businessProductsTable)
    .set(body.data)
    .where(
      and(
        eq(businessProductsTable.id, params.data.productId),
        eq(businessProductsTable.businessId, params.data.id),
      ),
    )
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

// DELETE /businesses/:id/products/:productId
router.delete("/businesses/:id/products/:productId", async (req, res): Promise<void> => {
  const params = ProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await assertOwnership(params.data.id, res.locals.clerkUserId);
  const [deleted] = await db
    .delete(businessProductsTable)
    .where(
      and(
        eq(businessProductsTable.id, params.data.productId),
        eq(businessProductsTable.businessId, params.data.id),
      ),
    )
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.status(204).send();
});

export default router;
