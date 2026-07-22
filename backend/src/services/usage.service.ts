import { Bot, Document, Tenant, User } from "../models/index.js";
import { PLAN_LIMITS, type PlanId } from "../config/plans.js";

const MS_PER_DAY = 86_400_000;
// A billing "month" is a fixed 30-day window from periodStart — predictable and
// enough for a soft usage meter; exact calendar months add complexity for no gain.
const PERIOD_MS = 30 * MS_PER_DAY;

function planOf(tenant: any): PlanId {
  return (tenant?.plan && tenant.plan in PLAN_LIMITS ? tenant.plan : "free") as PlanId;
}

/**
 * An aggregation-pipeline update that (a) rolls the usage period over if the
 * 30-day window has elapsed, resetting the counters, and (b) adds this call's
 * deltas — both in ONE atomic write, so concurrent messages can't lose an
 * increment or double a rollover. `$$NOW` is the server clock at write time.
 */
function usagePipeline(incMessages: number, incTokens: number) {
  return [
    {
      $set: {
        __elapsed: {
          $gte: [
            { $subtract: ["$$NOW", { $ifNull: ["$usage.periodStart", "$$NOW"] }] },
            PERIOD_MS,
          ],
        },
      },
    },
    {
      $set: {
        "usage.periodStart": { $cond: ["$__elapsed", "$$NOW", { $ifNull: ["$usage.periodStart", "$$NOW"] }] },
        "usage.messagesUsed": { $add: [{ $cond: ["$__elapsed", 0, { $ifNull: ["$usage.messagesUsed", 0] }] }, incMessages] },
        "usage.tokensUsed": { $add: [{ $cond: ["$__elapsed", 0, { $ifNull: ["$usage.tokensUsed", 0] }] }, incTokens] },
      },
    },
    { $unset: "__elapsed" },
  ];
}

/** Increment the tenant's period counters (rolling the period over first if due). */
export async function recordUsage(tenantId: string, delta: { messages?: number; tokens?: number }) {
  await Tenant.updateOne({ _id: tenantId }, usagePipeline(delta.messages ?? 0, delta.tokens ?? 0));
}

/**
 * Apply any pending rollover and return the values the quota gate compares
 * against. Doing the rollover here means a brand-new billing period is already
 * reset by the time we read messagesUsed, so the first message of a new month is
 * never wrongly blocked.
 */
export async function loadUsageForCheck(tenantId: string): Promise<{ plan: PlanId; messagesUsed: number }> {
  const tenant = await Tenant.findOneAndUpdate({ _id: tenantId }, usagePipeline(0, 0), { new: true })
    .select("plan usage")
    .lean<any>();
  return { plan: planOf(tenant), messagesUsed: tenant?.usage?.messagesUsed ?? 0 };
}

export interface UsageSummary {
  plan: PlanId;
  limits: { messagesPerMonth: number | null; bots: number | null; seats: number | null; docs: number | null; unbranded: boolean };
  usage: { messagesUsed: number; tokensUsed: number; periodStart: string; periodEnds: string; docsCount: number; botsCount: number; seatsUsed: number };
  subscriptionStatus: string;
  gracePeriodEnds: string | null;
}

/** Everything the Billing page needs: plan, limits, and current usage. Docs/bots/
 *  seats are counted live from their collections so they never drift. `null` in a
 *  limit means unlimited (Infinity does not survive JSON). */
export async function getUsageSummary(tenantId: string): Promise<UsageSummary> {
  // Roll the period over on read too, so an idle tenant's numbers are current.
  const { plan } = await loadUsageForCheck(tenantId);
  const tenant = await Tenant.findById(tenantId).select("plan usage subscriptionStatus gracePeriodEnds").lean<any>();
  const [docsCount, botsCount, seatsUsed] = await Promise.all([
    Document.countDocuments({ tenantId }),
    Bot.countDocuments({ tenantId }),
    User.countDocuments({ tenantId }),
  ]);
  const start = tenant?.usage?.periodStart ? new Date(tenant.usage.periodStart) : new Date();
  const limits = PLAN_LIMITS[plan];
  const cap = (n: number) => (Number.isFinite(n) ? n : null);
  return {
    plan,
    limits: {
      messagesPerMonth: cap(limits.messagesPerMonth),
      bots: cap(limits.bots),
      seats: cap(limits.seats),
      docs: cap(limits.docs),
      unbranded: limits.unbranded,
    },
    usage: {
      messagesUsed: tenant?.usage?.messagesUsed ?? 0,
      tokensUsed: tenant?.usage?.tokensUsed ?? 0,
      periodStart: start.toISOString(),
      periodEnds: new Date(start.getTime() + PERIOD_MS).toISOString(),
      docsCount,
      botsCount,
      seatsUsed,
    },
    subscriptionStatus: tenant?.subscriptionStatus ?? "none",
    gracePeriodEnds: tenant?.gracePeriodEnds ? new Date(tenant.gracePeriodEnds).toISOString() : null,
  };
}

/** True when the tenant is under a numeric limit for a countable resource. */
export async function withinResourceLimit(tenantId: string, resource: "docs" | "bots"): Promise<{ ok: boolean; limit: number; used: number }> {
  const tenant = await Tenant.findById(tenantId).select("plan").lean<any>();
  const plan = planOf(tenant);
  const limit = PLAN_LIMITS[plan][resource];
  if (!Number.isFinite(limit)) return { ok: true, limit, used: 0 };
  const used = resource === "docs"
    ? await Document.countDocuments({ tenantId })
    : await Bot.countDocuments({ tenantId });
  return { ok: used < limit, limit, used };
}
