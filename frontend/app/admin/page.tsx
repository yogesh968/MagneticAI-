"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
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

export default function AdminOverviewPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [charts, setCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") ?? "{}");
    setUser(u);
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
    { icon: Building2, label: "Tenants",        href: "/admin/tenants", color: "violet" },
    { icon: Users,     label: "All Users",       href: "/admin/users",   color: "blue" },
    { icon: Activity,  label: "Platform Stats",  href: "/admin/stats",   color: "emerald" },
    { icon: Database,  label: "System Health",   href: "/admin/system",  color: "orange" },
  ];

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="anim-up flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
            {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Admin Overview"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{today} · Platform-wide overview</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
          <ShieldCheck size={13} className="text-violet-600" />
          <span className="text-xs font-semibold text-violet-700 capitalize">{user?.role ?? "Admin"} Portal</span>
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
        {quickLinks.map(({ icon: Icon, label, href, color }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] hover:border-violet-200 hover:shadow-[0_4px_16px_0_rgb(124,58,237,0.08)] hover:-translate-y-0.5 transition-all text-left"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-${color}-50 border border-${color}-100`}>
              <Icon size={18} className={`text-${color}-600`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">Manage →</p>
            </div>
            <ArrowRight size={14} className="text-slate-300 group-hover:text-violet-500 shrink-0 transition-colors" />
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] anim-up d4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Platform Activity</p>
            <p className="text-xs text-slate-400 mt-0.5">Last 30 days — conversations & escalations</p>
          </div>
          <div className="flex gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-3 rounded-full bg-violet-500" /> Conversations
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-3 rounded-full bg-red-400" /> Escalations
            </span>
          </div>
        </div>
        {charts.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Activity size={18} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-400 font-medium">No activity data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={charts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.13} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="conversations" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gv)" dot={false} name="Conversations" />
              <Area type="monotone" dataKey="escalations"  stroke="#f87171" strokeWidth={2}   fill="url(#gr)" dot={false} name="Escalations" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Onboarding hint */}
      {!overview?.totalConversations && (
        <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/30 p-8 text-center anim-up d5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 mx-auto mb-3">
            <Bot size={24} className="text-violet-600" />
          </div>
          <p className="font-semibold text-slate-800">No platform activity yet</p>
          <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">
            Seed demo data or have tenants embed the widget to see activity here.
          </p>
          <button
            onClick={() => router.push("/admin/tenants")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            <Globe size={14} /> Manage Tenants
          </button>
        </div>
      )}
    </div>
  );
}
