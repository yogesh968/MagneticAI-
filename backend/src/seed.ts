import "dotenv/config";
import bcrypt from "bcryptjs";
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { connectDB } from "./config/db.js";
import { Bot, Conversation, Document, Message, Tenant, Ticket, User } from "./models/index.js";
import { processDocument } from "./services/document.service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? resolve(__dirname, "../../uploads");

await connectDB();

// ── Tenant ────────────────────────────────────────────────────────────────────
let tenant = await Tenant.findOne({ slug: "acme" });
if (!tenant) {
  tenant = await Tenant.create({
    name: "Acme Corp",
    slug: "acme",
    email: "admin@demo.com",
    plan: "pro",
    settings: { widgetColor: "#2563eb", widgetPosition: "bottom-right" },
  });
}

// ── Admin user ────────────────────────────────────────────────────────────────
let admin = await User.findOne({ tenantId: tenant._id, email: "admin@demo.com" });
if (!admin) {
  admin = await User.create({
    tenantId: tenant._id,
    name: "Demo Admin",
    email: "admin@demo.com",
    passwordHash: await bcrypt.hash("Demo@1234", 12),
    role: "admin",
    isVerified: true,
  });
}

// ── Agent user ────────────────────────────────────────────────────────────────
const agentExists = await User.exists({ tenantId: tenant._id, email: "agent@demo.com" });
if (!agentExists) {
  await User.create({
    tenantId: tenant._id,
    name: "Support Agent",
    email: "agent@demo.com",
    passwordHash: await bcrypt.hash("Demo@1234", 12),
    role: "agent",
    isVerified: true,
  });
}

// ── Bots ─────────────────────────────────────────────────────────────────────
// Two bots on purpose: each gets its own documents below, which is what makes
// the per-bot knowledge base visible in the dashboard.
const supportBot = await Bot.findOneAndUpdate(
  { tenantId: tenant._id, botName: "AcmeBot" },
  {
    $set: {
      description: "General customer support — refunds, shipping, orders.",
      welcomeMessage: "Hi! I'm AcmeBot, your AI support assistant. How can I help you today?",
      personality: "friendly",
      isActive: true,
      isDefault: true,
      settings: { widgetColor: "#2563eb", widgetPosition: "bottom-right" },
      escalationRules: [
        { trigger: "refund", priority: "high" },
        { trigger: "legal", priority: "urgent" },
        { trigger: "lawsuit", priority: "urgent" },
        { trigger: "payment failed", priority: "high" },
        { trigger: "angry", priority: "medium" },
      ],
      suggestedQuestions: [
        "What is your refund policy?",
        "When will my order ship?",
        "How do I track my order?",
        "What payment methods do you accept?",
        "How do I contact support?",
      ],
    },
  },
  { new: true, upsert: true },
);

const productBot = await Bot.findOneAndUpdate(
  { tenantId: tenant._id, botName: "Product Expert" },
  {
    $set: {
      description: "Answers product and feature questions only.",
      welcomeMessage: "Hi! Ask me anything about our products and features.",
      personality: "technical",
      isActive: true,
      settings: { widgetColor: "#7c3aed", widgetPosition: "bottom-right" },
      escalationRules: [{ trigger: "speak to human", priority: "medium" }],
      suggestedQuestions: [
        "What features are included?",
        "How do I get started?",
        "Is there an API?",
      ],
    },
  },
  { new: true, upsert: true },
);

// ── Knowledge Base documents ─────────────────────────────────────────────────
const docCount = await Document.countDocuments({ tenantId: tenant._id });
if (docCount === 0) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  // Split across the two bots so each has a distinct knowledge base.
  const sampleFiles = [
    { name: "Refund Policy", file: "refund-policy.txt", bot: supportBot },
    { name: "Shipping FAQ", file: "shipping-faq.txt", bot: supportBot },
    { name: "Product Guide", file: "product-guide.txt", bot: productBot },
  ];
  for (const sample of sampleFiles) {
    const srcPath = resolve(__dirname, "../../sample-kb", sample.file);
    const destPath = resolve(UPLOAD_DIR, sample.file);
    await copyFile(srcPath, destPath).catch(() => {});
    const doc = await Document.create({
      tenantId: tenant._id,
      botId: sample.bot._id,
      name: `${sample.name}.txt`,
      type: "txt",
      originalUrl: destPath,
      status: "pending",
      uploadedBy: admin._id,
      metadata: { size: 1024 },
    });
    try {
      await processDocument({
        documentId: String(doc._id),
        tenantId: String(tenant._id),
        botId: String(sample.bot._id),
        originalUrl: destPath,
        type: "txt",
      });
      console.info(`[seed] indexed: ${sample.name} -> ${sample.bot.botName}`);
    } catch (err) {
      console.warn(`[seed] could not index ${sample.name}:`, (err as Error).message);
    }
  }
}

