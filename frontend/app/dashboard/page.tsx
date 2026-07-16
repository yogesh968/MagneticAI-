"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, readSessionHint } from "@/lib/api";
import { StatCard, Badge } from "@/components/ui";
import {
  MessageSquare, TicketCheck, TrendingUp, AlertTriangle,
  ArrowRight, Bot, Clock, BookOpen, Zap, Activity,
  ShieldCheck, Headphones, Users, BarChart3, Code2,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const priorityTone: Record<string, string> = { low: "slate", medium: "cyan", high: "orange", urgent: "red" };
const statusTone: Record<string, string> = { open: "blue", in_progress: "amber", resolved: "green", closed: "slate" };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Agent home view ──────────────────────────────────────────────────────────
function AgentDashboard({ overview, recentTickets, userName, router }: any) {
  const agentStats = [
    { label: "Open Tickets",   value: overview.openTickets,     icon: <TicketCheck size={18} />, tone: "amber", delay: "d1", sub: "Needs your attention" },
    { label: "Escalated",      value: overview.escalated,       icon: <AlertTriangle size={18} />, tone: "red",   delay: "d2", sub: "High priority" },
    { label: "Conversations",  value: overview.totalConversations, icon: <MessageSquare size={18} />, tone: "blue", delay: "d3", sub: "All sessions" },
    { label: "Resolved",       value: overview.resolvedTickets, icon: <TrendingUp size={18} />,  tone: "green", delay: "d4", sub: "Closed successfully" },
  ];

  const quickActions = [
    { label: "View Tickets",       icon: TicketCheck,   href: "/dashboard/tickets",       color: "amber",   desc: "Handle open tickets" },
    { label: "Conversations",      icon: MessageSquare, href: "/dashboard/conversations", color: "blue",    desc: "Review all chats" },
    { label: "Escalations",        icon: AlertTriangle, href: "/dashboard/escalations",   color: "red",     desc: "Urgent issues" },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">
      {/* Header — green tint for agent */}
      <div className="anim-up flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
              <Headphones size={14} className="text-emerald-600" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Agent Workspace</span>
          </div>
          <h1 className="page-title">
            {userName ? `Hey, ${userName.split(" ")[0]} 👋` : "My Workspace"}
          </h1>
          <p className="page-sub">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · Your support queue
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <Activity size={13} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">{overview.openTickets} open tickets</span>
          </div>
        </div>
      </div>

      {/* Agent stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {agentStats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 anim-up d3">
        {quickActions.map(({ label, icon: Icon, href, color, desc }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`group flex items-center gap-4 rounded-2xl border border-${color}-100 bg-${color}-50/50 p-4 text-left hover:shadow-md transition-all hover:-translate-y-0.5`}
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-${color}-100`}>
              <Icon size={20} className={`text-${color}-600`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
            <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
          </button>
        ))}
      </div>

      {/* Recent tickets */}
      {recentTickets.length > 0 && (
        <div className="card anim-up d4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title">My Queue</p>
              <p className="text-xs text-slate-400 mt-0.5">Latest tickets awaiting action</p>
            </div>
            <button onClick={() => router.push("/dashboard/tickets")} className="btn-ghost btn-sm gap-1 text-emerald-600 hover:bg-emerald-50">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-1.5">
            {recentTickets.map((t: any, i: number) => (
              <div
                key={t._id}
                onClick={() => router.push(`/dashboard/tickets/${t._id}`)}
                className={`flex items-center gap-3.5 rounded-xl border border-transparent px-4 py-3 cursor-pointer hover:border-emerald-100 hover:bg-emerald-50/40 transition-all group anim-up d${Math.min(i + 1, 8)}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-white group-hover:border group-hover:border-slate-200 transition-all">
                  <TicketCheck size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{t.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono text-emerald-600 font-semibold">{t.ticketNumber}</span>
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
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5 anim-up d5">
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
    { label: "Conversations",  value: overview.totalConversations, icon: <MessageSquare size={18} />, tone: "blue",  delay: "d1", sub: "All time" },
    { label: "Open Tickets",   value: overview.openTickets,        icon: <TicketCheck size={18} />,  tone: "amber", delay: "d2", sub: "Awaiting action" },
    { label: "Resolved",       value: overview.resolvedTickets,    icon: <TrendingUp size={18} />,   tone: "green", delay: "d3", sub: "Successfully closed" },
    { label: "Escalated",      value: overview.escalated,          icon: <AlertTriangle size={18} />,tone: "red",   delay: "d4", sub: "Auto-escalated" },
  ];

  const adminLinks = [
    { label: "Knowledge Base", icon: BookOpen,    href: "/dashboard/knowledge-base", color: "blue",   desc: "Manage docs & indexing" },
    { label: "Analytics",      icon: BarChart3,   href: "/dashboard/analytics",      color: "purple", desc: "Platform metrics" },
    { label: "Team",           icon: Users,       href: "/dashboard/team",           color: "indigo", desc: "Manage agents" },
    { label: "Widget",         icon: Code2,       href: "/dashboard/widget",         color: "violet", desc: "Embed settings" },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* Header — blue tint for admin */}
      <div className="anim-up flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <ShieldCheck size={14} className="text-blue-600" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Admin Dashboard</span>
          </div>
          <h1 className="page-title">
            {userName ? `Welcome back, ${userName.split(" ")[0]}` : "Overview"}
          </h1>
          <p className="page-sub">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · Platform overview
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
            <Activity size={13} className="text-blue-500" />
            <span className="text-xs font-semibold text-blue-700">{overview.resolutionRate}% resolved</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {adminStats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Admin quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 anim-up d3">
        {adminLinks.map(({ label, icon: Icon, href, color, desc }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 text-left hover:border-blue-200 hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-${color}-50 border border-${color}-100`}>
              <Icon size={16} className={`text-${color}-600`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 leading-tight">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Chart + resolution ring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card anim-up d5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="section-title">Activity Overview</p>
              <p className="text-xs text-slate-400 mt-0.5">Last 30 days — conversations & escalations</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2 w-3 rounded-full bg-blue-500" /> Conversations</span>
              <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2 w-3 rounded-full bg-red-400" /> Escalations</span>
            </div>
          </div>
          {charts.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <Activity size={18} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-400 font-medium">No data yet for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={charts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f87171" stopOpacity={0.13} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="conversations" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gc)" dot={false} name="Conversations" />
                <Area type="monotone" dataKey="escalations"  stroke="#f87171" strokeWidth={2}   fill="url(#ge)" dot={false} name="Escalations" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Resolution ring */}
        <div className="card anim-up d6 flex flex-col">
          <p className="section-title">AI Resolution Rate</p>
          <p className="text-xs text-slate-400 mt-0.5 mb-5">Resolved without human handoff</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <svg width={136} height={136} viewBox="0 0 136 136" className="-rotate-90">
                <circle cx="68" cy="68" r="56" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle
                  cx="68" cy="68" r="56" fill="none"
                  stroke={overview.resolutionRate >= 70 ? "#22c55e" : overview.resolutionRate >= 40 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - overview.resolutionRate / 100)}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-[34px] font-extrabold text-slate-900 tabular-nums leading-none">{overview.resolutionRate}%</p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">resolved</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className={`rounded-xl px-3 py-2.5 text-center ${overview.resolutionRate >= 80 ? "bg-emerald-50 border border-emerald-100" : "bg-slate-50 border border-slate-100"}`}>
              <p className={`text-base font-bold ${overview.resolutionRate >= 80 ? "text-emerald-700" : "text-slate-700"}`}>80%</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Target</p>
            </div>
            <div className={`rounded-xl px-3 py-2.5 text-center ${overview.resolutionRate >= 80 ? "bg-emerald-50 border border-emerald-100" : "bg-amber-50 border border-amber-100"}`}>
              <p className={`text-base font-bold ${overview.resolutionRate >= 80 ? "text-emerald-700" : "text-amber-700"}`}>
                {overview.resolutionRate >= 80 ? "✓" : `${80 - overview.resolutionRate}%`}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{overview.resolutionRate >= 80 ? "On track" : "Gap"}</p>
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
              <p className="text-xs text-slate-400 mt-0.5">Latest support tickets across all conversations</p>
            </div>
            <button onClick={() => router.push("/dashboard/tickets")} className="btn-ghost btn-sm gap-1 text-blue-600 hover:bg-blue-50">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-1.5">
            {recentTickets.map((t: any, i: number) => (
              <div
                key={t._id}
                onClick={() => router.push(`/dashboard/tickets/${t._id}`)}
                className={`flex items-center gap-3.5 rounded-xl border border-transparent px-4 py-3 cursor-pointer hover:border-blue-100 hover:bg-blue-50/40 transition-all group anim-up d${Math.min(i + 1, 8)}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-white group-hover:border group-hover:border-slate-200 transition-all">
                  <TicketCheck size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{t.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono text-blue-600 font-semibold">{t.ticketNumber}</span>
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
        <div className="card border-2 border-dashed border-slate-200 bg-slate-50/30 anim-up d7">
          <div className="flex flex-col items-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 mb-4">
              <Zap size={24} className="text-blue-600" />
            </div>
            <p className="text-base font-bold text-slate-800">Ready to go live</p>
            <p className="mt-1.5 text-sm text-slate-400 max-w-xs leading-relaxed">
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
