import type { Request, Response } from "express";
import { unlink } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Document } from "../models/index.js";
import { collectionName, qdrant } from "../config/qdrant.js";
import { processDocument } from "../services/document.service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? resolve(__dirname, "../../uploads");

export async function upload(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ message: "A supported file is required" });
  await mkdir(UPLOAD_DIR, { recursive: true });
  const type = req.file.originalname.split(".").pop()!.toLowerCase();
  const document = await Document.create({ tenantId: req.tenantId, name: req.file.originalname, type, originalUrl: req.file.path, uploadedBy: req.user!.id, metadata: { size: req.file.size } });
  void processDocument(String(document._id), String(req.tenantId), req.file.path, type);
  res.status(202).json(document);
}

export async function listDocuments(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Number(req.query.limit) || 20);
  const [items, total] = await Promise.all([Document.find({ tenantId: req.tenantId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Document.countDocuments({ tenantId: req.tenantId })]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}

export async function getDocument(req: Request, res: Response) {
  const item = await Document.findOne({ _id: req.params.id, tenantId: req.tenantId });
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
  const documents = await Document.find({ tenantId: req.tenantId });
  documents.forEach((doc) => void processDocument(String(doc._id), String(req.tenantId), doc.originalUrl, doc.type));
  res.status(202).json({ message: `Re-indexing ${documents.length} documents` });
}
