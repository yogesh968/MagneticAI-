import { Router } from "express";
import { z } from "zod";
import { createPublicTicket, createSession, history, sendMessage, streamMessage } from "../controllers/chat.controller.js";
import { validate, verifySession } from "../middleware/index.js";
import { checkQuota } from "../middleware/quota.js";

import { rateLimit } from "express-rate-limit";

export const chatRouter = Router();

/**
 * Keyed on the signed session token's sessionId, falling back to IP. The old
 * key was req.body.tenantId — caller-supplied, so rotating it reset the budget.
 */
const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.session?.sessionId ?? req.ip ?? "unknown",
  message: { message: "Too many messages sent. Please try again later." },
});

/** Session creation is the unauthenticated entry point, so cap it per IP. */
const sessionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? "unknown",
  message: { message: "Too many chat sessions started. Please try again later." },
});

// Either identifier is accepted: botId targets a specific bot, tenantId alone
// resolves to that tenant's default bot (what legacy data-tenant-id embeds send).
const sessionSchema = z.object({
  botId: z.string().min(1).optional(),
  tenantId: z.string().min(1).optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
}).refine((v) => v.botId || v.tenantId, { message: "botId or tenantId is required" });

chatRouter.post("/session", sessionRateLimiter, validate(sessionSchema), createSession);

// tenantId and sessionId now come from the x-session-token header, not the body.
const messageSchema = z.object({ message: z.string().min(1).max(5000), customerName: z.string().optional(), customerEmail: z.string().email().optional() });

chatRouter.post("/message", verifySession, chatRateLimiter, checkQuota, validate(messageSchema),
  (req, res) => req.accepts("text/event-stream") ? streamMessage(req, res) : sendMessage(req, res)
);
chatRouter.post("/message/stream", verifySession, chatRateLimiter, checkQuota, validate(messageSchema), streamMessage);
chatRouter.post("/ticket", verifySession, chatRateLimiter,
  validate(z.object({ customerName: z.string().min(1), customerEmail: z.string().email(), description: z.string().min(1), priority: z.enum(["low", "medium", "high", "urgent"]).optional() })),
  createPublicTicket
);
chatRouter.get("/history", verifySession, history);
