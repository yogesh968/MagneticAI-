import crypto from "node:crypto";
import twilio from "twilio";
import { Router } from "express";
import { z } from "zod";
import { rbacCheck, validate, verifyJWT } from "../middleware/index.js";
import { verifyEmailWebhook, verifyTwilioWebhook } from "../middleware/webhook.js";
import { Bot, Conversation, Message, Tenant } from "../models/index.js";
import { createTicket } from "../services/escalation.service.js";
import { answerWithRag } from "../services/rag.service.js";
import { env } from "../config/env.js";
import { dashboardCors, publicCors } from "../config/cors.js";

export const integrationRouter = Router();

// ── Email → Ticket ────────────────────────────────────────────────────────────
// Accepts webhook payloads from SendGrid Inbound Parse or any email relay.
// Requires the EMAIL_WEBHOOK_SECRET shared secret in x-webhook-secret.
// POST /api/integrations/email
integrationRouter.post(
  "/email",
  publicCors,
  verifyEmailWebhook,
  validate(
    z.object({
      tenantId:    z.string().min(1),
      from:        z.string().email(),
      subject:     z.string().min(1),
      text:        z.string().min(1),
      name:        z.string().optional(),
      html:        z.string().optional(),
    }),
  ),
  async (req, res) => {
    const { tenantId, from, subject, text, name } = req.body;
    if (!await Tenant.exists({ _id: tenantId, isActive: true }))
      return res.status(404).json({ message: "Tenant not found" });

    const conversation = await Conversation.create({
      tenantId,
      sessionId:      crypto.randomUUID(),
      customerName:   name ?? from.split("@")[0],
      customerEmail:  from,
      status:         "escalated",
      isEscalated:    true,
      escalatedAt:    new Date(),
      messageCount:   1,
    });

    await Message.create({
      tenantId,
      conversationId: conversation._id,
      role:           "user",
      content:        `Subject: ${subject}\n\n${text}`,
    });

    const ticket = await createTicket(
      tenantId,
      conversation,
      `${subject}\n\n${text}`,
      "medium",
    );

    res.status(201).json({ ticket, conversationId: conversation._id });
  },
);

// ── WhatsApp → AI reply (Twilio webhook) ──────────────────────────────────────
const whatsappHandler = async (req: any, res: any) => {
  try {
    const body    = req.body as Record<string, string>;
    const from    = body["From"]    ?? "";   // whatsapp:+1234567890
    const msgBody = body["Body"]    ?? "";
    const to      = body["To"]      ?? "";   // whatsapp:+<your twilio number>

    // NOTE: single-tenant. Every inbound WhatsApp message is attributed to
    // WHATSAPP_TENANT_ID regardless of which number it arrived on, so this
    // integration cannot serve more than one tenant as written.
    const tenantId = env.WHATSAPP_TENANT_ID ?? "";
    if (!tenantId) {
      console.warn("[whatsapp] WHATSAPP_TENANT_ID not set — rejecting");
      return res.status(200).send("<Response></Response>");
    }

    // WhatsApp carries no bot selector, so it always uses the tenant's default bot.
    const bot = await Bot.findOne({ tenantId, isDefault: true, isActive: true }).select("_id").lean<any>();
    if (!bot) {
      console.warn("[whatsapp] tenant has no active default bot — rejecting");
      return res.status(200).send("<Response></Response>");
    }

    const phone = from.replace("whatsapp:", "");

    // Find or create conversation for this phone number
    let conversation = await Conversation.findOne({
      tenantId,
      customerEmail: `whatsapp:${phone}`,
      deletedAt:     { $exists: false },
      status:        { $ne: "closed" },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        tenantId,
        botId:          bot._id,
        sessionId:      crypto.randomUUID(),
        customerName:   phone,
        customerEmail:  `whatsapp:${phone}`,
        status:         "active",
        messageCount:   0,
      });
    }

    // Persist user message
    await Message.create({
      tenantId,
      conversationId: conversation._id,
      role:           "user",
      content:        msgBody,
    });
    conversation.messageCount += 1;
    await conversation.save();

    // Get AI answer from the default bot's knowledge base
    const result = await answerWithRag({ tenantId, botId: String(bot._id) }, msgBody);

    // Persist assistant reply
    await Message.create({
      tenantId,
      conversationId: conversation._id,
      role:           "assistant",
      content:        result.answer,
      metadata:       { documentsReferenced: result.documentsReferenced },
    });
    conversation.messageCount += 1;
    await conversation.save();

    // Reply via Twilio REST API (works on MM Lite + sandbox)
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      from: env.TWILIO_WHATSAPP_FROM,
      to:   from,
      body: result.answer.slice(0, 1600),
    });

    res.status(200).send("<Response></Response>");
  } catch (err) {
    console.error("[whatsapp] error:", err);
    res.status(200).send("<Response></Response>");
  }
};

integrationRouter.post("/whatsapp", publicCors, verifyTwilioWebhook, whatsappHandler);
integrationRouter.post("/whatsapp/webhook", publicCors, verifyTwilioWebhook, whatsappHandler);

// ── Status endpoint ───────────────────────────────────────────────────────────
// Which credentials are configured is operator information, not public. This is
// the one route on this router the dashboard calls, so it needs the credentialed
// CORS policy rather than the permissive one the webhooks are mounted under.
integrationRouter.get("/status", dashboardCors, verifyJWT, rbacCheck("admin", "superadmin"), (_req, res) => {
  res.json({
    email:     Boolean(env.EMAIL_WEBHOOK_SECRET),
    whatsapp:  Boolean(env.WHATSAPP_TENANT_ID),
    twilio:    Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
  });
});
