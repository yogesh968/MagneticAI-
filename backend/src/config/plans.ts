import { env } from "./env.js";

export type PlanId = "free" | "starter" | "pro" | "enterprise";

export interface PlanLimits {
  /** Answered messages per billing month. Infinity = unmetered (enterprise). */
  messagesPerMonth: number;
  bots: number;
  seats: number;
  docs: number;
  /** Whether the tenant may remove the "powered by" widget branding. */
  unbranded: boolean;
}

/**
 * The commercial contract, in code. These numbers are what checkQuota enforces
 * and what the Billing UI advertises — tune them against real per-message cost
 * (aggregate usage.tokensUsed first) before publishing prices. A plan that loses
 * money on every heavy user is worse than no plan (blueprint B1).
 */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:       { messagesPerMonth: 100,      bots: 1,        seats: 1,        docs: 3,        unbranded: false },
  starter:    { messagesPerMonth: 2000,     bots: 2,        seats: 3,        docs: 25,       unbranded: true  },
  pro:        { messagesPerMonth: 10000,    bots: 5,        seats: 10,       docs: 100,      unbranded: true  },
  enterprise: { messagesPerMonth: Infinity, bots: Infinity, seats: Infinity, docs: Infinity, unbranded: true  },
};

/** Monthly list price in INR (paise are handled by Razorpay's Plan). */
export const PLAN_PRICES_INR: Record<PlanId, number> = { free: 0, starter: 1499, pro: 4999, enterprise: 0 };

/** Display order for the plan cards, cheapest first. */
export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "enterprise"];

/**
 * Razorpay Plan ids for the paid tiers, created in the Razorpay dashboard and
 * supplied via env. Empty until the account is set up — /billing/subscribe 400s
 * for a tier whose id is missing rather than calling Razorpay with a blank plan.
 */
export const RAZORPAY_PLAN_IDS: Partial<Record<PlanId, string>> = {
  ...(env.RAZORPAY_PLAN_STARTER ? { starter: env.RAZORPAY_PLAN_STARTER } : {}),
  ...(env.RAZORPAY_PLAN_PRO ? { pro: env.RAZORPAY_PLAN_PRO } : {}),
};

/** Reverse-map a Razorpay plan id back to our tier so the webhook can set plan. */
export function tierForRazorpayPlan(planId?: string): PlanId | undefined {
  if (!planId) return undefined;
  return (Object.entries(RAZORPAY_PLAN_IDS) as Array<[PlanId, string]>)
    .find(([, id]) => id === planId)?.[0];
}

export const isValidPlan = (p: string): p is PlanId => p in PLAN_LIMITS;

/** The pure gating decision behind checkQuota — true when a finite plan limit is
 *  met or exceeded. Enterprise (Infinity) is never over. Kept separate from the
 *  middleware so it is unit-testable without a database. */
export function isOverMessageLimit(plan: PlanId, used: number): boolean {
  const limit = PLAN_LIMITS[plan].messagesPerMonth;
  return Number.isFinite(limit) && used >= limit;
}
