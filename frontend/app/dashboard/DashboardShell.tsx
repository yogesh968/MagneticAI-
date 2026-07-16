"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, BookOpen, Bot, LogOut, MessageSquare,
  TicketCheck, Zap, AlertTriangle, LayoutDashboard,
  ChevronRight, Bell, Code2, Plug, Users, X, Menu,
  ShieldCheck, Headphones, Settings,
} from "lucide-react";
import { api } from "@/lib/api";
import { DASHBOARD_NAV, matches, navFor, type Role } from "@/lib/routes";

const ICONS: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/conversations": MessageSquare,
  "/dashboard/tickets": TicketCheck,
  "/dashboard/escalations": AlertTriangle,
  "/dashboard/bots": Bot,
  "/dashboard/knowledge-base": BookOpen,
  "/dashboard/analytics": BarChart3,
  "/dashboard/ai-config": Bot,
  "/dashboard/team": Users,
  "/dashboard/widget": Code2,
  "/dashboard/integrations": Plug,
};

const GROUPS = [
  { label: "Overview",  hrefs: ["/dashboard"] },
  { label: "Support",   hrefs: ["/dashboard/conversations", "/dashboard/tickets", "/dashboard/escalations"] },
  { label: "AI",        hrefs: ["/dashboard/bots", "/dashboard/knowledge-base", "/dashboard/ai-config"] },
  { label: "Platform",  hrefs: ["/dashboard/analytics"] },
  { label: "Manage",    hrefs: ["/dashboard/team", "/dashboard/widget", "/dashboard/integrations"] },
];

// Per-role theming
const ROLE_THEME = {
  admin: {
    gradient: "from-blue-600 to-indigo-700",
    accent: "bg-blue-600",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    badgeLabel: "Admin",
    icon: ShieldCheck,
    avatarGradient: "from-blue-500 to-indigo-600",
    topbarBadge: "bg-blue-50 border-blue-200 text-blue-700",
    topbarDot: "bg-blue-500",
    navActive: "bg-blue-50 text-blue-700 font-semibold hover:bg-blue-50",
    platformLabel: "Support Platform",
  },
  agent: {
    gradient: "from-emerald-500 to-teal-600",
    accent: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    badgeLabel: "Agent",
    icon: Headphones,
    avatarGradient: "from-emerald-500 to-teal-600",
    topbarBadge: "bg-emerald-50 border-emerald-200 text-emerald-700",
    topbarDot: "bg-emerald-500",
    navActive: "bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-50",
    platformLabel: "Agent Workspace",
  },
  superadmin: {
    gradient: "from-violet-600 to-purple-700",
    accent: "bg-violet-600",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    badgeLabel: "Super Admin",
    icon: ShieldCheck,
    avatarGradient: "from-violet-500 to-purple-600",
    topbarBadge: "bg-violet-50 border-violet-200 text-violet-700",
    topbarDot: "bg-violet-500",
    navActive: "bg-violet-50 text-violet-700 font-semibold hover:bg-violet-50",
    platformLabel: "Super Admin",
  },
};

export type ShellUser = { name: string; role: Role };

/**
 * Presentation only. The session is resolved server-side in layout.tsx and the
 * middleware has already enforced access, so there is no auth check here and
 * nothing renders before the user is known.
 */
export default function DashboardShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openTickets, setOpenTickets] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api.get("/analytics/overview").then((r) => setOpenTickets(r.data.openTickets ?? 0)).catch(() => {});
  }, [pathname]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const logout = async () => {
    // Revokes server-side (bumps tokenVersion) and clears the httpOnly cookies;
    // a client-side clear alone could not do either.
    await api.post("/auth/logout").catch(() => {});
    router.replace("/login");
    router.refresh();
  };

  const role = user.role;
  const theme = ROLE_THEME[role] ?? ROLE_THEME.agent;
  const RoleIcon = theme.icon;

  const nav = navFor(role);
  const groups = GROUPS.map((g) => ({
    label: g.label,
    items: nav.filter((n) => g.hrefs.includes(n.href)),
  })).filter((g) => g.items.length > 0);

  const activeItem = nav.find((n) => matches(n, pathname));
  const crumb = activeItem?.label ?? "Dashboard";

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white">

      {/* ── Role-colored header strip ── */}
      <div className={`bg-gradient-to-br ${theme.gradient} px-4 py-4`}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-sm">
            <Zap size={15} className="text-white" fill="white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white leading-none">Magentic AI</p>
            <p className="text-[10px] font-medium text-white/60 mt-0.5">{theme.platformLabel}</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden rounded-lg p-1 text-white/60 hover:text-white hover:bg-white/10">
            <X size={15} />
          </button>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2">
          <RoleIcon size={13} className="text-white shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white leading-none">{user.name}</p>
            <p className="text-[10px] text-white/60 mt-0.5">{theme.badgeLabel}</p>
          </div>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide">
            {role}
          </span>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400/80">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.href] ?? LayoutDashboard;
                const active = matches(item, pathname);
                const showBadge = item.badge && openTickets > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      active
                        ? `${theme.navActive} border border-transparent`
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {showBadge && (
                      <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        active ? "bg-white/80 text-slate-700" : "bg-red-500 text-white"
                      }`}>
                        {openTickets > 99 ? "99+" : openTickets}
                      </span>
                    )}
                    {active && !showBadge && <ChevronRight size={12} className="opacity-50" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${theme.avatarGradient} text-xs font-bold text-white shadow-sm`}>
            {user.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-900 leading-tight">{user.name}</p>
            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide mt-0.5 ${theme.badge}`}>
              <RoleIcon size={8} />
              {theme.badgeLabel}
            </span>
          </div>
          <button onClick={logout} title="Sign out" className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-[#f0f2f5]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] border-r border-slate-200/60 shadow-[1px_0_0_0_rgb(226,232,240,0.6)] md:block">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 h-full w-[220px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-[220px]">

        {/* ── Topbar ── */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/90 px-5 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition-colors md:hidden">
              <Menu size={18} />
            </button>
            <nav className="flex items-center gap-1.5 text-sm">
              <span className="text-slate-400 font-medium hidden sm:block">Dashboard</span>
              {crumb !== "Overview" && (
                <>
                  <ChevronRight size={13} className="text-slate-300 hidden sm:block" />
                  <span className="font-semibold text-slate-800">{crumb}</span>
                </>
              )}
              {crumb === "Overview" && (
                <span className="font-semibold text-slate-800 sm:hidden">Dashboard</span>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Role pill — clearly visible */}
            <div className={`hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${theme.topbarBadge}`}>
              <RoleIcon size={11} />
              <span className="text-[11px] font-bold uppercase tracking-wide">{theme.badgeLabel}</span>
            </div>

            {/* Live dot */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-50 px-3 py-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${theme.topbarDot} anim-dot`} />
              <span className="text-[11px] font-semibold text-slate-600 tracking-wide">Live</span>
            </div>

            {/* Notification bell */}
            {openTickets > 0 && (
              <button
                onClick={() => router.push("/dashboard/escalations")}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <Bell size={16} />
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
                  {openTickets > 9 ? "9+" : openTickets}
                </span>
              </button>
            )}

            {/* Role-colored avatar */}
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.avatarGradient} text-xs font-bold text-white shadow-sm`}>
              {user.name[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
