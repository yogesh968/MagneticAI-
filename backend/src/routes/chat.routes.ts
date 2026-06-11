import { Router } from "express";
import { z } from "zod";
import { createPublicTicket, createSession, history, sendMessage, streamMessage } from "../controllers/chat.controller.js";
import { validate } from "../middleware/index.js";

export const chatRouter = Router();
chatRouter.post("/session", validate(z.object({ tenantId: z.string().min(1), customerName: z.string().optional(), customerEmail: z.string().email().optional() })), createSession);
const messageSchema = z.object({ tenantId: z.string().min(1), sessionId: z.string().uuid(), message: z.string().min(1).max(5000), customerName: z.string().optional(), customerEmail: z.string().email().optional() });
chatRouter.post("/message", validate(messageSchema), (req, res) => req.accepts("text/event-stream") ? streamMessage(req, res) : sendMessage(req, res));
chatRouter.post("/message/stream", validate(messageSchema), streamMessage);
chatRouter.post("/ticket", validate(z.object({ tenantId: z.string().min(1), sessionId: z.string().uuid(), customerName: z.string().min(1), customerEmail: z.string().email(), description: z.string().min(1), priority: z.enum(["low", "medium", "high", "urgent"]).optional() })), createPublicTicket);
chatRouter.get("/history/:sessionId", history);
