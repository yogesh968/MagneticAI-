import { Router } from "express";
import { z } from "zod";
import { createPublicTicket, createSession, history, sendMessage, streamMessage } from "../controllers/chat.controller.js";
import { validate } from "../middleware/index.js";

import { rateLimit } from "express-rate-limit";

export const chatRouter = Router();

const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // Limit each tenant to 60 requests per `window` (here, per minute).
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  keyGenerator: (req) => {
    // If no tenantId is in the body, fall back to IP (though it should be validated later)
    return req.body?.tenantId || req.ip || "unknown";
  },
  message: { message: "Too many messages sent. Please try again later." }
});

chatRouter.post("/session", validate(z.object({ tenantId: z.string().min(1), customerName: z.string().optional(), customerEmail: z.string().email().optional() })), createSession);
const messageSchema = z.object({ tenantId: z.string().min(1), sessionId: z.string().uuid(), message: z.string().min(1).max(5000), customerName: z.string().optional(), customerEmail: z.string().email().optional() });
chatRouter.post("/message", chatRateLimiter, validate(messageSchema), (req, res) => req.accepts("text/event-stream") ? streamMessage(req, res) : sendMessage(req, res));
chatRouter.post("/message/stream", chatRateLimiter, validate(messageSchema), streamMessage);
chatRouter.post("/ticket", validate(z.object({ tenantId: z.string().min(1), sessionId: z.string().uuid(), customerName: z.string().min(1), customerEmail: z.string().email(), description: z.string().min(1), priority: z.enum(["low", "medium", "high", "urgent"]).optional() })), createPublicTicket);
chatRouter.get("/history/:sessionId", history);
