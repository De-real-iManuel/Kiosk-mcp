import { Router, type IRouter } from "express";
import businessesRouter from "./businesses";
import capabilitiesRouter from "./capabilities";
import categoriesRouter from "./categories";
import healthRouter from "./health";
import marketplaceRouter from "./marketplace";
import servicesRouter from "./services";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(marketplaceRouter);
router.use(businessesRouter);
router.use(capabilitiesRouter);
router.use(servicesRouter);

export default router;