// ── Sample conversations + tickets ───────────────────────────────────────────
const convCount = await Conversation.countDocuments({ tenantId: tenant._id });
if (convCount === 0) {
  const subjects = [
    "Need help with my refund",
    "Order not delivered",
    "Payment failed issue",
    "Wrong item received",
    "Product is damaged",
    "How do I return an item?",
    "Tracking number not working",
    "Can I change my order?",
    "Discount code not applied",
    "Account access issue",
  ];
  const userMessages = [
    "I want a refund for my order. This is unacceptable!",
    "My order hasn't arrived yet and it's been 2 weeks.",
    "My payment failed but money was deducted from my account.",
    "I received the wrong item in my package.",
    "The product arrived completely damaged.",
    "How do I start a return for my purchase?",
    "The tracking number you sent me is not working.",
    "Can I change the shipping address on my order?",
    "My discount code is not being applied at checkout.",
    "I can't log into my account and need urgent help.",
  ];
  const priorities: Array<"low" | "medium" | "high" | "urgent"> = [
    "high", "medium", "urgent", "medium", "high",
    "low", "low", "low", "low", "medium",
  ];
  const statuses: Array<"open" | "in_progress" | "resolved" | "closed"> = [
    "open", "in_progress", "resolved", "open", "open",
    "closed", "resolved", "closed", "resolved", "in_progress",
  ];

  for (let i = 0; i < 10; i++) {
    const isEscalated = i < 5;
    const conversation = await Conversation.create({
      tenantId: tenant._id,
      botId: supportBot._id,
      sessionId: crypto.randomUUID(),
      customerName: `Customer ${i + 1}`,
      customerEmail: `customer${i + 1}@example.com`,
      status: isEscalated ? "escalated" : "closed",
      messageCount: 4,
      isEscalated,
      escalatedAt: isEscalated ? new Date() : undefined,
    });

    await Message.insertMany([
      { tenantId: tenant._id, conversationId: conversation._id, role: "user", content: userMessages[i] },
      {
        tenantId: tenant._id,
        conversationId: conversation._id,
        role: "assistant",
        content: "Thank you for reaching out. I understand your concern and I'm here to help. Let me look into this for you right away.",
        metadata: { responseTime: 800, documentsReferenced: [] },
      },
      { tenantId: tenant._id, conversationId: conversation._id, role: "user", content: "Please resolve this quickly." },
      {
        tenantId: tenant._id,
        conversationId: conversation._id,
        role: "assistant",
        content: "I've escalated your case to our support team. You'll receive an email update within 24 hours.",
        metadata: { responseTime: 600, documentsReferenced: [] },
      },
    ]);

    if (i < 5) {
      const ticket = await Ticket.create({
        tenantId: tenant._id,
        conversationId: conversation._id,
        ticketNumber: `TKT-${String(i + 1).padStart(3, "0")}`,
        customerName: `Customer ${i + 1}`,
        customerEmail: `customer${i + 1}@example.com`,
        subject: subjects[i],
        description: userMessages[i]!,
        priority: priorities[i],
        status: statuses[i],
        resolvedAt: statuses[i] === "resolved" ? new Date() : undefined,
        notes:
          i === 0
            ? [{ body: "Customer contacted via phone. Issue is being reviewed.", createdAt: new Date() }]
            : [],
      });
      conversation.ticketId = ticket._id;
      await conversation.save();
    }
  }
}

console.info(`Seed complete — tenant: ${tenant._id}`);
console.info(`   Admin: admin@demo.com / Demo@1234`);
console.info(`   Agent: agent@demo.com / Demo@1234`);
console.info(`   Bots:  ${supportBot.botName} (default, id ${supportBot._id})`);
console.info(`          ${productBot.botName} (id ${productBot._id})`);
process.exit(0);
