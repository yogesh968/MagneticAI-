"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading, StatCard, PageHeader } from "@/components/ui";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { BarChart3, FileText, TrendingUp, AlertTriangle, MessageSquare } from "lucide-react";

const PIE_COLORS: Record<string, string> = {
  urgent: "#ef4444", high: "#f97316", medium: "#3b82f6", low: "#94a3b8",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [charts, setCharts]       = useState<any[]>([]);
  const [kb, setKb]               = useState<any>(null);
  const [escalation, setEscalation] = useState<any>(null);
  const [overview, setOverview]   = useState<any>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/analytics/charts"),
      api.get("/analytics/kb"),
      api.get("/analytics/escalations"),
      api.get("/analytics/overview"),
    ]).then(([c, k, e, o]) => {
      setCharts(c.data); setKb(k.data);
      setEscalation(e.data); setOverview(o.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-7 space-y-5">
        <div className="anim-up">
          <div className="skeleton h-8 w-52 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className={`skeleton h-36 rounded-2xl d${i + 1}`} />)}
        </div>
        <Loading rows={4} rowH="h-52" />
      </div>
    );
  }

  const conv30  = charts.reduce((s, d) => s + (d.conversations ?? 0), 0);
  const esc30   = charts.reduce((s, d) => s + (d.escalations  ?? 0), 0);
  const pieData = (escalation?.breakdown ?? []).map((b: any) => ({ name: b._id, value: b.count }));

  return (
    <div className="p-7 space-y-5">
      <PageHeader title="Analytics" subtitle="Performance overview for the last 30 days" />

      {/* Stat row */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Conversations (30d)" value={conv30}           icon={<MessageSquare size={20} />} tone="blue"   delay="d1" />
          <StatCard label="Escalations (30d)"   value={esc30}            icon={<AlertTriangle size={20} />} tone="red"    delay="d2" />
          <StatCard label="KB Documents"         value={kb?.documents?.length ?? 0} icon={<FileText size={20} />}  tone="purple" delay="d3" />
          <StatCard label="Resolution Rate"      value={`${overview.resolutionRate}%`} icon={<TrendingUp size={20} />} tone="green"  delay="d4" />
        </div>
      )}

      {/* Area chart */}
      {charts.length > 0 && (
        <div className="card anim-up d5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="section-title">Conversations & Escalations</p>
              <p className="text-xs text-slate-400 mt-0.5">Daily volume over the last 30 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-blue-500" />Conversations</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-red-400" />Escalations</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={charts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="agc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="age" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f87171" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0" }} />
              <Area type="monotone" dataKey="conversations" stroke="#3b82f6" strokeWidth={2.5} fill="url(#agc)" dot={false} name="Conversations" />
              <Area type="monotone" dataKey="escalations"  stroke="#f87171" strokeWidth={2}   fill="url(#age)" dot={false} name="Escalations" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* KB bar + priority donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {kb?.documents?.length > 0 && (
          <div className="card anim-up d6">
            <p className="section-title mb-1">Most Referenced Documents</p>
            <p className="text-xs text-slate-400 mb-5">Top KB docs used by the AI to answer questions</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={kb.documents.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category" dataKey="name" width={140}
                  tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false}
                  tickFormatter={(v: string) => v?.length > 20 ? v.slice(0, 20) + "…" : v}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="references" fill="#3b82f6" radius={[0, 6, 6, 0]} name="References" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {pieData.length > 0 && (
          <div className="card anim-up d7">
            <p className="section-title mb-1">Ticket Priority Breakdown</p>
            <p className="text-xs text-slate-400 mb-5">Distribution of all tickets by priority</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={3} dataKey="value"
                >
                  {pieData.map((e: any) => (
                    <Cell key={e.name} fill={PIE_COLORS[e.name] ?? "#94a3b8"} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle" iconSize={9}
                  formatter={(v) => <span className="text-xs font-medium text-slate-600 capitalize">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Unanswered queries */}
      {kb?.failedQueries?.length > 0 && (
        <div className="card anim-up d8">
          <p className="section-title mb-1">Unanswered Queries</p>
          <p className="text-xs text-slate-400 mb-5">
            Questions the AI could not answer — consider adding relevant docs to your KB
          </p>
          <div className="space-y-2">
            {kb.failedQueries.slice(0, 10).map((q: any, i: number) => (
              <div key={q._id ?? i} className={`flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/30 px-4 py-3 anim-up d${Math.min(i + 1, 8)}`}>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">{i + 1}</span>
                <div>
                  <p className="text-sm text-slate-800 font-medium">{q.content}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{new Date(q.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
