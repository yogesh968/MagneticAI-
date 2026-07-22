import type { Request, Response } from "express";
import { Bot, Conversation, Document, Tenant } from "../models/index.js";
import { collectionName, qdrant } from "../config/qdrant.js";
import { answerWithRag } from "../services/rag.service.js";
import { storage } from "../services/storage/index.js";
import { withinResourceLimit } from "../services/usage.service.js";

/** Document counts per bot, so the UI can show what each bot actually knows. */
async function withCounts(tenantId: unknown, bots: any[]) {
  if (bots.length === 0) return [];
  const counts = await Document.aggregate([
    { $match: { tenantId, botId: { $in: bots.map((b) => b._id) } } },
    { $group: { _id: "$botId", total: { $sum: 1 }, indexed: { $sum: { $cond: [{ $eq: ["$status", "indexed"] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }, chunks: { $sum: "$chunkCount" } } },
  ]);
  const byBot = new Map(counts.map((c) => [String(c._id), c]));
  return bots.map((b) => {
    const c = byBot.get(String(b._id));
    return {
      ...b,
      documentCount: c?.total ?? 0,
      indexedCount: c?.indexed ?? 0,
      failedCount: c?.failed ?? 0,
      chunkCount: c?.chunks ?? 0,
    };
  });
}

export async function listBots(req: Request, res: Response) {
  const bots = await Bot.find({ tenantId: req.tenantId }).sort({ isDefault: -1, createdAt: 1 }).lean<any[]>();
  res.json(await withCounts(req.tenantId, bots));
}

export async function getBot(req: Request, res: Response) {
  const bot = await Bot.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean<any>();
  if (!bot) return res.status(404).json({ message: "Bot not found" });
  res.json((await withCounts(req.tenantId, [bot]))[0]);
}

export async function createBot(req: Request, res: Response) {
  // Plan bot ceiling.
  const quota = await withinResourceLimit(String(req.tenantId), "bots");
  if (!quota.ok) {
    return res.status(402).json({ code: "quota_exceeded", message: `Your plan allows ${quota.limit} bot${quota.limit === 1 ? "" : "s"}. Upgrade your plan to add more.` });
  }

  // The tenant's very first bot becomes the default, so the widget always has
  // something to fall back to.
  const isFirst = !(await Bot.exists({ tenantId: req.tenantId }));
  const bot = await Bot.create({ ...req.body, tenantId: req.tenantId, isDefault: isFirst });
  res.status(201).json(bot);
}

export async function updateBot(req: Request, res: Response) {
  const update = { ...req.body };
  // Never let isDefault be flipped here — setDefaultBot owns that transition
  // because unsetting the previous default has to happen in the same operation.
  delete update.isDefault;
  delete update.tenantId;

  const bot = await Bot.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!bot) return res.status(404).json({ message: "Bot not found" });
  res.json(bot);
}

export async function setDefaultBot(req: Request, res: Response) {
  const bot = await Bot.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!bot) return res.status(404).json({ message: "Bot not found" });
  if (bot.isDefault) return res.json(bot);

  // Clear the old default first: a unique partial index allows only one per
  // tenant, so setting the new one first would collide.
  await Bot.updateOne({ tenantId: req.tenantId, isDefault: true }, { $set: { isDefault: false } });
  bot.isDefault = true;
  await bot.save();
  res.json(bot);
}

export async function deleteBot(req: Request, res: Response) {
  const bot = await Bot.findOne({ _id: req.params.id, tenantId: req.tenantId });
  if (!bot) return res.status(404).json({ message: "Bot not found" });

  const remaining = await Bot.countDocuments({ tenantId: req.tenantId });
  if (remaining <= 1) {
    return res.status(409).json({ message: "You cannot delete your only bot." });
  }
  if (bot.isDefault) {
    return res.status(409).json({ message: "Make another bot the default before deleting this one." });
  }

  // Take the bot's documents and vectors with it, otherwise its chunks stay in
  // the tenant's Qdrant collection forever and its files leak on disk.
  const documents = await Document.find({ botId: bot._id, tenantId: req.tenantId }).lean<any[]>();
  await qdrant
    .delete(collectionName(String(req.tenantId)), {
      wait: true,
      filter: { must: [{ key: "botId", match: { value: String(bot._id) } }] },
    })
    .catch((e) => console.error("[bot] failed to delete vectors for bot", String(bot._id), e));
  await Promise.all(documents.map((d) => storage.remove(d.originalUrl)));
  await Document.deleteMany({ botId: bot._id, tenantId: req.tenantId });

  // Conversations are history — keep them, just detach the bot.
  await Conversation.updateMany({ botId: bot._id, tenantId: req.tenantId }, { $unset: { botId: "" } });
  await bot.deleteOne();

  res.status(204).end();
}

/** Ask a bot a question from the dashboard, using only that bot's knowledge. */
export async function testBot(req: Request, res: Response) {
  const bot = await Bot.findOne({ _id: req.params.id, tenantId: req.tenantId }).select("_id").lean<any>();
  if (!bot) return res.status(404).json({ message: "Bot not found" });
  res.json(await answerWithRag({ tenantId: String(req.tenantId), botId: String(bot._id) }, req.body.question));
}

/**
 * Public — the widget calls this to render itself. Explicit whitelist: the full
 * document would leak escalationRules to any customer domain.
 */
export async function getWidgetConfig(req: Request, res: Response) {
  const bot = await Bot.findOne({ _id: req.params.botId, isActive: true }).lean<any>();
  if (!bot) return res.status(404).json({ message: "Widget not found" });
  const tenant = await Tenant.findOne({ _id: bot.tenantId, isActive: true }).lean<any>();
  if (!tenant) return res.status(404).json({ message: "Widget not found" });

  const defaults = { widgetColor: "#2563eb", widgetPosition: "bottom-right" };
  res.json({
    botId: String(bot._id),
    tenantId: String(bot.tenantId),
    botName: bot.botName,
    welcomeMessage: bot.welcomeMessage,
    suggestedQuestions: bot.suggestedQuestions ?? [],
    businessName: tenant.name,
    settings: { ...defaults, ...(tenant.settings ?? {}), ...(bot.settings ?? {}) },
  });
}

/** Back-compat: resolves a tenant's default bot for embeds that predate botId. */
export async function getDefaultWidgetConfig(req: Request, res: Response) {
  const bot = await Bot.findOne({ tenantId: req.params.tenantId, isDefault: true, isActive: true }).select("_id").lean<any>();
  if (!bot) return res.status(404).json({ message: "Widget not found" });
  req.params.botId = String(bot._id);
  return getWidgetConfig(req, res);
}
