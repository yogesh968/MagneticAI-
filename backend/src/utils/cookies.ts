import type { CookieOptions, Response } from "express";
import { isProd } from "../config/env.js";

export const ACCESS_COOKIE = "mg_at";
export const REFRESH_COOKIE = "mg_rt";
/** Readable by JS on purpose: lets the client render role-specific UI without decoding the JWT. */
export const SESSION_HINT_COOKIE = "mg_session";

const FIFTEEN_MIN = 15 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * SameSite=Lax is only safe because the dashboard reaches the API through the
 * Next.js rewrite proxy, making every authenticated call same-origin. Lax then
 * withholds the cookie on cross-site POSTs, which is our CSRF defence.
 * Do not switch this to None without adding CSRF tokens.
 */
const base: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: FIFTEEN_MIN });
  // path="/" rather than "/api/auth" so the Next.js middleware can see it. The
  // access token only lives 15m, so without the refresh token in scope the
  // middleware would bounce anyone idle for longer than that straight to /login.
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base, maxAge: SEVEN_DAYS });
}

/** Mirrors non-sensitive claims for the client. Never trust this for authorization. */
export function setSessionHint(res: Response, user: { role: string; tenantId: string; name?: string }) {
  res.cookie(SESSION_HINT_COOKIE, JSON.stringify({ role: user.role, tenantId: user.tenantId, name: user.name }), {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...base });
  res.clearCookie(REFRESH_COOKIE, { ...base });
  res.clearCookie(SESSION_HINT_COOKIE, { ...base, httpOnly: false });
}
