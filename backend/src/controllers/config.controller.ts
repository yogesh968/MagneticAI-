import type { Request, Response } from "express";
import { BotConfig, Tenant } from "../models/index.js";
import { answerWithRag } from "../services/rag.service.js";

export async function getBotConfig(req: Request, res: Response) {
  const config = await BotConfig.findOne({ tenantId: req.tenantId });
  if (!config) return res.status(404).json({ message: "Bot configuration not found" });
  res.json(config);
}

export async function updateBotConfig(req: Request, res: Response) {
  res.json(await BotConfig.findOneAndUpdate({ tenantId: req.tenantId }, req.body, { new: true, upsert: true, runValidators: true }));
}

export async function testBot(req: Request, res: Response) {
  res.json(await answerWithRag(String(req.tenantId), req.body.question));
}

export async function getWidgetConfig(req: Request, res: Response) {
  const [config, tenant] = await Promise.all([BotConfig.findOne({ tenantId: req.params.tenantId, isActive: true }).lean<any>(), Tenant.findById(req.params.tenantId).lean<any>()]);
  if (!config || !tenant) return res.status(404).json({ message: "Widget not found" });
  // Merge settings: BotConfig.settings takes priority over Tenant.settings
  const settings = { ...(tenant.settings ?? {}), ...(config.settings ?? {}) };
  res.json({ ...config, businessName: tenant.name, settings });
}
