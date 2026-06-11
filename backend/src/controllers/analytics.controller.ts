import type { Request, Response } from "express";
import { Conversation, Document, Message, Ticket } from "../models/index.js";

export async function overview(req: Request, res: Response) {
  const tenantId = req.tenantId;
  const [conversations, openTickets, resolvedTickets, escalated] = await Promise.all([Conversation.countDocuments({ tenantId, deletedAt: { $exists: false } }), Ticket.countDocuments({ tenantId, status: { $in: ["open", "in_progress"] } }), Ticket.countDocuments({ tenantId, status: "resolved" }), Conversation.countDocuments({ tenantId, isEscalated: true })]);
  res.json({ totalConversations: conversations, openTickets, resolvedTickets, escalated, resolutionRate: conversations ? Math.round(((conversations - escalated) / conversations) * 100) : 0 });
}
export async function charts(req: Request, res: Response) {
  const since = new Date(Date.now() - 30 * 86400000);
  const items = await Conversation.aggregate([{ $match: { tenantId: req.tenantId, createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, conversations: { $sum: 1 }, escalations: { $sum: { $cond: ["$isEscalated", 1, 0] } } } }, { $sort: { _id: 1 } }]);
  res.json(items.map((x) => ({ date: x._id, conversations: x.conversations, escalations: x.escalations })));
}
export async function kbAnalytics(req: Request, res: Response) {
  const refs = await Message.aggregate([{ $match: { tenantId: req.tenantId } }, { $unwind: "$metadata.documentsReferenced" }, { $group: { _id: "$metadata.documentsReferenced", references: { $sum: 1 } } }, { $sort: { references: -1 } }, { $limit: 10 }]);
  const documents = await Document.find({ tenantId: req.tenantId, _id: { $in: refs.map((x) => x._id) } }).lean();
  res.json({ documents: refs.map((ref) => ({ ...ref, name: documents.find((d) => String(d._id) === ref._id)?.name })), failedQueries: await Message.find({ tenantId: req.tenantId, role: "assistant", content: /couldn't find/i }).sort({ createdAt: -1 }).limit(20) });
}
export async function escalationAnalytics(req: Request, res: Response) {
  const breakdown = await Ticket.aggregate([{ $match: { tenantId: req.tenantId } }, { $group: { _id: "$priority", count: { $sum: 1 } } }]);
  res.json({ breakdown, recent: await Ticket.find({ tenantId: req.tenantId }).sort({ createdAt: -1 }).limit(10) });
}
