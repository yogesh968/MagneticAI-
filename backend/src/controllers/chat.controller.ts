import type { Request, Response } from "express";
import crypto from "node:crypto";
import { Conversation, Message, Tenant } from "../models/index.js";
import { answerWithRag, streamAnswerWithRag } from "../services/rag.service.js";
import { createTicket, evaluateEscalation } from "../services/escalation.service.js";

export async function createSession(req: Request, res: Response) {
  if (!await Tenant.exists({ _id: req.body.tenantId })) return res.status(404).json({ message: "Tenant not found" });
  const sessionId = crypto.randomUUID();
  const conversation = await Conversation.create({ tenantId: req.body.tenantId, sessionId, customerName: req.body.customerName, customerEmail: req.body.customerEmail });
  res.status(201).json({ sessionId, conversationId: String(conversation._id) });
}

async function persistReply(tenantId: string, conversation: any, userMessage: string, result: Awaited<ReturnType<typeof answerWithRag>>, started: number) {
  const escalation = await evaluateEscalation(tenantId, `${userMessage}\n${result.answer}`);
  const assistant = await Message.create({ tenantId, conversationId: conversation._id, role: "assistant", content: result.answer, metadata: { responseTime: Date.now() - started, documentsReferenced: result.documentsReferenced } });
  conversation.messageCount += 2;
  // Only create ticket on explicit escalation trigger — not just because KB had no context
  let ticket;
  if (escalation) ticket = await createTicket(tenantId, conversation, userMessage, escalation.priority);
  await conversation.save();
  return { assistant, ticket };
}

export async function sendMessage(req: Request, res: Response) {
  const started = Date.now();
  const { sessionId, tenantId, message, customerName, customerEmail } = req.body;
  const conversation = await Conversation.findOne({ sessionId, tenantId, deletedAt: { $exists: false } });
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  if (customerName) conversation.customerName = customerName;
  if (customerEmail) conversation.customerEmail = customerEmail;
  await Message.create({ tenantId, conversationId: conversation._id, role: "user", content: message });
  const result = await answerWithRag(tenantId, message);
  const { assistant, ticket } = await persistReply(tenantId, conversation, message, result, started);
  res.json({ message: assistant, ticket, escalated: Boolean(ticket) });
}

export async function streamMessage(req: Request, res: Response) {
  const started = Date.now();
  const { sessionId, tenantId, message, customerName, customerEmail } = req.body;
  const conversation = await Conversation.findOne({ sessionId, tenantId, deletedAt: { $exists: false } });
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  if (customerName) conversation.customerName = customerName;
  if (customerEmail) conversation.customerEmail = customerEmail;
  await Message.create({ tenantId, conversationId: conversation._id, role: "user", content: message });
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });
  const result = await streamAnswerWithRag(tenantId, message, (token) => res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`));
  const { assistant, ticket } = await persistReply(tenantId, conversation, message, result, started);
  res.write(`event: done\ndata: ${JSON.stringify({ message: assistant, ticket, escalated: Boolean(ticket) })}\n\n`);
  res.end();
}

export async function createPublicTicket(req: Request, res: Response) {
  const conversation = await Conversation.findOne({ sessionId: req.body.sessionId, tenantId: req.body.tenantId, deletedAt: { $exists: false } });
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  conversation.customerName = req.body.customerName;
  conversation.customerEmail = req.body.customerEmail;
  await conversation.save();
  const ticket = await createTicket(req.body.tenantId, conversation, req.body.description, req.body.priority ?? "low");
  res.status(201).json(ticket);
}

export async function history(req: Request, res: Response) {
  const conversation = await Conversation.findOne({ sessionId: req.params.sessionId, ...(req.query.tenantId ? { tenantId: req.query.tenantId } : {}) });
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  res.json({ conversation, messages: await Message.find({ conversationId: conversation._id, tenantId: conversation.tenantId }).sort({ createdAt: 1 }) });
}
