import { Router } from "express";
import { z } from "zod";
import {
  createBot, deleteBot, getBot, getDefaultWidgetConfig, getWidgetConfig,
  listBots, setDefaultBot, testBot, updateBot,
} from "../controllers/bot.controller.js";
import { extractTenant, rbacCheck, validate, verifyJWT } from "../middleware/index.js";

const settings = z.object({
  widgetColor: z.string().optional(),
  widgetPosition: z.enum(["bottom-right", "bottom-left"]).optional(),
});

const escalationRules = z.array(z.object({
  trigger: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]),
}));

const createSchema = z.object({
  botName: z.string().min(1).max(60),
  description: z.string().max(280).optional(),
  welcomeMessage: z.string().min(1).max(500).optional(),
  personality: z.enum(["professional", "friendly", "technical"]).optional(),
  escalationRules: escalationRules.optional(),
  suggestedQuestions: z.array(z.string().min(1)).max(5).optional(),
  isActive: z.boolean().optional(),
  settings: settings.optional(),
});

// Same shape, but every field optional for partial updates.
const updateSchema = createSchema.partial();

export const botRouter = Router();
botRouter.use(verifyJWT, extractTenant);

// Agents need to read bots to make sense of conversations; only admins may change them.
botRouter.get("/", listBots);
botRouter.get("/:id", getBot);

botRouter.post("/", rbacCheck("admin", "superadmin"), validate(createSchema), createBot);
botRouter.put("/:id", rbacCheck("admin", "superadmin"), validate(updateSchema), updateBot);
botRouter.post("/:id/default", rbacCheck("admin", "superadmin"), setDefaultBot);
botRouter.delete("/:id", rbacCheck("admin", "superadmin"), deleteBot);
botRouter.post("/:id/test", rbacCheck("admin", "superadmin"), validate(z.object({ question: z.string().min(1) })), testBot);

// ── Public widget config ─────────────────────────────────────────────────────
export const widgetRouter = Router();
widgetRouter.get("/bot/:botId/config", getWidgetConfig);
// Legacy embeds that only carry data-tenant-id resolve to the default bot.
widgetRouter.get("/:tenantId/config", getDefaultWidgetConfig);
