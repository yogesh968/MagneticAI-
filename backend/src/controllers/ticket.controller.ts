import type { Request, Response } from "express";
import { Conversation, Message, Ticket, User } from "../models/index.js";

const ticketFilter = (req: Request) => ({ tenantId: req.tenantId, ...(req.query.status ? { status: req.query.status } : {}), ...(req.query.priority ? { priority: req.query.priority } : {}), ...(req.query.from || req.query.to ? { createdAt: { ...(req.query.from ? { $gte: new Date(String(req.query.from)) } : {}), ...(req.query.to ? { $lte: new Date(String(req.query.to)) } : {}) } } : {}), ...(req.query.search ? { $or: [{ subject: new RegExp(String(req.query.search), "i") }, { customerName: new RegExp(String(req.query.search), "i") }, { customerEmail: new RegExp(String(req.query.search), "i") }, { ticketNumber: new RegExp(String(req.query.search), "i") }] } : {}) });

export async function listTickets(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Number(req.query.limit) || 20), filter = ticketFilter(req);
  const [items, total] = await Promise.all([Ticket.find(filter).populate("assignedTo", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Ticket.countDocuments(filter)]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}
export async function getTicket(req: Request, res: Response) {
  const ticket = await Ticket.findOne({ _id: req.params.id, tenantId: req.tenantId }).populate("assignedTo", "name email");
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  res.json({ ticket, messages: await Message.find({ tenantId: req.tenantId, conversationId: ticket.conversationId }).sort({ createdAt: 1 }) });
}
export async function updateTicket(req: Request, res: Response) {
  const update: Record<string, unknown> = { ...req.body };
  if (req.body.assignedTo && !await User.exists({ _id: req.body.assignedTo, tenantId: req.tenantId })) return res.status(400).json({ message: "Agent not found in this tenant" });
  if (req.body.status === "resolved") update.resolvedAt = new Date();
  if (req.body.note) { delete update.note; await Ticket.updateOne({ _id: req.params.id, tenantId: req.tenantId }, { $push: { notes: { body: req.body.note, author: req.user!.id } } }); }
  const ticket = await Ticket.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, update, { new: true });
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  res.json(ticket);
}
export async function listAgents(req: Request, res: Response) {
  res.json(await User.find({ tenantId: req.tenantId, role: { $in: ["admin", "agent"] } }).select("name email role").sort({ name: 1 }));
}
export async function escalateTicket(req: Request, res: Response) {
  const ticket = await Ticket.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { priority: req.body.priority ?? "high", status: "open" }, { new: true });
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  await Conversation.updateOne({ _id: ticket.conversationId, tenantId: req.tenantId }, { status: "escalated", isEscalated: true, escalatedAt: new Date() });
  res.json(ticket);
}
