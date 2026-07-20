"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, BookOpen, Bot, LogOut, MessageSquare, TicketCheck,
  AlertTriangle, LayoutDashboard, ChevronRight, Bell, Code2, Plug,
  Users, X, Menu, Search, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Logo } from "@/components/brand/Logo";
import { startNavProgress } from "@/components/brand/NavProgress";
import { LogoutDialog } from "@/components/brand/LogoutDialog";
import { AuthLoader } from "@/components/brand/AuthLoader";
import { matches, navFor, type Role } from "@/lib/routes";

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
  { label: "Workspace", hrefs: ["/dashboard"] },
  { label: "Support", hrefs: ["/dashboard/conversations", "/dashboard/tickets", "/dashboard/escalations"] },
  { label: "Knowledge", hrefs: ["/dashboard/bots", "/dashboard/knowledge-base", "/dashboard/ai-config"] },
  { label: "Platform", hrefs: ["/dashboard/analytics"] },
  { label: "Manage", hrefs: ["/dashboard/team", "/dashboard/widget", "/dashboard/integrations"] },
];

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", agent: "Agent", superadmin: "Super Admin" };

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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Once per mount, not per navigation: the badge is ambient, and refetching it
  // on every route change duplicated a request each screen already makes.
  useEffect(() => {
    api.get("/analytics/overview").then((r) => setOpenTickets(r.data.openTickets ?? 0)).catch(() => {});
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const doLogout = async () => {
    if (loggingOut) return;
    setConfirmLogout(false);
    setLoggingOut(true);
    startNavProgress();
    // Revokes server-side (bumps tokenVersion) and clears the httpOnly cookies;
    // a client-side clear alone could not do either.
    await api.post("/auth/logout").catch(() => {});
    router.replace("/login");
    router.refresh();
  };

  // Programmatic jumps (search / bell) get the same top-bar feedback as links.
  const go = (href: string) => {
    startNavProgress();
    router.push(href);
  };

  const nav = navFor(user.role);
  const groups = GROUPS.map((g) => ({
    label: g.label,
    items: nav.filter((n) => g.hrefs.includes(n.href)),
  })).filter((g) => g.items.length > 0);

  const crumb = nav.find((n) => matches(n, pathname))?.label ?? "Dashboard";
  const initials = user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-hairline px-[22px] pb-[18px] pt-[22px]">
        <Link href="/dashboard">
          <Logo mode="light" size={34} />
        </Link>
        <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 text-ink-faint hover:text-ink md:hidden">
          <X size={16} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-[.13em] text-ink-faint">
              {group.label}
            </div>
            <div className="flex flex-col gap-[3px]">
              {group.items.map((item) => {
                const Icon = ICONS[item.href] ?? LayoutDashboard;
                const active = matches(item, pathname);
                const showBadge = item.badge && openTickets > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150 ${
                      active
                        ? "bg-accent-50 font-semibold text-accent-700"
                        : "text-ink-muted hover:bg-sunken hover:text-ink"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent-500" />}
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className={`flex-none ${active ? "text-accent-600" : "text-ink-faint group-hover:text-ink-muted"}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {showBadge && (
                      <span
                        className={`rounded-full px-[7px] py-0.5 text-[10.5px] font-bold ${
                          active ? "bg-accent-500 text-white" : "bg-accent-50 text-accent-600"
                        }`}
                      >
                        {openTickets > 99 ? "99+" : openTickets}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-hairline p-3">
        <div className="flex items-center gap-2.5 rounded-2xl border border-hairline bg-sunken/60 p-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-xs font-bold text-white shadow-accent">
            {initials}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13.5px] font-semibold text-ink">{user.name}</div>
            <div className="text-[11px] font-medium text-ink-muted">{ROLE_LABEL[user.role]}</div>
          </div>
        </div>

        <button
          onClick={() => setConfirmLogout(true)}
          disabled={loggingOut}
          aria-label="Sign out"
          className="group/logout mt-2 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[#2A2E3D] bg-[#181B26] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_2px_10px_-4px_rgba(18,20,42,.35)] transition-all duration-200 hover:border-red-500/60 hover:bg-[#1E2130] hover:shadow-[0_10px_24px_-10px_rgba(220,38,38,.55)] active:scale-[.985] disabled:opacity-60"
        >
          {loggingOut ? (
            <>
              <Loader2 size={16} className="animate-spin text-red-400" />
              Signing out…
            </>
          ) : (
            <>
              <LogOut size={16} className="text-red-400 transition-transform duration-200 group-hover/logout:translate-x-0.5" />
              Log out
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <LogoutDialog
        open={confirmLogout && !loggingOut}
        user={user}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={doLogout}
      />
      {loggingOut && (
        <AuthLoader
          title="Signing you out"
          variant="swarm"
          steps={["Closing your session", "Clearing credentials", "See you soon"]}
        />
      )}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] border-r border-hairline md:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 h-full w-[252px]" onClick={(e) => e.stopPropagation()}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col md:ml-[252px]">
        <header className="sticky top-0 z-20 flex h-[66px] shrink-0 items-center gap-4 border-b border-hairline bg-canvas/85 px-4 backdrop-blur-[12px] sm:px-[26px]">
          <button onClick={() => setMobileOpen(true)} className="rounded-[11px] border border-hairline bg-white p-2 text-ink-soft md:hidden">
            <Menu size={18} />
          </button>

          <nav className="flex items-center gap-2 text-sm">
            <span className="hidden font-medium text-ink-muted sm:block">Dashboard</span>
            {crumb !== "Overview" && (
              <>
                <ChevronRight size={13} className="hidden text-ink-faint sm:block" />
                <span className="font-semibold text-ink">{crumb}</span>
              </>
            )}
            {crumb === "Overview" && <span className="font-semibold text-ink sm:hidden">Dashboard</span>}
          </nav>

          {/* Design shows a global search here; there is no search endpoint yet, so
              this navigates to conversations, which is the only searchable list. */}
          <button
            onClick={() => go("/dashboard/conversations")}
            className="ml-auto hidden items-center gap-2.5 rounded-[11px] border border-hairline bg-white px-3.5 py-2 text-sm text-ink-muted transition-colors hover:border-hairline-strong lg:flex lg:w-[280px]"
          >
            <Search size={16} strokeWidth={2} />
            <span className="flex-1 text-left">Search conversations…</span>
          </button>

          <div className="ml-auto flex items-center gap-2.5 lg:ml-0">
            {openTickets > 0 && (
              <button
                onClick={() => go("/dashboard/escalations")}
                title={`${openTickets} open ticket${openTickets === 1 ? "" : "s"}`}
                className="relative flex h-10 w-10 items-center justify-center rounded-[11px] border border-hairline bg-white text-ink-soft transition-colors hover:border-hairline-strong"
              >
                <Bell size={19} strokeWidth={1.8} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-canvas bg-accent-500" />
              </button>
            )}
            <div className="flex items-center gap-2.5 rounded-[13px] border border-hairline bg-white/70 py-1 pl-1 pr-3 shadow-[0_1px_2px_rgba(18,20,42,.05)]">
              <span className="relative flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-gradient-to-br from-accent-500 to-accent-700 font-tight text-[13px] font-bold text-white shadow-accent">
                {initials}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block max-w-[120px] truncate text-[13px] font-semibold text-ink">{user.name}</span>
                <span className="mono-tick block">{ROLE_LABEL[user.role]}</span>
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
