import { Router } from "express";
import { charts, escalationAnalytics, kbAnalytics, overview } from "../controllers/analytics.controller.js";
import { extractTenant, verifyJWT } from "../middleware/index.js";
export const analyticsRouter = Router();
analyticsRouter.use(verifyJWT, extractTenant);
analyticsRouter.get("/overview", overview);
analyticsRouter.get("/charts", charts);
analyticsRouter.get("/kb", kbAnalytics);
analyticsRouter.get("/escalations", escalationAnalytics);
