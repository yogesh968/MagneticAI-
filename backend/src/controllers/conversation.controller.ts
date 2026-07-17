import type { Request, Response } from "express";
import type { FilterQuery } from "mongoose";
import { Conversation, Message } from "../models/index.js";

export async function listConversations(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const filter: FilterQuery<unknown> = { tenantId: req.tenantId, deletedAt: { $exists: false } };
  if (req.query.search) {
    const search = new RegExp(String(req.query.search), "i");
    const conversationIds = await Message.distinct("conversationId", { tenantId: req.tenantId, content: search });
    filter.$or = [{ customerName: search }, { customerEmail: search }, { _id: { $in: conversationIds } }];
  }
  if (req.query.from || req.query.to) filter.createdAt = { ...(req.query.from ? { $gte: new Date(String(req.query.from)) } : {}), ...(req.query.to ? { $lte: new Date(String(req.query.to)) } : {}) };
  // Lets the dashboard answer "which bot handled this conversation?"
  if (req.query.botId) filter.botId = req.query.botId;
  const [items, total] = await Promise.all([
    Conversation.find(filter).populate("botId", "botName settings.widgetColor").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Conversation.countDocuments(filter)
  ]);
  const lastMessages = await Message.aggregate([{ $match: { tenantId: req.tenantId, conversationId: { $in: items.map((item) => item._id) } } }, { $sort: { createdAt: -1 } }, { $group: { _id: "$conversationId", content: { $first: "$content" }, createdAt: { $first: "$createdAt" } } }]);
  res.json({ items: items.map((item) => ({ ...item, lastMessage: lastMessages.find((message) => String(message._id) === String(item._id)) })), total, page, pages: Math.ceil(total / limit) });
}

export async function getConversation(req: Request, res: Response) {
  const conversation = await Conversation.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: { $exists: false } })
    .populate("botId", "botName settings.widgetColor");
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  res.json({ conversation, messages: await Message.find({ conversationId: conversation._id, tenantId: req.tenantId }).sort({ createdAt: 1 }) });
}

export async function deleteConversation(req: Request, res: Response) {
  const result = await Conversation.updateOne({ _id: req.params.id, tenantId: req.tenantId }, { deletedAt: new Date(), status: "closed", endedAt: new Date() });
  if (!result.matchedCount) return res.status(404).json({ message: "Conversation not found" });
  res.status(204).end();
}
