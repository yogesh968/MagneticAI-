import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { canAccessDashboardPath, isPublicPath } from "@/lib/routes";

/**
 * Server-side route protection.
 *
 * This runs before any page renders, so an unauthenticated visitor never sees
 * the dashboard shell, never fires a doomed API call, and never gets a flash of
 * content before a client-side redirect. It replaces the previous useEffect
 * guards that read a user-editable localStorage blob after first paint.
 *
 * The API is still the security boundary and re-checks every request; this gate
 * decides what renders.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await getSession(req.cookies);

  // Signed-in users have no business on the login/register screens.
  if (session && (pathname === "/login" || pathname === "/register" || pathname === "/admin/login")) {
    return NextResponse.redirect(new URL(session.role === "superadmin" ? "/admin" : "/dashboard", req.url));
  }

  if (isPublicPath(pathname)) return NextResponse.next();

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isDashboardArea = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (!isAdminArea && !isDashboardArea) return NextResponse.next();

  if (!session) {
    const login = new URL(isAdminArea ? "/admin/login" : "/login", req.url);
    // Bounce the user back where they were headed once they sign in.
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (isAdminArea) {
    if (session.role !== "superadmin") return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  // Superadmins belong in the admin portal, not the tenant dashboard.
  if (session.role === "superadmin") return NextResponse.redirect(new URL("/admin", req.url));

  if (!canAccessDashboardPath(session.role, pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the API proxy, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|widget.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
