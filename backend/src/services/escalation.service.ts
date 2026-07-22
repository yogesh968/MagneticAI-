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

/** How long after one auto "SYSTEM ERROR" ticket to suppress the next, so a
 *  provider outage spanning many conversations doesn't flood the queue (A5). */
const SYSTEM_ERROR_COOLDOWN_MS = 5 * 60 * 1000;

export async function createTicket(tenantId: string, conversation: any, description: string, priority: Priority = "low") {
  const existing = await Ticket.findOne({ tenantId, conversationId: conversation._id });
  if (existing) return existing;

  // ticketNumber is derived from the latest number, which races under load and
  // can collide on the unique {tenantId, ticketNumber} index. Recompute and retry
  // on a duplicate-key error instead of surfacing a 500.
  let ticket: any;
  for (let attempt = 0; ; attempt++) {
    const last = await Ticket.findOne({ tenantId }).sort({ createdAt: -1 }).select("ticketNumber").lean<any>();
    const next = Number(last?.ticketNumber?.replace(/\D/g, "")) + 1 || 1;
    try {
      ticket = await Ticket.create({ tenantId, conversationId: conversation._id, ticketNumber: `TKT-${String(next).padStart(3, "0")}`, customerName: conversation.customerName, customerEmail: conversation.customerEmail, subject: description.slice(0, 80) || "Support request", description, priority });
      break;
    } catch (err: any) {
      if (err?.code === 11000 && attempt < 4) continue;
      throw err;
    }
  }

  await Conversation.updateOne({ _id: conversation._id, tenantId }, { ticketId: ticket._id, isEscalated: true, escalatedAt: new Date(), status: "escalated" });
  await Message.create({ tenantId, conversationId: conversation._id, role: "system", content: `Support ticket ${ticket.ticketNumber} created.`, eventType: "ticket_created" });
  return ticket;
}

/**
 * Opens a high-priority "SYSTEM ERROR" ticket when the AI fails completely —
 * but at most once per tenant per cooldown window. Without this, every failing
 * message during an outage opened a fresh high-priority ticket and flooded the
 * queue (blueprint A5). Returns null when suppressed.
 */
export async function createSystemErrorTicket(tenantId: string, conversation: any, description: string) {
  const recent = await Ticket.findOne({
    tenantId,
    description: { $regex: /^SYSTEM ERROR/ },
    createdAt: { $gt: new Date(Date.now() - SYSTEM_ERROR_COOLDOWN_MS) },
  }).select("_id").lean<any>();
  if (recent) return null;
  return createTicket(tenantId, conversation, description, "high");
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
