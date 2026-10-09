import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import { ListCategoriesResponse } from "@workspace/api-zod";
import { db, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      description: categoriesTable.description,
    })
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.name));

  res.json(ListCategoriesResponse.parse(categories));
});

export default router;
