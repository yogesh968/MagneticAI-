"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatCard, PageHeader } from "@/components/ui";
import {
  MessageSquare, TicketCheck, TrendingUp, AlertTriangle,
  BookOpen, Activity, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function AdminStatsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [charts, setCharts] = useState<any[]>([]);
  const [kbStats, setKbStats] = useState<any>(null);
  const [escStats, setEscStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/overview"),
      api.get("/analytics/charts"),
      api.get("/analytics/kb"),
      api.get("/analytics/escalations"),
    ]).then(([ov, ch, kb, esc]) => {
      setOverview(ov.data);
      setCharts(ch.data ?? []);
      setKbStats(kb.data);
      setEscStats(esc.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-5">
        <div className="skeleton h-7 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const stats = overview ? [
    { label: "Total Conversations", value: overview.totalConversations, icon: <MessageSquare size={18} />, tone: "blue",  sub: "All time" },
    { label: "Open Tickets",        value: overview.openTickets,        icon: <TicketCheck size={18} />,  tone: "amber", sub: "Pending" },
    { label: "Resolved Tickets",    value: overview.resolvedTickets,    icon: <TrendingUp size={18} />,   tone: "green", sub: "Closed successfully" },
    { label: "Escalated",           value: overview.escalated,          icon: <AlertTriangle size={18} />,tone: "red",   sub: "Required human help" },
  ] : [];

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      <PageHeader title="Platform Stats" subtitle="Aggregated performance metrics across the platform" />

      {/* Stat cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => <StatCard key={s.label} {...s} delay={`d${i + 1}`} />)}
        </div>
      )}

      {/* Resolution rate */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 anim-up d3">
          {[
            {
              label: "Resolution Rate",
              value: `${overview.resolutionRate ?? 0}%`,
              sub: "AI-resolved without handoff",
              color: overview.resolutionRate >= 70 ? "emerald" : "amber",
              icon: <Zap size={18} />,
            },
            {
              label: "Total KB Documents",
              value: kbStats?.totalDocuments ?? "—",
              sub: `${kbStats?.totalChunks ?? 0} indexed chunks`,
              color: "blue",
              icon: <BookOpen size={18} />,
            },
            {
              label: "Escalation Rate",
              value: overview.totalConversations
                ? `${Math.round((overview.escalated / overview.totalConversations) * 100)}%`
                : "0%",
              sub: "of all conversations escalated",
              color: "red",
              icon: <AlertTriangle size={18} />,
            },
          ].map(({ label, value, sub, color, icon }) => (
            <div key={label} className={`rounded-2xl border border-${color}-100 bg-${color}-50/50 p-5 anim-up`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${color}-100 mb-3`}>
                <span className={`text-${color}-600`}>{icon}</span>
              </div>
              <p className={`text-3xl font-extrabold tabular-nums text-${color}-700`}>{value}</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Activity trend */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] anim-up d4">
          <p className="text-sm font-semibold text-slate-900 mb-1">Activity Trend</p>
          <p className="text-xs text-slate-400 mb-4">Conversations & escalations over 30 days</p>
          {charts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={charts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gbl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="conversations" stroke="#3b82f6" strokeWidth={2} fill="url(#gbl)" dot={false} name="Conversations" />
                <Area type="monotone" dataKey="escalations"  stroke="#f87171" strokeWidth={1.5} fill="none" dot={false} name="Escalations" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-sm text-slate-400">No data available yet</p>
            </div>
          )}
        </div>

        {/* Escalation breakdown */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] anim-up d5">
          <p className="text-sm font-semibold text-slate-900 mb-1">Escalation Breakdown</p>
          <p className="text-xs text-slate-400 mb-4">By priority level</p>
          {escStats?.byPriority?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={escStats.byPriority} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="_id" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center">
                <Activity size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No escalation data</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KB stats */}
      {kbStats && (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] anim-up d6">
          <p className="text-sm font-semibold text-slate-900 mb-4">Knowledge Base Overview</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Documents", value: kbStats.totalDocuments ?? 0 },
              { label: "Indexed Chunks",  value: kbStats.totalChunks ?? 0 },
              { label: "Total Queries",   value: kbStats.totalQueries ?? 0 },
              { label: "Avg Chunks/Doc",  value: kbStats.totalDocuments ? Math.round((kbStats.totalChunks ?? 0) / kbStats.totalDocuments) : 0 },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
