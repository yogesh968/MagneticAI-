"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, readSessionHint } from "@/lib/api";
import { StatCard, Badge } from "@/components/ui";
import {
  MessageSquare, TicketCheck, AlertTriangle,
  MessagesSquare, Inbox, Siren, CheckCircle2,
  ArrowRight, Bot, Clock, BookOpen, Zap, Activity,
  Headphones, Users, BarChart3, Code2,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { OrbBot3D } from "@/components/brand/OrbBot3D";

const priorityTone: Record<string, string> = { low: "slate", medium: "cyan", high: "orange", urgent: "red" };
const statusTone: Record<string, string> = { open: "blue", in_progress: "amber", resolved: "green", closed: "slate" };

/**
 * Tailwind scans source statically, so a class built as `bg-${color}-50` is
 * never generated and the element renders unstyled. Every tone a card can take
 * has to appear here as a whole, literal class name.
 */
const TILE_TONE: Record<string, { wrap: string; chip: string; icon: string }> = {
  accent:  { wrap: "border-accent-100 bg-accent-50/60 hover:border-accent-200",   chip: "bg-accent-100",  icon: "text-accent-600" },
  amber:   { wrap: "border-amber-100 bg-amber-50/60 hover:border-amber-200",      chip: "bg-amber-100",   icon: "text-amber-600" },
  red:     { wrap: "border-red-100 bg-red-50/60 hover:border-red-200",            chip: "bg-red-100",     icon: "text-red-600" },
  emerald: { wrap: "border-emerald-100 bg-emerald-50/60 hover:border-emerald-200",chip: "bg-emerald-100", icon: "text-emerald-600" },
  teal:    { wrap: "border-teal-100 bg-teal-50/60 hover:border-teal-200",         chip: "bg-teal-100",    icon: "text-teal-600" },
  ink:     { wrap: "border-hairline bg-white hover:border-hairline-strong",       chip: "bg-sunken",      icon: "text-ink" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-hairline bg-white px-4 py-3 text-xs shadow-card-lg">
      <p className="mb-2 font-tight font-semibold text-ink">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="mb-0.5 flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
          <span className="text-ink-muted">{p.name}:</span>
          <span className="font-bold text-ink tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Page header ──────────────────────────────────────────────────────────────
// Restrained and professional: an eyebrow, a title, a one-line summary, and a
// compact KPI cluster with a small, refined 3D orb. No gradients, no glow.
function CommandHero({
  eyebrow, title, sub, kpiLabel, kpiValue, live, accent = true,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  kpiLabel: string;
  kpiValue: string;
  live: string;
  accent?: boolean;
}) {
  return (
    <div className="anim-up flex flex-col gap-6 border-b border-hairline pb-7 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-ink-faint">{eyebrow}</div>
        <h1 className="font-tight text-[26px] font-bold leading-tight tracking-[-.02em] text-ink">{title}</h1>
        <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-muted">{sub}</p>
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <div className="text-right">
          <div className="font-tight text-[26px] font-bold leading-none tracking-[-.02em] text-ink tabular-nums">{kpiValue}</div>
          <div className="mt-1.5 text-[11px] font-medium text-ink-muted">{kpiLabel}</div>
        </div>
        <div className="hidden h-11 w-px bg-hairline sm:block" />
        <div className="hidden text-right sm:block">
          <div className="font-tight text-[26px] font-bold leading-none tracking-[-.02em] text-ink tabular-nums">{live.split(" ")[0]}</div>
          <div className="mt-1.5 text-[11px] font-medium text-ink-muted">{live.split(" ").slice(1).join(" ")}</div>
        </div>
        <OrbBot3D size={92} className="hidden md:block" />
      </div>
    </div>
  );
}

// ─── Agent home view ──────────────────────────────────────────────────────────
function AgentDashboard({ overview, recentTickets, userName, router }: any) {
  const agentStats = [
    { label: "Open Tickets",   value: overview.openTickets,     icon: <Inbox size={18} />, tone: "amber", delay: "d1", sub: "Needs your attention" },
    { label: "Escalated",      value: overview.escalated,       icon: <Siren size={18} />, tone: "red",   delay: "d2", sub: "High priority" },
    { label: "Conversations",  value: overview.totalConversations, icon: <MessagesSquare size={18} />, tone: "blue", delay: "d3", sub: "All sessions" },
    { label: "Resolved",       value: overview.resolvedTickets, icon: <CheckCircle2 size={18} />,  tone: "green", delay: "d4", sub: "Closed successfully" },
  ];

  const quickActions = [
    { label: "View Tickets",  icon: TicketCheck,   href: "/dashboard/tickets",       tone: "amber",  desc: "Handle open tickets" },
    { label: "Conversations", icon: MessageSquare, href: "/dashboard/conversations", tone: "accent", desc: "Review all chats" },
    { label: "Escalations",   icon: AlertTriangle, href: "/dashboard/escalations",   tone: "red",    desc: "Urgent issues" },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">
      <CommandHero
        accent={false}
        eyebrow="Agent Workspace"
        title={userName ? `Welcome back, ${userName.split(" ")[0]}` : "My Workspace"}
        sub="The tickets, conversations and escalations that need a human."
        kpiLabel="Open tickets"
        kpiValue={String(overview.openTickets)}
        live={`${overview.escalated} escalated`}
      />

      {/* Agent stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {agentStats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Quick action cards */}
      <div className="anim-up d3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {quickActions.map(({ label, icon: Icon, href, tone, desc }) => {
          const t = TILE_TONE[tone] ?? TILE_TONE.ink;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition-[border-color,box-shadow] duration-150 hover:shadow-card-md ${t.wrap}`}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.chip}`}>
                <Icon size={20} className={t.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-tight font-semibold text-ink">{label}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{desc}</p>
              </div>
              <ArrowRight size={14} className="shrink-0 text-ink-faint transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>

      {/* Recent tickets */}
      {recentTickets.length > 0 && (
        <div className="card anim-up d4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title">My Queue</p>
              <p className="mt-0.5 text-xs text-ink-muted">Latest tickets awaiting action</p>
            </div>
            <button onClick={() => router.push("/dashboard/tickets")} className="btn-ghost btn-sm gap-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-1.5">
            {recentTickets.map((t: any, i: number) => (
              <div
                key={t._id}
                onClick={() => router.push(`/dashboard/tickets/${t._id}`)}
                className={`group anim-up d${Math.min(i + 1, 8)} flex cursor-pointer items-center gap-3.5 rounded-xl border border-transparent px-4 py-3 transition-colors duration-150 hover:border-emerald-100 hover:bg-emerald-50/50`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken transition-colors group-hover:bg-white">
                  <TicketCheck size={14} className="text-ink-faint transition-colors group-hover:text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{t.subject}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                    <span className="font-mono font-semibold text-emerald-600">{t.ticketNumber}</span>
                    <span>·</span>
                    <span>{t.customerName || "Unknown"}</span>
                    <span>·</span>
                    <Clock size={9} className="inline" />
                    <span>{new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={priorityTone[t.priority] ?? "slate"}>{t.priority}</Badge>
                  <Badge tone={statusTone[t.status] ?? "slate"}>{t.status.replace("_", " ")}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent role info */}
      <div className="anim-up d5 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Headphones size={15} className="text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-800">Agent Access</p>
        </div>
        <p className="text-xs text-emerald-700 leading-relaxed">
          You have access to <strong>Tickets</strong>, <strong>Conversations</strong>, and <strong>Escalations</strong>.
          Platform configuration (Knowledge Base, AI Config, Analytics, Widget) is managed by admins.
        </p>
      </div>
    </div>
  );
}

// ─── Admin home view ──────────────────────────────────────────────────────────
function AdminDashboard({ overview, charts, recentTickets, userName, router }: any) {
  const adminStats = [
    { label: "Conversations",  value: overview.totalConversations, icon: <MessagesSquare size={18} />, tone: "blue",  delay: "d1", sub: "All time" },
    { label: "Open Tickets",   value: overview.openTickets,        icon: <Inbox size={18} />,  tone: "amber", delay: "d2", sub: "Awaiting action" },
    { label: "Resolved",       value: overview.resolvedTickets,    icon: <CheckCircle2 size={18} />,   tone: "green", delay: "d3", sub: "Successfully closed" },
    { label: "Escalated",      value: overview.escalated,          icon: <Siren size={18} />,tone: "red",   delay: "d4", sub: "Auto-escalated" },
  ];

  const adminLinks = [
    { label: "Knowledge Base", icon: BookOpen,  href: "/dashboard/knowledge-base", tone: "emerald", desc: "Manage docs & indexing" },
    { label: "Analytics",      icon: BarChart3, href: "/dashboard/analytics",      tone: "teal",    desc: "Platform metrics" },
    { label: "Team",           icon: Users,     href: "/dashboard/team",           tone: "accent",  desc: "Manage agents" },
    { label: "Widget",         icon: Code2,     href: "/dashboard/widget",         tone: "ink",     desc: "Embed settings" },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <CommandHero
        eyebrow="Admin Overview"
        title={userName ? `Welcome back, ${userName.split(" ")[0]}` : "Overview"}
        sub="Conversations, tickets and AI performance across your workspace."
        kpiLabel="AI resolution"
        kpiValue={`${overview.resolutionRate}%`}
        live={`${overview.openTickets} open tickets`}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {adminStats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Admin quick links */}
      <div className="anim-up d3 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {adminLinks.map(({ label, icon: Icon, href, tone, desc }) => {
          const t = TILE_TONE[tone] ?? TILE_TONE.ink;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="group flex items-center gap-3 rounded-2xl border border-hairline bg-white p-4 text-left transition-[border-color,box-shadow] duration-150 hover:border-hairline-strong hover:shadow-card-md"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.chip}`}>
                <Icon size={16} className={t.icon} />
              </div>
              <div className="min-w-0">
                <p className="font-tight text-sm font-semibold leading-tight text-ink">{label}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Chart + resolution ring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card anim-up d5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="section-title">Activity Overview</p>
              <p className="mt-0.5 text-xs text-ink-muted">Last 30 days — conversations & escalations</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-ink-muted"><span className="h-2 w-3 rounded-full bg-accent-500" /> Conversations</span>
              <span className="flex items-center gap-1.5 text-ink-muted"><span className="h-2 w-3 rounded-full bg-red-400" /> Escalations</span>
            </div>
          </div>
          {charts.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50">
                <Activity size={18} className="text-accent-500" />
              </div>
              <p className="text-sm font-medium text-ink-muted">No data yet for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={charts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4453D6" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#4453D6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f87171" stopOpacity={0.13} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFEDE8" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9A9AA0" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9A9AA0" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#D9D6CF", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="conversations" stroke="#4453D6" strokeWidth={2.5} fill="url(#gc)" dot={false} name="Conversations" />
                <Area type="monotone" dataKey="escalations"  stroke="#f87171" strokeWidth={2}   fill="url(#ge)" dot={false} name="Escalations" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Resolution ring */}
        <div className="card anim-up d6 flex flex-col">
          <p className="section-title">AI Resolution Rate</p>
          <p className="mb-5 mt-0.5 text-xs text-ink-muted">Resolved without human handoff</p>
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <svg width={136} height={136} viewBox="0 0 136 136" className="-rotate-90">
                <circle cx="68" cy="68" r="56" fill="none" stroke="#EFEDE8" strokeWidth="12" />
                <circle
                  cx="68" cy="68" r="56" fill="none"
                  stroke={overview.resolutionRate >= 70 ? "#0F9D63" : overview.resolutionRate >= 40 ? "#F59E0B" : "#DC2626"}
                  strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - overview.resolutionRate / 100)}`}
                  className="transition-[stroke-dashoffset] duration-700 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <p className="font-tight text-[34px] font-extrabold leading-none tracking-[-.03em] text-ink tabular-nums">{overview.resolutionRate}%</p>
                <p className="mt-1 text-[11px] font-medium text-ink-muted">resolved</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className={`rounded-xl border px-3 py-2.5 text-center ${overview.resolutionRate >= 80 ? "border-emerald-100 bg-emerald-50" : "border-hairline bg-sunken"}`}>
              <p className={`font-tight text-base font-bold ${overview.resolutionRate >= 80 ? "text-emerald-700" : "text-ink"}`}>80%</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">Target</p>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 text-center ${overview.resolutionRate >= 80 ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}>
              <p className={`font-tight text-base font-bold ${overview.resolutionRate >= 80 ? "text-emerald-700" : "text-amber-700"}`}>
                {overview.resolutionRate >= 80 ? "✓" : `${80 - overview.resolutionRate}%`}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">{overview.resolutionRate >= 80 ? "On track" : "Gap"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tickets */}
      {recentTickets.length > 0 && (
        <div className="card anim-up d7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title">Recent Tickets</p>
              <p className="mt-0.5 text-xs text-ink-muted">Latest support tickets across all conversations</p>
            </div>
            <button onClick={() => router.push("/dashboard/tickets")} className="btn-ghost btn-sm gap-1 text-accent-500 hover:bg-accent-50 hover:text-accent-600">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-1.5">
            {recentTickets.map((t: any, i: number) => (
              <div
                key={t._id}
                onClick={() => router.push(`/dashboard/tickets/${t._id}`)}
                className={`group anim-up d${Math.min(i + 1, 8)} flex cursor-pointer items-center gap-3.5 rounded-xl border border-transparent px-4 py-3 transition-colors duration-150 hover:border-accent-100 hover:bg-accent-50/50`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken transition-colors group-hover:bg-white">
                  <TicketCheck size={14} className="text-ink-faint transition-colors group-hover:text-accent-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{t.subject}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                    <span className="font-mono font-semibold text-accent-600">{t.ticketNumber}</span>
                    <span>·</span><span>{t.customerName || "Unknown"}</span>
                    <span>·</span><Clock size={9} className="inline" />
                    <span>{new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={priorityTone[t.priority] ?? "slate"}>{t.priority}</Badge>
                  <Badge tone={statusTone[t.status] ?? "slate"}>{t.status.replace("_", " ")}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {overview.totalConversations === 0 && (
        <div className="card anim-up d7 border-2 border-dashed border-hairline-strong bg-white">
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 shadow-accent">
              <Zap size={24} className="text-white" />
            </div>
            <p className="font-tight text-base font-bold text-ink">Ready to go live</p>
            <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-muted">
              Upload your knowledge base, configure the AI, and embed the widget to start answering customer questions automatically.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => router.push("/dashboard/knowledge-base")} className="btn-primary btn-sm gap-1.5">
                <BookOpen size={13} /> Upload docs
              </button>
              <button onClick={() => router.push("/dashboard/ai-config")} className="btn-secondary btn-sm gap-1.5">
                <Bot size={13} /> Configure bot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page (role switcher) ────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [charts, setCharts] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const hint = readSessionHint();
    setUserInfo({ name: hint?.name ?? "", role: hint?.role ?? "agent" });
    api.get("/analytics/overview").then((r) => setOverview(r.data));
    api.get("/analytics/charts").then((r) => setCharts(r.data));
    api.get("/tickets", { params: { limit: 5 } }).then((r) => setRecentTickets(r.data.items ?? []));
  }, []);

  if (!overview) {
    return (
      <div className="p-6 space-y-5">
        <div className="anim-up space-y-2">
          <div className="skeleton h-5 w-28" />
          <div className="skeleton h-7 w-56" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className={`skeleton h-32 rounded-2xl d${i + 1}`} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="skeleton lg:col-span-2 h-64 rounded-2xl d5" />
          <div className="skeleton h-64 rounded-2xl d6" />
        </div>
      </div>
    );
  }

  const props = { overview, charts, recentTickets, userName: userInfo?.name ?? "", router };

  return userInfo?.role === "agent"
    ? <AgentDashboard {...props} />
    : <AdminDashboard {...props} />;
}
