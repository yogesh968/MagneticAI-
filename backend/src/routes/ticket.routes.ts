import { Router } from "express";
import { z } from "zod";
import { escalateTicket, getTicket, listAgents, listTickets, updateTicket } from "../controllers/ticket.controller.js";
import { extractTenant, rbacCheck, validate, verifyJWT } from "../middleware/index.js";
import { Ticket } from "../models/index.js";

export const ticketRouter = Router();
ticketRouter.use(verifyJWT, extractTenant, rbacCheck("agent", "admin", "superadmin"));
ticketRouter.get("/escalated", async (req, res) => res.json(await Ticket.find({ tenantId: req.tenantId, priority: { $in: ["high", "urgent"] } }).sort({ createdAt: -1 })));
ticketRouter.get("/agents", listAgents);
ticketRouter.get("/", listTickets);
ticketRouter.get("/:id", getTicket);
ticketRouter.put("/:id", validate(z.object({ status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), assignedTo: z.string().nullable().optional(), note: z.string().min(1).optional(), tags: z.array(z.string()).optional() })), updateTicket);
ticketRouter.post("/:id/escalate", validate(z.object({ priority: z.enum(["low", "medium", "high", "urgent"]).optional() })), escalateTicket);
