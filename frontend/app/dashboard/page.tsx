"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { StatCard, Loading, Badge } from "@/components/ui";
import {
  MessageSquare, TicketCheck, TrendingUp, AlertTriangle,
  ArrowRight, Bot, Clock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Overview {
  totalConversations: number;
  openTickets: number;
  resolvedTickets: number;
  escalated: number;
  resolutionRate: number;
}

const priorityTone: Record<string, string> = { low: "slate", medium: "cyan", high: "orange", urgent: "red" };
const statusTone: Record<string, string> = { open: "blue", in_progress: "amber", resolved: "green", closed: "slate" };

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [charts, setCharts] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  useEffect(() => {
    api.get("/analytics/overview").then((r) => setOverview(r.data));
    api.get("/analytics/charts").then((r) => setCharts(r.data));
    api.get("/tickets", { params: { limit: 5 } }).then((r) => setRecentTickets(r.data.items ?? []));
  }, []);

  if (!overview) {
    return (
      <div className="p-8 space-y-5">
        <div className="anim-up">
          <div className="skeleton h-8 w-52 mb-2" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className={`skeleton h-36 rounded-2xl d${i + 1}`} />)}
        </div>
        <Loading rows={3} rowH="h-48" />
      </div>
    );
  }

  const stats = [
    { label: "Total Conversations", value: overview.totalConversations, icon: <MessageSquare size={20} />, tone: "blue",   delay: "d1", sub: "All time" },
    { label: "Open Tickets",         value: overview.openTickets,        icon: <TicketCheck size={20} />,  tone: "amber",  delay: "d2", sub: "Awaiting action" },
    { label: "Resolved",             value: overview.resolvedTickets,    icon: <TrendingUp size={20} />,   tone: "green",  delay: "d3", sub: "Successfully closed" },
    { label: "Escalated",            value: overview.escalated,          icon: <AlertTriangle size={20} />,tone: "red",    delay: "d4", sub: "Auto-escalated" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-xs">
        <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="anim-up">
        <h1 className="page-title">Good morning 👋</h1>
        <p className="page-sub">Here's what's happening with your support platform today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Middle row: chart + resolution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 card anim-up d5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="section-title">Activity Overview</p>
              <p className="text-xs text-slate-400 mt-0.5">Conversations & escalations — last 30 days</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2 w-4 rounded-full bg-blue-500" /> Conversations
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2 w-4 rounded-full bg-red-400" /> Escalations
              </span>
            </div>
          </div>
          {charts.length === 0 ? (
            <div className="h-52 flex items-center justify-center">
              <p className="text-sm text-slate-400">No data yet for this period.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f87171" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0" }} />
                <Area type="monotone" dataKey="conversations" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gc)" dot={false} name="Conversations" />
                <Area type="monotone" dataKey="escalations"  stroke="#f87171" strokeWidth={2} fill="url(#ge)" dot={false} name="Escalations" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Resolution rate */}
        <div className="card anim-up d6 flex flex-col">
          <p className="section-title mb-1">AI Resolution Rate</p>
          <p className="text-xs text-slate-400 mb-6">Conversations resolved without human handoff</p>

          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Circular progress */}
            <div className="relative flex items-center justify-center">
              <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
                <circle cx="70" cy="70" r="58" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                <circle
                  cx="70" cy="70" r="58" fill="none"
                  stroke={overview.resolutionRate >= 70 ? "#22c55e" : overview.resolutionRate >= 40 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 58}`}
                  strokeDashoffset={`${2 * Math.PI * 58 * (1 - overview.resolutionRate / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-4xl font-extrabold text-slate-900 tabular-nums leading-none">{overview.resolutionRate}%</p>
                <p className="text-xs text-slate-400 mt-1">resolved</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Target", value: "80%", ok: overview.resolutionRate >= 80 },
              { label: "Gap",    value: `${Math.max(0, 80 - overview.resolutionRate)}%`, ok: overview.resolutionRate >= 80 },
            ].map(({ label, value, ok }) => (
              <div key={label} className={`rounded-xl px-3 py-2.5 text-center ${ok ? "bg-emerald-50" : "bg-slate-50"}`}>
                <p className={`text-lg font-bold ${ok ? "text-emerald-700" : "text-slate-700"}`}>{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
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
            <button
              onClick={() => router.push("/dashboard/tickets")}
              className="btn-ghost btn-sm gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div className="space-y-2">
            {recentTickets.map((t: any) => (
              <div
                key={t._id}
                onClick={() => router.push(`/dashboard/tickets/${t._id}`)}
                className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 cursor-pointer hover:border-blue-200 hover:bg-blue-50/40 transition-all duration-150"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm">
                  <TicketCheck size={16} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{t.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-blue-600 font-semibold">{t.ticketNumber}</span>
                    <span>·</span>
                    <span>{t.customerName || "Unknown"}</span>
                    <span>·</span>
                    <Clock size={10} className="inline" />
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
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

      {/* Empty quick actions */}
      {overview.totalConversations === 0 && (
        <div className="card border-dashed border-2 border-slate-200 bg-slate-50/50 anim-up d7">
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 mb-4">
              <Bot size={26} className="text-blue-600" />
            </div>
            <p className="text-base font-semibold text-slate-800">Ready to go live</p>
            <p className="mt-1.5 text-sm text-slate-400 max-w-sm">
              Embed your widget, upload knowledge base documents, and start answering customer questions with AI.
            </p>
            <div className="mt-5 flex gap-3">
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

function BookOpen({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
