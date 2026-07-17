import mongoose, { Schema, model, type Model } from "mongoose";

const tenantSettings = new Schema({ widgetColor: { type: String, default: "#2563eb" }, widgetPosition: { type: String, default: "bottom-right" } }, { _id: false });
const TenantSchema = new Schema({ name: { type: String, required: true }, slug: { type: String, required: true, unique: true, lowercase: true }, email: String, plan: { type: String, enum: ["free", "pro", "enterprise"], default: "free" }, isActive: { type: Boolean, default: true }, razorpaySubscriptionId: String, settings: { type: tenantSettings, default: () => ({}) } }, { timestamps: true });

// tokenVersion is embedded in every JWT and re-checked on refresh. Bumping it
// invalidates all outstanding refresh tokens for the user (logout, password reset).
const UserSchema = new Schema({ tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true }, name: { type: String, required: true }, email: { type: String, required: true, lowercase: true }, passwordHash: { type: String, required: true }, role: { type: String, enum: ["superadmin", "admin", "agent"], default: "agent" }, isVerified: { type: Boolean, default: false }, tokenVersion: { type: Number, default: 0 }, resetToken: String, resetTokenExpiry: Date }, { timestamps: true });
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// A tenant may have many bots, each with its own persona and its own slice of the
// knowledge base. `tenantId` previously carried unique:true, which capped every
// tenant at exactly one bot.
const BotSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  botName: { type: String, default: "Support Assistant" },
  description: { type: String, default: "" },
  welcomeMessage: { type: String, default: "Hi! How can I help?" },
  personality: { type: String, enum: ["professional", "friendly", "technical"], default: "professional" },
  escalationRules: [{ trigger: String, priority: String }],
  suggestedQuestions: [String],
  isActive: { type: Boolean, default: true },
  // The bot the widget and chat routes fall back to when no botId is supplied.
  isDefault: { type: Boolean, default: false },
  settings: { widgetColor: { type: String, default: "#2563eb" }, widgetPosition: { type: String, default: "bottom-right" } },
}, { timestamps: true });
BotSchema.index({ tenantId: 1, botName: 1 }, { unique: true });
// Partial index: at most one default per tenant, enforced by the database rather
// than by application code that could race.
BotSchema.index({ tenantId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

// botId scopes a document to one bot. Documents predating multi-bot are
// backfilled to the tenant's default bot by scripts/migrate-multi-bot.ts.
const DocumentSchema = new Schema({ tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true }, botId: { type: Schema.Types.ObjectId, ref: "Bot", required: true, index: true }, name: { type: String, required: true }, type: { type: String, enum: ["pdf", "docx", "txt", "md"], required: true }, originalUrl: { type: String, required: true }, status: { type: String, enum: ["pending", "processing", "indexed", "failed"], default: "pending" }, chunkCount: { type: Number, default: 0 }, uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }, metadata: { size: Number, pages: Number } }, { timestamps: true });
DocumentSchema.index({ tenantId: 1, createdAt: -1 });
DocumentSchema.index({ botId: 1, createdAt: -1 });

// botId records which bot handled the conversation. Optional: conversations
// created before multi-bot, and those arriving via the email/WhatsApp
// integrations, have no bot attached.
const ConversationSchema = new Schema({ tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true }, botId: { type: Schema.Types.ObjectId, ref: "Bot", index: true }, sessionId: { type: String, required: true, unique: true }, customerName: String, customerEmail: String, status: { type: String, enum: ["active", "closed", "escalated"], default: "active" }, ticketId: { type: Schema.Types.ObjectId, ref: "Ticket" }, startedAt: { type: Date, default: Date.now }, endedAt: Date, messageCount: { type: Number, default: 0 }, isEscalated: { type: Boolean, default: false }, escalatedAt: Date, deletedAt: Date }, { timestamps: true });

const MessageSchema = new Schema({ conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true }, tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true }, role: { type: String, enum: ["user", "assistant", "system"], required: true }, content: { type: String, required: true }, metadata: { tokensUsed: Number, responseTime: Number, documentsReferenced: [String], sources: [String] }, eventType: { type: String, enum: ["message", "escalation", "ticket_created", "human_joined"], default: "message" } }, { timestamps: { createdAt: true, updatedAt: false } });

const TicketSchema = new Schema({ tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true }, conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" }, ticketNumber: { type: String, required: true }, customerName: String, customerEmail: String, subject: { type: String, required: true }, description: { type: String, required: true }, priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "low" }, status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open" }, assignedTo: { type: Schema.Types.ObjectId, ref: "User" }, tags: [String], notes: [{ body: String, author: { type: Schema.Types.ObjectId, ref: "User" }, createdAt: { type: Date, default: Date.now } }], resolvedAt: Date }, { timestamps: true });
TicketSchema.index({ tenantId: 1, ticketNumber: 1 }, { unique: true });
TicketSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export const Tenant: Model<any> = (mongoose.models.Tenant as Model<any>) || model("Tenant", TenantSchema);
export const User: Model<any> = (mongoose.models.User as Model<any>) || model("User", UserSchema);
// Pinned to the legacy "botconfigs" collection so existing single-bot rows become
// each tenant's first bot without any data movement.
export const Bot: Model<any> = (mongoose.models.Bot as Model<any>) || model("Bot", BotSchema, "botconfigs");
export const Document: Model<any> = (mongoose.models.Document as Model<any>) || model("Document", DocumentSchema);
export const Conversation: Model<any> = (mongoose.models.Conversation as Model<any>) || model("Conversation", ConversationSchema);
export const Message: Model<any> = (mongoose.models.Message as Model<any>) || model("Message", MessageSchema);
export const Ticket: Model<any> = (mongoose.models.Ticket as Model<any>) || model("Ticket", TicketSchema);
