import type { Request, Response } from "express";
import { mkdir, unlink } from "node:fs/promises";
import { Bot, Document } from "../models/index.js";
import { collectionName, qdrant } from "../config/qdrant.js";
import { processDocument } from "../services/document.service.js";
import { uploadDir } from "../utils/upload-path.js";

/** Resolves the target bot, always scoped to the caller's tenant. */
async function resolveBot(req: Request, botId?: string) {
  if (botId) return Bot.findOne({ _id: botId, tenantId: req.tenantId }).lean<any>();
  // No bot named — fall back to the tenant's default so single-bot tenants and
  // older clients keep working.
  return Bot.findOne({ tenantId: req.tenantId, isDefault: true }).lean<any>();
}

export async function upload(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ message: "A supported file is required" });

  const bot = await resolveBot(req, req.body.botId);
  if (!bot) {
    await unlink(req.file.path).catch(() => undefined);
    return res.status(400).json({ message: "No bot selected. Create a bot before uploading documents." });
  }

  await mkdir(uploadDir, { recursive: true });
  const type = req.file.originalname.split(".").pop()!.toLowerCase();
  const document = await Document.create({
    tenantId: req.tenantId,
    botId: bot._id,
    name: req.file.originalname,
    type,
    originalUrl: req.file.path,
    uploadedBy: req.user!.id,
    metadata: { size: req.file.size },
  });
  void processDocument({
    documentId: String(document._id),
    tenantId: String(req.tenantId),
    botId: String(bot._id),
    path: req.file.path,
    type,
  });
  res.status(202).json(document);
}

export async function listDocuments(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Number(req.query.limit) || 20);
  // Filter by bot when asked; otherwise list the whole tenant's documents so the
  // KB page can show an "All bots" view.
  const filter: Record<string, unknown> = { tenantId: req.tenantId };
  if (req.query.botId) filter.botId = req.query.botId;

  const [items, total] = await Promise.all([
    Document.find(filter).populate("botId", "botName").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Document.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}

export async function getDocument(req: Request, res: Response) {
  const item = await Document.findOne({ _id: req.params.id, tenantId: req.tenantId }).populate("botId", "botName");
  if (!item) return res.status(404).json({ message: "Document not found" });
  res.json(item);
}

export async function deleteDocument(req: Request, res: Response) {
  const item = await Document.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
  if (!item) return res.status(404).json({ message: "Document not found" });
  await qdrant.delete(collectionName(String(req.tenantId)), { wait: true, filter: { must: [{ key: "documentId", match: { value: String(item._id) } }] } }).catch(() => undefined);
  await unlink(item.originalUrl).catch(() => undefined);
  res.status(204).end();
}

export async function reindex(req: Request, res: Response) {
  const filter: Record<string, unknown> = { tenantId: req.tenantId };
  if (req.body?.botId) filter.botId = req.body.botId;

  const documents = await Document.find(filter);
  documents.forEach((doc) => void processDocument({
    documentId: String(doc._id),
    tenantId: String(req.tenantId),
    botId: String(doc.botId),
    path: doc.originalUrl,
    type: doc.type,
  }));
  res.status(202).json({ message: `Re-indexing ${documents.length} documents` });
}
