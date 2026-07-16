import { Bot, Conversation, Message, Ticket } from "../models/index.js";

const defaults = ["refund", "lawsuit", "legal", "angry", "furious", "cancel account", "payment failed", "outage", "speak to human", "manager", "unacceptable"];
export type Priority = "low" | "medium" | "high" | "urgent";

export function detectEscalation(text: string, custom: Array<{ trigger?: string; priority?: string }> = []) {
  const lower = text.toLowerCase();
  const match = [...custom.map((x) => x.trigger).filter(Boolean) as string[], ...defaults].find((term) => lower.includes(term.toLowerCase()));
  if (!match) return null;
  const configured = custom.find((x) => x.trigger?.toLowerCase() === match.toLowerCase())?.priority as Priority | undefined;
  const priority: Priority = configured ?? (/legal|lawsuit|outage/.test(match) ? "urgent" : /refund|payment|cancel/.test(match) ? "high" : /angry|furious|manager|unacceptable/.test(match) ? "medium" : "low");
  return { trigger: match, priority };
}

export async function createTicket(tenantId: string, conversation: any, description: string, priority: Priority = "low") {
  const existing = await Ticket.findOne({ tenantId, conversationId: conversation._id });
  if (existing) return existing;
  const last = await Ticket.findOne({ tenantId }).sort({ createdAt: -1 }).select("ticketNumber").lean<any>();
  const next = Number(last?.ticketNumber?.replace(/\D/g, "")) + 1 || 1;
  const ticket = await Ticket.create({ tenantId, conversationId: conversation._id, ticketNumber: `TKT-${String(next).padStart(3, "0")}`, customerName: conversation.customerName, customerEmail: conversation.customerEmail, subject: description.slice(0, 80) || "Support request", description, priority });
  await Conversation.updateOne({ _id: conversation._id, tenantId }, { ticketId: ticket._id, isEscalated: true, escalatedAt: new Date(), status: "escalated" });
  await Message.create({ tenantId, conversationId: conversation._id, role: "system", content: `Support ticket ${ticket.ticketNumber} created.`, eventType: "ticket_created" });
  return ticket;
}

/**
 * Escalation rules belong to the bot, not the tenant — two bots in one tenant
 * can reasonably escalate on different phrases. Falls back to the tenant's
 * default bot for callers with no bot in hand (email/WhatsApp integrations).
 */
export async function evaluateEscalation(tenantId: string, text: string, botId?: string) {
  const bot = botId
    ? await Bot.findOne({ _id: botId, tenantId }).select("escalationRules").lean<any>()
    : await Bot.findOne({ tenantId, isDefault: true }).select("escalationRules").lean<any>();
  return detectEscalation(text, bot?.escalationRules ?? []);
}
