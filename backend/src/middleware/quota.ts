import type { NextFunction, Request, Response } from "express";
import { isOverMessageLimit } from "../config/plans.js";
import { loadUsageForCheck } from "../services/usage.service.js";

/**
 * Per-tenant monthly message ceiling, checked before AI generation on the public
 * chat route — the aggregate cap the per-session/IP rate limits can't provide (a
 * determined caller just opens more sessions). This is also the meter that makes
 * tiers sellable (blueprint A3/B3).
 *
 * On exceed we return HTTP 402 with a machine-readable code. The message is
 * neutral because it is shown to the tenant's END-CUSTOMER in the widget, not to
 * the tenant owner — the "upgrade" prompt belongs on the owner's Billing page.
 * Fails OPEN: a metering error must never take a client's live widget down.
 */
export async function checkQuota(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.session?.tenantId;
  if (!tenantId) return res.status(401).json({ message: "Session token required" });
  try {
    const { plan, messagesUsed } = await loadUsageForCheck(tenantId);
    if (isOverMessageLimit(plan, messagesUsed)) {
      return res.status(402).json({
        code: "quota_exceeded",
        message: "This assistant has reached its message limit for now. Please check back later.",
      });
    }
    next();
  } catch (err) {
    console.error("[quota] check failed, allowing through:", err);
    next();
  }
}
