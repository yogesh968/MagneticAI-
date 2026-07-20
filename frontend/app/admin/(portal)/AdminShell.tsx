"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Users, Building2, BarChart3,
  ShieldCheck, LogOut, ChevronRight, Settings, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { startNavProgress } from "@/components/brand/NavProgress";
import { LogoutDialog } from "@/components/brand/LogoutDialog";
import { AuthLoader } from "@/components/brand/AuthLoader";

const NAV = [
  { href: "/admin",         label: "Overview",      icon: LayoutDashboard, exact: true },
  { href: "/admin/tenants", label: "Tenants",        icon: Building2 },
  { href: "/admin/users",   label: "All Users",      icon: Users },
  { href: "/admin/stats",   label: "Platform Stats", icon: BarChart3 },
  { href: "/admin/system",  label: "System",         icon: Settings },
];

export type AdminUser = { name: string; role: string };

/**
 * Presentation only — the session is resolved server-side in layout.tsx, so
 * unlike the previous version nothing here renders before the user is known.
 */
export default function AdminShell({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const doLogout = async () => {
    if (loggingOut) return;
    setConfirmLogout(false);
    setLoggingOut(true);
    startNavProgress();
    await api.post("/auth/logout").catch(() => {});
    router.replace("/admin/login");
    router.refresh();
  };

  const isActive = (item: typeof NAV[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const crumb = NAV.find((n) => isActive(n))?.label ?? "Admin";

  return (
    <div className="flex h-full bg-[#0A0A0B]">
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

      {/* Dark sidebar — matches DashboardShell's dark surface treatment */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-[#1C1C20] bg-[#0A0A0B]">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-[#1C1C20] px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 shadow-accent">
            <ShieldCheck size={17} className="text-white" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-white leading-none">Admin Portal</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8A8A8F] mt-0.5">Astrex.ai</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive({ href, label, icon: Icon, exact });
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? "bg-accent-500 text-white shadow-[0_6px_16px_-8px_rgba(68,83,214,.9)]"
                    : "text-[#A1A1AA] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={12} className="text-white/70" />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-[#1C1C20] p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-xs font-bold text-white">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
              <p className="truncate text-[11px] text-[#71717A] capitalize">{user.role}</p>
            </div>
          </div>

          <button
            onClick={() => setConfirmLogout(true)}
            disabled={loggingOut}
            aria-label="Sign out"
            className="group/logout mt-1 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-[14px] font-semibold text-white transition-all duration-200 hover:border-red-500/60 hover:bg-white/[.07] hover:shadow-[0_10px_24px_-10px_rgba(220,38,38,.6)] active:scale-[.985] disabled:opacity-60"
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
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-canvas">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-hairline bg-white px-6 shadow-xs">
          <nav className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-ink flex items-center gap-1.5">
              <ShieldCheck size={14} /> Admin
            </span>
            {crumb !== "Overview" && (
              <>
                <ChevronRight size={13} className="text-ink-faint" />
                <span className="font-semibold text-ink">{crumb}</span>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-muted font-medium">{user.name}</span>
            <span className="flex items-center gap-1.5 rounded-full bg-sunken border border-hairline px-3 py-1.5 text-[11px] font-bold text-ink uppercase tracking-wider">
              <ShieldCheck size={11} /> Admin Portal
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
