import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import AdminShell from "./AdminShell";

/**
 * Wraps only the portal pages. /admin/login sits outside this route group, so
 * it no longer depends on a `pathname === "/admin/login"` check inside the
 * layout to stay reachable — the old arrangement turned into a redirect loop if
 * that path ever changed.
 */
export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(cookies());
  if (!session) redirect("/admin/login");
  if (session.role !== "superadmin") redirect("/dashboard");

  return <AdminShell user={{ name: session.name ?? "Admin", role: session.role }}>{children}</AdminShell>;
}
