"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, Building2, BarChart3,
  ShieldCheck, LogOut, ChevronRight, Settings, Globe,
} from "lucide-react";

const NAV = [
  { href: "/admin",         label: "Overview",      icon: LayoutDashboard, exact: true },
  { href: "/admin/tenants", label: "Tenants",        icon: Building2 },
  { href: "/admin/users",   label: "All Users",      icon: Users },
  { href: "/admin/stats",   label: "Platform Stats", icon: BarChart3 },
  { href: "/admin/system",  label: "System",         icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState<any>(null);

  const isLoginPage = pathname === "/admin/login";

  // All hooks MUST be called unconditionally — guard logic inside effect
  useEffect(() => {
    if (isLoginPage) return; // skip auth check on login page itself
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { router.replace("/admin/login"); return; }
    const u = JSON.parse(stored);
    if (!["admin", "superadmin"].includes(u.role)) {
      router.replace("/dashboard");
      return;
    }
    setUser(u);
  }, [router, pathname, isLoginPage]);

  // Login page — render bare with no sidebar
  if (isLoginPage) return <>{children}</>;

  const logout = () => { localStorage.clear(); router.replace("/admin/login"); };

  const isActive = (item: typeof NAV[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const crumb = NAV.find((n) => isActive(n))?.label ?? "Admin";

  return (
    <div className="flex h-full" style={{ background: "#0f172a" }}>
      {/* Dark sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10" style={{ background: "#0f172a" }}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg">
            <ShieldCheck size={17} className="text-white" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-white leading-none">Admin Portal</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400 mt-0.5">Magentic AI</p>
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-violet-600 text-white shadow-[0_2px_8px_0_rgb(124,58,237,0.4)]"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={12} className="text-violet-300" />}
              </Link>
            );
          })}

          <div className="pt-4 mt-3 border-t border-white/10">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-white/10 hover:text-white transition-all"
            >
              <Globe size={15} />
              Back to Dashboard
            </Link>
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-3">
          {user && (
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/10 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
                <p className="truncate text-[11px] text-slate-500 capitalize">{user.role}</p>
              </div>
              <button onClick={logout} title="Sign out" className="text-slate-500 hover:text-red-400 transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <nav className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-violet-600 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Admin
            </span>
            {crumb !== "Overview" && (
              <>
                <ChevronRight size={13} className="text-slate-300" />
                <span className="font-semibold text-slate-800">{crumb}</span>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3">
            {user && <span className="text-xs text-slate-500 font-medium">{user.name}</span>}
            <span className="flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200/60 px-3 py-1.5 text-[11px] font-bold text-violet-700 uppercase tracking-wider">
              <ShieldCheck size={11} /> Admin Portal
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
