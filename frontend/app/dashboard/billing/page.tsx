"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, ButtonSecondary, Badge, PageHeader, UsageBar } from "@/components/ui";
import { Check, CreditCard, Zap, AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type PlanId = "free" | "starter" | "pro" | "enterprise";

type PlanLimits = {
  messagesPerMonth: number | null;
  bots: number | null;
  seats: number | null;
  docs: number | null;
  unbranded: boolean;
};

type Summary = {
  plan: PlanId;
  limits: PlanLimits;
  usage: {
    messagesUsed: number;
    tokensUsed: number;
    periodStart: string;
    periodEnds: string;
    docsCount: number;
    botsCount: number;
    seatsUsed: number;
  };
  subscriptionStatus: string;
  gracePeriodEnds: string | null;
  plans: Array<{ id: PlanId; priceInr: number; limits: PlanLimits; purchasable: boolean }>;
};

const PLAN_LABEL: Record<PlanId, string> = { free: "Free", starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
const PLAN_TONE: Record<PlanId, string> = { free: "slate", starter: "blue", pro: "green", enterprise: "neutral" };

const fmt = (n: number | null) => (n == null ? "Unlimited" : n.toLocaleString());

/** Injects Razorpay Checkout once, resolving false if it can't load. */
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function BillingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [keyId, setKeyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<PlanId | "cancel" | null>(null);

  const load = useCallback(() => {
    return Promise.all([api.get("/billing/summary"), api.get("/billing/config")])
      .then(([s, c]) => {
        setSummary(s.data);
        setKeyId(c.data.keyId ?? null);
      })
      .catch(() => toast.error("Failed to load billing"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upgrade = async (plan: PlanId) => {
    if (busy) return;
    setBusy(plan);
    try {
      const ok = await loadRazorpay();
      if (!ok || !keyId) {
        toast.error("Checkout is unavailable right now.");
        return;
      }
      const { data } = await api.post("/billing/subscribe", { plan });
      const rzp = new (window as any).Razorpay({
        key: keyId,
        subscription_id: data.subscriptionId,
        name: "Astrex.ai",
        description: `${PLAN_LABEL[plan]} plan`,
        theme: { color: "#4453D6" },
        handler: () => {
          // Activation is confirmed asynchronously by the Razorpay webhook.
          toast.success("Payment received — activating your plan…");
          setTimeout(() => load(), 2500);
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.on("payment.failed", () => toast.error("Payment failed. Please try again."));
      rzp.open();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Could not start checkout.");
    } finally {
      setBusy((b) => (b === plan ? null : b));
    }
  };

  const cancel = async () => {
    if (busy) return;
    if (!confirm("Cancel your subscription at the end of the current billing cycle?")) return;
    setBusy("cancel");
    try {
      const { data } = await api.post("/billing/cancel");
      toast.success(data.message ?? "Subscription cancelled.");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Could not cancel.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="p-7 space-y-5">
        <div className="anim-up">
          <div className="skeleton h-8 w-40 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="skeleton h-44 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className={`skeleton h-64 rounded-2xl d${i + 1}`} />)}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const { plan, limits, usage } = summary;
  const lapsed = summary.subscriptionStatus === "past_due" || summary.subscriptionStatus === "cancelled";
  const grace = summary.gracePeriodEnds ? new Date(summary.gracePeriodEnds) : null;

  return (
    <div className="p-7 space-y-6">
      <PageHeader title="Billing" subtitle="Manage your plan, usage, and payments" />

      {/* Lapse / grace banner */}
      {lapsed && grace && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4 anim-up">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-semibold text-ink">Your subscription is {summary.subscriptionStatus.replace("_", " ")}.</p>
            <p className="mt-0.5 text-ink-muted">
              Your assistant keeps running until {grace.toLocaleDateString()}. Renew before then to avoid interruption.
            </p>
          </div>
        </div>
      )}

      {/* Current plan + usage */}
      <div className="card anim-up d1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="section-title">Current plan</span>
              <Badge tone={PLAN_TONE[plan]}>{PLAN_LABEL[plan]}</Badge>
              {summary.subscriptionStatus === "active" && <Badge tone="green">Active</Badge>}
            </div>
            <p className="mt-1 text-xs text-ink-faint">
              Billing period resets {new Date(usage.periodEnds).toLocaleDateString()}
            </p>
          </div>
          {summary.subscriptionStatus === "active" && (
            <ButtonSecondary onClick={cancel} disabled={busy === "cancel"}>
              {busy === "cancel" ? <Loader2 size={15} className="animate-spin" /> : "Cancel plan"}
            </ButtonSecondary>
          )}
        </div>

        {/* Messages meter */}
        <div className="mt-6">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-mono text-[10.5px] font-medium uppercase tracking-[.16em] text-ink-muted">Messages this month</span>
            <span className="text-sm font-semibold text-ink tabular-nums">
              {usage.messagesUsed.toLocaleString()}
              <span className="text-ink-faint"> / {fmt(limits.messagesPerMonth)}</span>
            </span>
          </div>
          <UsageBar used={usage.messagesUsed} limit={limits.messagesPerMonth} />
        </div>

        {/* Resource counts */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Meter label="Bots" used={usage.botsCount} limit={limits.bots} />
          <Meter label="Seats" used={usage.seatsUsed} limit={limits.seats} />
          <Meter label="Documents" used={usage.docsCount} limit={limits.docs} />
          <div>
            <p className="font-mono text-[10.5px] font-medium uppercase tracking-[.16em] text-ink-muted">Tokens used</p>
            <p className="mt-1.5 font-tight text-xl font-bold text-ink tabular-nums">{usage.tokensUsed.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Plan catalogue */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.plans.map((p, i) => {
          const current = p.id === plan;
          return (
            <div
              key={p.id}
              className={`anim-up d${i + 1} relative flex flex-col rounded-2xl border bg-white p-5 ${
                current ? "border-accent-300 shadow-accent" : "border-hairline"
              }`}
            >
              {current && (
                <span className="absolute right-4 top-4">
                  <Badge tone="blue">Current</Badge>
                </span>
              )}
              <p className="font-tight text-lg font-bold text-ink">{PLAN_LABEL[p.id]}</p>
              <p className="mt-1 font-tight text-[28px] font-extrabold leading-none text-ink">
                {p.id === "enterprise" ? "Custom" : p.priceInr === 0 ? "Free" : `₹${p.priceInr.toLocaleString()}`}
                {p.priceInr > 0 && p.id !== "enterprise" && <span className="text-sm font-medium text-ink-faint">/mo</span>}
              </p>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-soft">
                <Feature>{fmt(p.limits.messagesPerMonth)} messages / mo</Feature>
                <Feature>{fmt(p.limits.bots)} bot{p.limits.bots === 1 ? "" : "s"}</Feature>
                <Feature>{fmt(p.limits.seats)} team seat{p.limits.seats === 1 ? "" : "s"}</Feature>
                <Feature>{fmt(p.limits.docs)} documents</Feature>
                <Feature muted={!p.limits.unbranded}>{p.limits.unbranded ? "Unbranded widget" : "Astrex branding"}</Feature>
              </ul>

              <div className="mt-5">
                {current ? (
                  <ButtonSecondary className="w-full" disabled>Current plan</ButtonSecondary>
                ) : p.id === "enterprise" ? (
                  <a href="mailto:sales@astrex.ai?subject=Enterprise%20plan" className="btn-secondary w-full justify-center">
                    Contact sales
                  </a>
                ) : p.id === "free" ? (
                  <ButtonSecondary className="w-full" disabled>—</ButtonSecondary>
                ) : p.purchasable ? (
                  <Button className="w-full" onClick={() => upgrade(p.id)} disabled={busy === p.id}>
                    {busy === p.id ? <Loader2 size={15} className="animate-spin" /> : <><Zap size={15} /> Choose {PLAN_LABEL[p.id]}</>}
                  </Button>
                ) : (
                  <ButtonSecondary className="w-full" disabled title="Not available yet — billing not configured">
                    Coming soon
                  </ButtonSecondary>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-ink-faint">
        <CreditCard size={13} /> Payments are processed securely by Razorpay. GST-compliant invoices are issued automatically.
      </p>
    </div>
  );
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  return (
    <div>
      <p className="font-mono text-[10.5px] font-medium uppercase tracking-[.16em] text-ink-muted">{label}</p>
      <p className="mt-1.5 font-tight text-xl font-bold text-ink tabular-nums">
        {used.toLocaleString()}
        <span className="text-sm font-medium text-ink-faint"> / {fmt(limit)}</span>
      </p>
    </div>
  );
}

function Feature({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <Check size={15} className={muted ? "text-ink-faint" : "text-emerald-500"} />
      <span className={muted ? "text-ink-faint" : ""}>{children}</span>
    </li>
  );
}
