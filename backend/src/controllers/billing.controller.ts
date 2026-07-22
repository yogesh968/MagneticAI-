import type { Request, Response } from "express";
import { Tenant } from "../models/index.js";
import { getUsageSummary } from "../services/usage.service.js";
import { PLAN_LIMITS, PLAN_ORDER, PLAN_PRICES_INR, RAZORPAY_PLAN_IDS, isValidPlan, type PlanId } from "../config/plans.js";
import { env } from "../config/env.js";
import { isRazorpayConfigured, razorpay } from "../config/razorpay.js";

const cap = (n: number) => (Number.isFinite(n) ? n : null);

/** Current plan + live usage + the full plan catalogue for the Billing page. */
export async function billingSummary(req: Request, res: Response) {
  const summary = await getUsageSummary(String(req.tenantId));
  const plans = PLAN_ORDER.map((id) => ({
    id,
    priceInr: PLAN_PRICES_INR[id],
    limits: {
      messagesPerMonth: cap(PLAN_LIMITS[id].messagesPerMonth),
      bots: cap(PLAN_LIMITS[id].bots),
      seats: cap(PLAN_LIMITS[id].seats),
      docs: cap(PLAN_LIMITS[id].docs),
      unbranded: PLAN_LIMITS[id].unbranded,
    },
    // Purchasable only once a matching Razorpay Plan id is configured.
    purchasable: (id === "starter" || id === "pro") && Boolean(RAZORPAY_PLAN_IDS[id]),
  }));
  res.json({ ...summary, plans });
}

/** Publishable key the frontend needs to open Razorpay Checkout. */
export function billingConfig(_req: Request, res: Response) {
  res.json({ keyId: env.RAZORPAY_KEY_ID ?? null, configured: isRazorpayConfigured() });
}

/**
 * Creates a Razorpay subscription with notes.tenantId — the missing half of the
 * loop. The existing webhook already reads notes.tenantId, so activation flows
 * back automatically once the customer completes Checkout (blueprint B4).
 */
export async function subscribe(req: Request, res: Response) {
  const plan = String(req.body.plan) as PlanId;
  if (!isValidPlan(plan) || plan === "free" || plan === "enterprise") {
    return res.status(400).json({ message: "Choose a purchasable plan (starter or pro)." });
  }
  const planId = RAZORPAY_PLAN_IDS[plan];
  if (!planId) return res.status(400).json({ message: `The ${plan} plan is not available for checkout yet.` });
  if (!isRazorpayConfigured()) return res.status(503).json({ message: "Billing is not configured." });

  const tenant = await Tenant.findById(req.tenantId).lean<any>();
  if (!tenant) return res.status(404).json({ message: "Tenant not found" });

  // total_count is the number of billing cycles Razorpay will attempt; 120
  // monthly cycles ≈ open-ended. notes.tenantId is what the webhook keys on.
  const sub = await razorpay().subscriptions.create({
    plan_id: planId,
    total_count: 120,
    customer_notify: 1,
    notes: { tenantId: String(tenant._id), plan },
  });

  // Record the intent so the webhook (and cancel) can find this tenant by sub id
  // even if notes ever go missing. plan itself flips only on webhook activation.
  await Tenant.updateOne({ _id: tenant._id }, { razorpaySubscriptionId: sub.id, razorpayPlanId: planId });

  res.status(201).json({ subscriptionId: sub.id, shortUrl: sub.short_url ?? null, planId });
}

/** Cancel at cycle end — the tenant keeps what they paid for until it lapses. */
export async function cancelSubscription(req: Request, res: Response) {
  const tenant = await Tenant.findById(req.tenantId).lean<any>();
  if (!tenant?.razorpaySubscriptionId) return res.status(400).json({ message: "No active subscription to cancel." });
  if (isRazorpayConfigured()) {
    // second arg = cancelAtCycleEnd
    await razorpay().subscriptions.cancel(tenant.razorpaySubscriptionId, true)
      .catch((e: any) => console.error("[billing] Razorpay cancel failed:", e?.message ?? e));
  }
  await Tenant.updateOne({ _id: tenant._id }, { subscriptionStatus: "cancelled" });
  res.json({ message: "Your subscription will end when the current billing cycle finishes." });
}
