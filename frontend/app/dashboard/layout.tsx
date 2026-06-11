"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, BookOpen, Bot, LogOut, MessageSquare,
  TicketCheck, Zap, AlertTriangle, LayoutDashboard,
  ChevronRight, Bell, Code2, Plug,
} from "lucide-react";
import { api } from "@/lib/api";

const NAV = [
  { href: "/dashboard",                label: "Dashboard",      icon: LayoutDashboard, exact: true },
  { href: "/dashboard/conversations",  label: "Conversations",  icon: MessageSquare },
  { href: "/dashboard/tickets",        label: "Tickets",        icon: TicketCheck },
  { href: "/dashboard/escalations",    label: "Escalations",    icon: AlertTriangle, badge: true },
  { href: "/dashboard/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/dashboard/analytics",      label: "Analytics",      icon: BarChart3 },
  { href: "/dashboard/ai-config",      label: "AI Config",      icon: Bot },
  { href: "/dashboard/widget",          label: "Widget",          icon: Code2 },
  { href: "/dashboard/integrations",   label: "Integrations",   icon: Plug },
];

const NAV_GROUPS = [
  { label: "OVERVIEW", items: NAV.slice(0, 1) },
  { label: "SUPPORT",  items: NAV.slice(1, 4) },
  { label: "PLATFORM", items: NAV.slice(4, 7) },
  { label: "INTEGRATIONS", items: NAV.slice(7) },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [escalations, setEscalations] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    setUser(JSON.parse(stored));
    api.get("/analytics/overview").then((r) => setEscalations(r.data.openTickets ?? 0)).catch(() => {});
  }, [router]);

  const logout = () => { localStorage.clear(); router.push("/login"); };

  const crumb = NAV.find((n) => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label;

  function isActive(item: typeof NAV[0]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <div className="flex h-full bg-[#f0f2f5]">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col bg-white border-r border-slate-200/60 shadow-[1px_0_0_0_rgb(226,232,240,0.8)]">

        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-slate-100">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_2px_8px_0_rgb(37,99,235,0.35)]">
            <Zap size={17} className="text-white" fill="white" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-slate-900 tracking-tight leading-tight">Magnetic AI</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 leading-tight">Support Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon, badge }) => {
                  const active = isActive({ href, label, icon: Icon, exact: href === "/dashboard" });
                  const showBadge = badge && escalations > 0;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={active ? "nav-item-active" : "nav-item"}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      {showBadge && (
                        <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${active ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                          {escalations > 99 ? "99+" : escalations}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-slate-100 p-3">
          {user && (
            <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                {user.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 leading-tight">{user.name}</p>
                <p className="truncate text-xs text-slate-400 capitalize leading-tight mt-0.5">{user.role}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-500 hover:!text-red-500"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-7 shadow-[0_1px_0_0_rgb(226,232,240,0.6)]">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-400">Dashboard</span>
            {crumb && crumb !== "Dashboard" && (
              <>
                <ChevronRight size={13} className="text-slate-300" />
                <span className="font-semibold text-slate-800">{crumb}</span>
              </>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 anim-dot" />
              <span className="text-xs font-semibold text-emerald-700">Live</span>
            </div>

            {/* Notifications */}
            {escalations > 0 && (
              <button
                onClick={() => router.push("/dashboard/escalations")}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-[0_1px_2px_0_rgb(0,0,0,0.04)]"
              >
                <Bell size={16} className="text-slate-600" />
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {escalations > 9 ? "9+" : escalations}
                </span>
              </button>
            )}

            {/* Avatar */}
            {user && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-[0_1px_3px_0_rgb(37,99,235,0.3)]">
                {user.name[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
