import { jwtVerify } from "jose";
import type { Role } from "./routes";

export const ACCESS_COOKIE = "mg_at";
export const REFRESH_COOKIE = "mg_rt";
export const SESSION_HINT_COOKIE = "mg_session";

export type Session = { id: string; tenantId: string; role: Role; name?: string };

/**
 * These must match the backend's JWT_SECRET / JWT_REFRESH_SECRET. They are read
 * server-side only (no NEXT_PUBLIC_ prefix) and never reach the browser — the
 * middleware runs on the server, so verifying here is genuine, not decorative.
 */
const accessSecret = process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

const encode = (s: string) => new TextEncoder().encode(s);

async function verify(token: string, secret: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, encode(secret), { algorithms: ["HS256"] });
    if (!payload.id || !payload.tenantId || !payload.role) return null;
    return {
      id: String(payload.id),
      tenantId: String(payload.tenantId),
      role: payload.role as Role,
      name: payload.name ? String(payload.name) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the caller's session from cookies.
 *
 * Falls back to the refresh token because the access token only lives 15
 * minutes: without the fallback, anyone idle longer than that would be bounced
 * to /login on their next navigation even though their session is still valid.
 * When only the refresh token verifies, the page still renders and the axios
 * interceptor silently mints a new access token on its first API call.
 */
export async function getSession(cookies: {
  get: (name: string) => { value: string } | undefined;
}): Promise<Session | null> {
  if (!accessSecret || !refreshSecret) {
    // Fail closed. A misconfigured deploy must not silently disable the gate.
    console.error("[auth] JWT_SECRET / JWT_REFRESH_SECRET are not set — refusing to authorize any request.");
    return null;
  }

  const access = cookies.get(ACCESS_COOKIE)?.value;
  if (access) {
    const session = await verify(access, accessSecret);
    if (session) return session;
  }

  const refresh = cookies.get(REFRESH_COOKIE)?.value;
  if (refresh) return verify(refresh, refreshSecret);

  return null;
}
