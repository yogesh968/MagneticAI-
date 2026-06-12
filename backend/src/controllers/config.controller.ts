import type { Request, Response } from "express";
import { BotConfig, Tenant } from "../models/index.js";
import { answerWithRag } from "../services/rag.service.js";

export async function getBotConfig(req: Request, res: Response) {
  const config = await BotConfig.findOne({ tenantId: req.tenantId });
  if (!config) return res.status(404).json({ message: "Bot configuration not found" });
  res.json(config);
}

export async function updateBotConfig(req: Request, res: Response) {
  // Ensure settings sub-doc always exists
  const update = { ...req.body };
  if (update.settings) {
    update["settings.widgetColor"] = update.settings.widgetColor;
    update["settings.widgetPosition"] = update.settings.widgetPosition;
    delete update.settings;
  }
  res.json(await BotConfig.findOneAndUpdate(
    { tenantId: req.tenantId },
    { $set: update },
    { new: true, upsert: true, runValidators: true },
  ));
}

export async function testBot(req: Request, res: Response) {
  res.json(await answerWithRag(String(req.tenantId), req.body.question));
}

export async function getWidgetConfig(req: Request, res: Response) {
  const [config, tenant] = await Promise.all([
    BotConfig.findOne({ tenantId: req.params.tenantId, isActive: true }).lean<any>(),
    Tenant.findById(req.params.tenantId).lean<any>(),
  ]);
  if (!config || !tenant) return res.status(404).json({ message: "Widget not found" });
  // Merge settings — use defaults if either is missing
  const defaultSettings = { widgetColor: "#2563eb", widgetPosition: "bottom-right" };
  const settings = { ...defaultSettings, ...(tenant.settings ?? {}), ...(config.settings ?? {}) };
  res.json({ ...config, businessName: tenant.name, settings });
}
