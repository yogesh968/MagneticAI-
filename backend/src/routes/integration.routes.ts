import twilio from "twilio";
import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/index.js";
import { BotConfig, Conversation, Message, Tenant } from "../models/index.js";
import { createTicket } from "../services/escalation.service.js";
import { answerWithRag } from "../services/rag.service.js";

export const integrationRouter = Router();

// ── Email → Ticket ────────────────────────────────────────────────────────────
// Accepts webhook payloads from SendGrid Inbound Parse or any email relay.
// POST /api/integrations/email
integrationRouter.post(
  "/email",
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
    if (!await Tenant.exists({ _id: tenantId }))
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

    // Map Twilio "To" number → tenantId via BotConfig or env fallback
    const tenantId = process.env.WHATSAPP_TENANT_ID ?? "";
    if (!tenantId) {
      console.warn("[whatsapp] WHATSAPP_TENANT_ID not set — rejecting");
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

    // Get AI answer
    const result = await answerWithRag(tenantId, msgBody);

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
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to:   from,
      body: result.answer.slice(0, 1600),
    });

    res.status(200).send("<Response></Response>");
  } catch (err) {
    console.error("[whatsapp] error:", err);
    res.status(200).send("<Response></Response>");
  }
};

integrationRouter.post("/whatsapp", whatsappHandler);
integrationRouter.post("/whatsapp/webhook", whatsappHandler);

// ── Status endpoint ───────────────────────────────────────────────────────────
integrationRouter.get("/status", (_req, res) => {
  res.json({
    email:     true,
    whatsapp:  !!process.env.WHATSAPP_TENANT_ID,
    twilio:    !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  });
});
