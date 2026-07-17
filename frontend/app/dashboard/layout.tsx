import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import DashboardShell from "./DashboardShell";

/**
 * Server component: the session is resolved before anything renders, so the
 * shell never appears for an unauthenticated visitor. The middleware already
 * gates this route — these redirects are defence in depth for the case where
 * the matcher and the layout ever disagree.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(cookies());
  if (!session) redirect("/login");
  if (session.role === "superadmin") redirect("/admin");

  return <DashboardShell user={{ name: session.name ?? "User", role: session.role }}>{children}</DashboardShell>;
}
