"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, BookOpen, Bot, LogOut, MessageSquare,
  TicketCheck, Zap, AlertTriangle, LayoutDashboard,
  ChevronRight, Bell, Code2, Plug, Users,
} from "lucide-react";
import { api } from "@/lib/api";

const ALL_NAV = [
  { href: "/dashboard",                label: "Dashboard",      icon: LayoutDashboard, exact: true,   roles: ["admin", "agent", "superadmin"] },
  { href: "/dashboard/conversations",  label: "Conversations",  icon: MessageSquare,                  roles: ["admin", "agent", "superadmin"] },
  { href: "/dashboard/tickets",        label: "Tickets",        icon: TicketCheck,                    roles: ["admin", "agent", "superadmin"] },
  { href: "/dashboard/escalations",    label: "Escalations",    icon: AlertTriangle,   badge: true,   roles: ["admin", "agent", "superadmin"] },
  { href: "/dashboard/knowledge-base", label: "Knowledge Base", icon: BookOpen,                       roles: ["admin", "superadmin"] },
  { href: "/dashboard/analytics",      label: "Analytics",      icon: BarChart3,                      roles: ["admin", "superadmin"] },
  { href: "/dashboard/ai-config",      label: "AI Config",      icon: Bot,                            roles: ["admin", "superadmin"] },
  { href: "/dashboard/team",           label: "Team",           icon: Users,                          roles: ["admin", "superadmin"] },
  { href: "/dashboard/widget",         label: "Widget",         icon: Code2,                          roles: ["admin", "superadmin"] },
  { href: "/dashboard/integrations",   label: "Integrations",   icon: Plug,                           roles: ["admin", "superadmin"] },
];

const GROUP_DEFS = [
  { label: "OVERVIEW",      hrefs: ["/dashboard"] },
  { label: "SUPPORT",       hrefs: ["/dashboard/conversations", "/dashboard/tickets", "/dashboard/escalations"] },
  { label: "PLATFORM",      hrefs: ["/dashboard/knowledge-base", "/dashboard/analytics", "/dashboard/ai-config"] },
  { label: "MANAGE",        hrefs: ["/dashboard/team", "/dashboard/widget", "/dashboard/integrations"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [openTickets, setOpenTickets] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");
    if (!stored || !token) { router.replace("/login"); return; }
    const u = JSON.parse(stored);
    setUser(u);

    // Route guard: redirect if current page is not allowed for this role
    const allowed = ALL_NAV.filter((n) => n.roles.includes(u.role));
    const isAllowed = allowed.some((n) => n.exact ? pathname === n.href : pathname.startsWith(n.href));
    if (!isAllowed) { router.replace("/dashboard"); return; }

    api.get("/analytics/overview")
      .then((r) => setOpenTickets(r.data.openTickets ?? 0))
      .catch(() => {});
  }, [router, pathname]);

  const logout = () => { localStorage.clear(); router.replace("/login"); };

  function isActive(item: typeof ALL_NAV[0]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  const role = user?.role ?? "agent";
  const nav = ALL_NAV.filter((n) => n.roles.includes(role));

  const groups = GROUP_DEFS.map((g) => ({
    label: g.label,
    items: nav.filter((n) => g.hrefs.includes(n.href)),
  })).filter((g) => g.items.length > 0);

  const crumb = nav.find((n) => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? "Dashboard";

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_2px_8px_0_rgb(37,99,235,0.35)]">
          <Zap size={17} className="text-white" fill="white" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-slate-900 leading-tight">Magnetic AI</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Support Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badge, exact }) => {
                const active = isActive({ href, label, icon: Icon, exact: !!exact, roles: [] });
                const showBadge = badge && openTickets > 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={active ? "nav-item-active" : "nav-item"}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {showBadge && (
                      <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>
                        {openTickets > 99 ? "99+" : openTickets}
                      </span>
                    )}
                    {active && !showBadge && <ChevronRight size={13} className="ml-auto opacity-40" />}
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
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors group">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
              {user.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 leading-tight">{user.name}</p>
              <p className="truncate text-[10px] font-medium capitalize text-slate-400 leading-tight mt-0.5">{user.role}</p>
            </div>
            <button onClick={logout} title="Sign out" className="shrink-0 text-slate-300 hover:text-red-500 transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-[#f0f2f5]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/60 bg-white shadow-[1px_0_0_0_rgb(226,232,240,0.8)] md:block">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/80 px-5 backdrop-blur-md md:px-7">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <nav className="flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-400 hidden sm:block">Dashboard</span>
              {crumb !== "Dashboard" && (
                <>
                  <ChevronRight size={13} className="text-slate-300 hidden sm:block" />
                  <span className="font-semibold text-slate-800">{crumb}</span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 anim-dot" />
              <span className="text-xs font-semibold text-emerald-700">Live</span>
            </div>

            {openTickets > 0 && (
              <button
                onClick={() => router.push("/dashboard/escalations")}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors"
              >
                <Bell size={16} className="text-slate-600" />
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {openTickets > 9 ? "9+" : openTickets}
                </span>
              </button>
            )}

            {user && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                {user.name[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
