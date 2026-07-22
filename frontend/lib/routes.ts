export type Role = "superadmin" | "admin" | "agent";

export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  roles: Role[];
  badge?: boolean;
};

/**
 * Single source of truth for which roles may reach which dashboard route.
 * Both the Next.js middleware (server-side gate) and the sidebar (which links to
 * render) read this, so the nav can never drift out of sync with the gate.
 *
 * This is a routing policy, not a security boundary — the API independently
 * enforces the same rules on every request.
 */
export const DASHBOARD_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", exact: true, roles: ["admin", "agent", "superadmin"] },
  { href: "/dashboard/conversations", label: "Conversations", roles: ["admin", "agent", "superadmin"] },
  { href: "/dashboard/tickets", label: "Tickets", roles: ["admin", "agent", "superadmin"] },
  { href: "/dashboard/escalations", label: "Escalations", badge: true, roles: ["admin", "agent", "superadmin"] },
  { href: "/dashboard/bots", label: "Bots", roles: ["admin", "superadmin"] },
  { href: "/dashboard/knowledge-base", label: "Knowledge Base", roles: ["admin", "superadmin"] },
  { href: "/dashboard/analytics", label: "Analytics", roles: ["admin", "superadmin"] },
  { href: "/dashboard/ai-config", label: "AI Config", roles: ["admin", "superadmin"] },
  { href: "/dashboard/team", label: "Team", roles: ["admin", "superadmin"] },
  { href: "/dashboard/widget", label: "Widget", roles: ["admin", "superadmin"] },
  { href: "/dashboard/integrations", label: "Integrations", roles: ["admin", "superadmin"] },
  { href: "/dashboard/billing", label: "Billing", roles: ["admin", "superadmin"] },
];

export const navFor = (role: Role) => DASHBOARD_NAV.filter((n) => n.roles.includes(role));

export const matches = (item: NavItem, pathname: string) =>
  item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

export const canAccessDashboardPath = (role: Role, pathname: string) =>
  navFor(role).some((n) => matches(n, pathname));

/** Routes reachable without a session. Everything else under /dashboard and /admin is gated. */
export const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/admin/login",
  "/widget-demo",
];

export const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/widget-demo/");
