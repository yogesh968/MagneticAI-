import type { Request, Response } from "express";
import crypto from "node:crypto";
import { Tenant } from "../models/index.js";
import { env } from "../config/env.js";
import { tierForRazorpayPlan } from "../config/plans.js";
import { sendDunningEmail } from "../services/dunning.service.js";

const graceMs = () => env.GRACE_PERIOD_DAYS * 86_400_000;

export async function razorpayWebhook(req: Request, res: Response) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[payment] RAZORPAY_WEBHOOK_SECRET is not configured");
    return res.status(500).send("Webhook secret not configured");
  }

  const signature = req.headers["x-razorpay-signature"] as string;
  if (!signature) return res.status(400).send("Missing signature");

  // express.json() saved the raw body so the HMAC is computed over exactly what
  // Razorpay signed (re-serialising req.body could differ byte-for-byte).
  const payloadString = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);
  const expected = crypto.createHmac("sha256", secret).update(payloadString).digest("hex");

  // Constant-time compare — a plain !== leaks timing about the expected digest.
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    console.error("[payment] Invalid Razorpay signature");
    return res.status(400).send("Invalid signature");
  }

  const { event, payload } = req.body;
  if (!event || !payload) return res.status(400).send("Invalid payload");

  try {
    const entity = payload.subscription?.entity;
    const subId: string | undefined = entity?.id;
    const planId: string | undefined = entity?.plan_id;

    // Prefer the tenantId we injected at subscription creation; fall back to the
    // subscription id we stored, so activation still resolves if notes are absent.
    const resolveTenantId = async (): Promise<string | undefined> => {
      if (entity?.notes?.tenantId) return String(entity.notes.tenantId);
      if (subId) {
        const t = await Tenant.findOne({ razorpaySubscriptionId: subId }).select("_id").lean<any>();
        return t?._id ? String(t._id) : undefined;
      }
      return undefined;
    };

    switch (event) {
      case "subscription.activated":
      case "subscription.charged":
      case "subscription.authenticated": {
        const tenantId = await resolveTenantId();
        if (tenantId) {
          const tier = tierForRazorpayPlan(planId);
          // Idempotent set: replaying activated/charged just re-asserts the same
          // state. Clearing gracePeriodEnds recovers a tenant that had lapsed.
          await Tenant.findByIdAndUpdate(tenantId, {
            isActive: true,
            subscriptionStatus: "active",
            razorpaySubscriptionId: subId,
            ...(tier ? { plan: tier } : {}),
            ...(planId ? { razorpayPlanId: planId } : {}),
            $unset: { gracePeriodEnds: "" },
          });
          console.log(`[payment] Tenant ${tenantId} → active${tier ? ` (${tier})` : ""}`);
        }
        break;
      }

      case "subscription.halted":
      case "subscription.paused":
      case "subscription.cancelled": {
        const tenantId = await resolveTenantId();
        if (tenantId) {
          // Grace, not a kill-switch: keep serving the live widget for N days and
          // warn, rather than dropping the client's end-users mid-conversation
          // (blueprint A6). The createSession gate disables only after grace ends.
          const status = event === "subscription.cancelled" ? "cancelled" : "past_due";
          const gracePeriodEnds = new Date(Date.now() + graceMs());
          const tenant = await Tenant.findByIdAndUpdate(
            tenantId,
            { subscriptionStatus: status, gracePeriodEnds },
            { new: true },
          ).select("name email").lean<any>();
          console.log(`[payment] Tenant ${tenantId} → ${status}, grace until ${gracePeriodEnds.toISOString()}`);
          if (tenant?.email) {
            void sendDunningEmail(tenant.email, { tenantName: tenant.name, status, gracePeriodEnds });
          }
        }
        break;
      }

      default:
        console.log(`[payment] Unhandled webhook event: ${event}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[payment] Webhook processing error:", error);
    res.status(500).send("Internal Server Error");
  }
}
