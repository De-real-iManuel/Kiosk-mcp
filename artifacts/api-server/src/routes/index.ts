import { Router, type IRouter } from "express";
import businessesRouter from "./businesses";
import capabilitiesRouter from "./capabilities";
import categoriesRouter from "./categories";
import healthRouter from "./health";
import marketplaceRouter from "./marketplace";
import servicesRouter from "./services";
import adminRouter from "./admin";

const router: IRouter = Router();

// Admin router must be registered first with an explicit path prefix so its
// routes are matched before the catch-all Clerk-auth routers below run their
// router-level requireAuth middleware on every request.
router.use("/admin", adminRouter);

router.use(healthRouter);
router.use(categoriesRouter);
router.use(marketplaceRouter);
router.use(businessesRouter);
router.use(capabilitiesRouter);
router.use(servicesRouter);

export default router;
