"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, readSessionHint } from "@/lib/api";
import { StatCard } from "@/components/ui";
import {
  Building2, Users, MessageSquare, TicketCheck,
  TrendingUp, Activity, ArrowRight, Globe, ShieldCheck,
  Bot, Database,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-hairline bg-white px-4 py-3 shadow-card-lg text-xs">
      <p className="font-tight font-semibold text-ink mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-ink-muted">{p.name}:</span>
          <span className="font-bold text-ink">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Tailwind scans source statically, so a class built as `bg-${color}-50` is
 * never generated and the element renders unstyled. Every tone a quick-link
 * tile can take has to appear here as a whole, literal class name.
 */
const QUICK_TONE: Record<string, { chip: string; icon: string }> = {
  teal:    { chip: "bg-teal-100",    icon: "text-teal-600" },
  accent:  { chip: "bg-accent-100",  icon: "text-accent-600" },
  emerald: { chip: "bg-emerald-100", icon: "text-emerald-600" },
  ink:     { chip: "bg-sunken",      icon: "text-ink" },
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [charts, setCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(readSessionHint());
    Promise.all([
      api.get("/analytics/overview"),
      api.get("/analytics/charts"),
    ]).then(([ov, ch]) => {
      setOverview(ov.data);
      setCharts(ch.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-5">
        <div className="space-y-2">
          <div className="skeleton h-7 w-48" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const stats = overview ? [
    { label: "Total Conversations", value: overview.totalConversations, icon: <MessageSquare size={18} />, tone: "blue", sub: "All tenants" },
    { label: "Open Tickets",        value: overview.openTickets,        icon: <TicketCheck size={18} />,  tone: "amber", sub: "Awaiting action" },
    { label: "Resolved",            value: overview.resolvedTickets,    icon: <TrendingUp size={18} />,   tone: "green", sub: "Successfully closed" },
    { label: "Escalated",           value: overview.escalated,          icon: <Activity size={18} />,     tone: "red", sub: "Auto-escalated" },
  ] : [];

  const quickLinks = [
    { icon: Building2, label: "Tenants",        href: "/admin/tenants", tone: "teal" },
    { icon: Users,     label: "All Users",       href: "/admin/users",   tone: "accent" },
    { icon: Activity,  label: "Platform Stats",  href: "/admin/stats",   tone: "emerald" },
    { icon: Database,  label: "System Health",   href: "/admin/system",  tone: "ink" },
  ];

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="anim-up flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Admin Overview"}
          </h1>
          <p className="page-sub">{today} · Platform-wide overview</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-hairline bg-sunken px-3 py-2">
          <ShieldCheck size={13} className="text-ink-muted" />
          <span className="text-xs font-semibold text-ink capitalize">{user?.role ?? "Admin"} Portal</span>
        </div>
      </div>

      {/* Stat cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => <StatCard key={s.label} {...s} delay={`d${i + 1}`} />)}
        </div>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 anim-up d3">
        {quickLinks.map(({ icon: Icon, label, href, tone }) => {
          const t = QUICK_TONE[tone] ?? QUICK_TONE.ink;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="group flex items-center gap-3 rounded-2xl border border-hairline bg-white p-4 shadow-xs hover:border-hairline-strong hover:shadow-card-md hover:-translate-y-0.5 transition-[border-color,box-shadow,transform] text-left"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.chip}`}>
                <Icon size={18} className={t.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="text-xs text-ink-faint mt-0.5">Manage →</p>
              </div>
              <ArrowRight size={14} className="text-ink-faint group-hover:text-ink shrink-0 transition-colors" />
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="card anim-up d4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-title">Platform Activity</p>
            <p className="text-xs text-ink-muted mt-0.5">Last 30 days — conversations & escalations</p>
          </div>
          <div className="flex gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span className="h-2 w-3 rounded-full bg-accent-500" /> Conversations
            </span>
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span className="h-2 w-3 rounded-full bg-red-400" /> Escalations
            </span>
          </div>
        </div>
        {charts.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sunken">
              <Activity size={18} className="text-ink-faint" />
            </div>
            <p className="text-sm text-ink-muted font-medium">No activity data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={charts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#2F6BFF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.13} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEDE8" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9A9AA0" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9A9AA0" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#D9D6CF", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="conversations" stroke="#2F6BFF" strokeWidth={2.5} fill="url(#gv)" dot={false} name="Conversations" />
              <Area type="monotone" dataKey="escalations"  stroke="#f87171" strokeWidth={2}   fill="url(#gr)" dot={false} name="Escalations" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Onboarding hint */}
      {!overview?.totalConversations && (
        <div className="card anim-up d5 border-2 border-dashed border-hairline-strong bg-white">
          <div className="flex flex-col items-center py-2 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 shadow-accent">
              <Bot size={24} className="text-white" />
            </div>
            <p className="font-tight font-bold text-ink">No platform activity yet</p>
            <p className="mt-1.5 text-sm text-ink-muted max-w-sm mx-auto">
              Seed demo data or have tenants embed the widget to see activity here.
            </p>
            <button
              onClick={() => router.push("/admin/tenants")}
              className="btn-ink btn-sm mt-5 gap-2"
            >
              <Globe size={14} /> Manage Tenants
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
