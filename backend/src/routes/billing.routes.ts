import { Router } from "express";
import { z } from "zod";
import { extractTenant, rbacCheck, validate, verifyJWT } from "../middleware/index.js";
import { billingConfig, billingSummary, cancelSubscription, subscribe } from "../controllers/billing.controller.js";

export const billingRouter = Router();

// Dashboard-credentialed. Reading the summary is fine for any signed-in member;
// starting or cancelling a subscription is an admin action.
billingRouter.use(verifyJWT, extractTenant);
billingRouter.get("/summary", billingSummary);
billingRouter.get("/config", billingConfig);
billingRouter.post("/subscribe", rbacCheck("admin", "superadmin"), validate(z.object({ plan: z.enum(["starter", "pro"]) })), subscribe);
billingRouter.post("/cancel", rbacCheck("admin", "superadmin"), cancelSubscription);
