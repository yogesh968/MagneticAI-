import type { Request, Response } from "express";
import crypto from "node:crypto";
import { Conversation, Message, Tenant } from "../models/index.js";
import { answerWithRag, streamAnswerWithRag } from "../services/rag.service.js";
import { createTicket, evaluateEscalation } from "../services/escalation.service.js";
import { signSessionToken } from "../utils/jwt.js";

/**
 * The only public chat route that accepts a caller-supplied tenantId. It mints a
 * signed session token; every subsequent route reads the tenant from that token
 * instead, so a caller can no longer point itself at an arbitrary tenant.
 */
export async function createSession(req: Request, res: Response) {
  const tenant = await Tenant.findOne({ _id: req.body.tenantId, isActive: true }).select("_id").lean<any>();
  if (!tenant) return res.status(404).json({ message: "Tenant not found" });

  const sessionId = crypto.randomUUID();
  const conversation = await Conversation.create({
    tenantId: tenant._id,
    sessionId,
    customerName: req.body.customerName,
    customerEmail: req.body.customerEmail,
  });

  const sessionToken = signSessionToken({
    sessionId,
    tenantId: String(tenant._id),
    conversationId: String(conversation._id),
  });

  res.status(201).json({ sessionId, conversationId: String(conversation._id), sessionToken });
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

/** Loads the conversation named by the session token, scoped to that token's tenant. */
async function loadSessionConversation(req: Request) {
  const { sessionId, tenantId } = req.session!;
  const conversation = await Conversation.findOne({ sessionId, tenantId, deletedAt: { $exists: false } });
  return { conversation, tenantId };
}

export async function sendMessage(req: Request, res: Response) {
  const started = Date.now();
  const { message, customerName, customerEmail } = req.body;
  const { conversation, tenantId } = await loadSessionConversation(req);
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  if (customerName) conversation.customerName = customerName;
  if (customerEmail) conversation.customerEmail = customerEmail;
  await Message.create({ tenantId, conversationId: conversation._id, role: "user", content: message });

  try {
    const result = await answerWithRag(tenantId, message);
    const { assistant, ticket } = await persistReply(tenantId, conversation, message, result, started);
    res.json({ message: assistant, ticket, escalated: Boolean(ticket) });
  } catch (error) {
    console.error("[chat] AI generation failed completely:", error);
    const fallbackMessage = "We're having trouble right now, an agent will follow up shortly.";
    const result = { answer: fallbackMessage, hasContext: false, documentsReferenced: [] };
    const { assistant, ticket } = await persistReply(tenantId, conversation, message, result, started);
    // Explicitly create a high priority ticket since the system failed
    if (!ticket) {
      await createTicket(tenantId, conversation, "SYSTEM ERROR: " + message, "high");
    }
    res.json({ message: assistant, ticket: true, escalated: true });
  }
}

export async function streamMessage(req: Request, res: Response) {
  const started = Date.now();
  const { message, customerName, customerEmail } = req.body;
  const { conversation, tenantId } = await loadSessionConversation(req);
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  if (customerName) conversation.customerName = customerName;
  if (customerEmail) conversation.customerEmail = customerEmail;
  await Message.create({ tenantId, conversationId: conversation._id, role: "user", content: message });
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });

  try {
    const result = await streamAnswerWithRag(tenantId, message, (token) => res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`));
    const { assistant, ticket } = await persistReply(tenantId, conversation, message, result, started);
    res.write(`event: done\ndata: ${JSON.stringify({ message: assistant, ticket, escalated: Boolean(ticket) })}\n\n`);
  } catch (error) {
    console.error("[chat] AI generation failed completely during stream:", error);
    const fallbackMessage = "We're having trouble right now, an agent will follow up shortly.";
    res.write(`event: token\ndata: ${JSON.stringify({ token: fallbackMessage })}\n\n`);
    const result = { answer: fallbackMessage, hasContext: false, documentsReferenced: [] };
    const { assistant, ticket } = await persistReply(tenantId, conversation, message, result, started);
    if (!ticket) {
      await createTicket(tenantId, conversation, "SYSTEM ERROR: " + message, "high");
    }
    res.write(`event: done\ndata: ${JSON.stringify({ message: assistant, ticket: true, escalated: true })}\n\n`);
  }
  res.end();
}

export async function createPublicTicket(req: Request, res: Response) {
  const { conversation, tenantId } = await loadSessionConversation(req);
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  conversation.customerName = req.body.customerName;
  conversation.customerEmail = req.body.customerEmail;
  await conversation.save();
  const ticket = await createTicket(tenantId, conversation, req.body.description, req.body.priority ?? "low");
  res.status(201).json(ticket);
}

/**
 * Reads only the conversation the session token was minted for. The sessionId is
 * no longer taken from the URL — holding a session UUID is not proof of ownership.
 */
export async function history(req: Request, res: Response) {
  const { conversation } = await loadSessionConversation(req);
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });
  const messages = await Message.find({ conversationId: conversation._id, tenantId: conversation.tenantId }).sort({ createdAt: 1 });
  res.json({ conversation, messages });
}
