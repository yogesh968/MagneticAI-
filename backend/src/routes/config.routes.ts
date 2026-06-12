import { Router } from "express";
import { z } from "zod";
import { getBotConfig, getWidgetConfig, testBot, updateBotConfig } from "../controllers/config.controller.js";
import { extractTenant, rbacCheck, validate, verifyJWT } from "../middleware/index.js";

const botSchema = z.object({
  botName: z.string().min(1).optional(),
  welcomeMessage: z.string().min(1).optional(),
  personality: z.enum(["professional", "friendly", "technical"]).optional(),
  escalationRules: z.array(z.object({ trigger: z.string().min(1), priority: z.enum(["low", "medium", "high", "urgent"]) })).optional(),
  suggestedQuestions: z.array(z.string()).max(5).optional(),
  isActive: z.boolean().optional(),
  settings: z.object({
    widgetColor: z.string().optional(),
    widgetPosition: z.string().optional(),
  }).optional(),
});

export const configRouter = Router();
configRouter.use(verifyJWT, extractTenant, rbacCheck("admin", "superadmin"));
configRouter.get("/bot", getBotConfig);
configRouter.put("/bot", validate(botSchema), updateBotConfig);
configRouter.post("/test", validate(z.object({ question: z.string().min(1) })), testBot);

export const widgetRouter = Router();
widgetRouter.get("/:tenantId/config", getWidgetConfig);
