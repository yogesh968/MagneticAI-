import { Router } from "express";
import { z } from "zod";
import { getBotConfig, getWidgetConfig, testBot, updateBotConfig } from "../controllers/config.controller.js";
import { extractTenant, rbacCheck, validate, verifyJWT } from "../middleware/index.js";

export const configRouter = Router();
configRouter.use(verifyJWT, extractTenant);
configRouter.get("/bot", getBotConfig);
configRouter.put("/bot", rbacCheck("admin", "superadmin"), validate(z.object({ botName: z.string().min(1), welcomeMessage: z.string().min(1), personality: z.enum(["professional", "friendly", "technical"]), escalationRules: z.array(z.object({ trigger: z.string().min(1), priority: z.enum(["low", "medium", "high", "urgent"]) })), suggestedQuestions: z.array(z.string()).max(5), isActive: z.boolean().optional() })), updateBotConfig);
configRouter.post("/test", validate(z.object({ question: z.string().min(1) })), testBot);

export const widgetRouter = Router();
widgetRouter.get("/:tenantId/config", getWidgetConfig);
