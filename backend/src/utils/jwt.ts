import jwt from "jsonwebtoken";
import { env, widgetSecret } from "../config/env.js";

export type Role = "superadmin" | "admin" | "agent";

export type TokenPayload = {
  id: string;
  tenantId: string;
  role: Role;
  /** Carried so socket handoff messages can name the agent without a DB round-trip. */
  name?: string;
  /** Bumped on logout/password reset to invalidate every outstanding refresh token. */
  tokenVersion: number;
};

/** Signed at createSession and presented by the widget instead of a raw tenantId. */
export type SessionPayload = {
  sessionId: string;
  tenantId: string;
  conversationId: string;
};

const ALG = "HS256" as const;

export const signAccessToken = (payload: TokenPayload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m", algorithm: ALG });

export const signRefreshToken = (payload: TokenPayload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "7d", algorithm: ALG });

// Pinning `algorithms` stops a token signed with a different alg from ever being
// considered — jsonwebtoken v9 rejects `alg: none`, but this makes it explicit.
export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALG] }) as TokenPayload & { typ?: string };
  // Socket tickets share this secret; they must not authenticate REST calls.
  if (decoded.typ === "socket") throw new Error("Socket ticket is not valid for API access");
  return decoded;
}

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [ALG] }) as TokenPayload;

/** Widget sessions live as long as a chat plausibly does, not as long as a login. */
export const signSessionToken = (payload: SessionPayload) =>
  jwt.sign(payload, widgetSecret, { expiresIn: "24h", algorithm: ALG });

export const verifySessionToken = (token: string) =>
  jwt.verify(token, widgetSecret, { algorithms: [ALG] }) as SessionPayload;

/**
 * Socket.IO connects straight to this server from the dashboard's origin, so the
 * httpOnly auth cookie is never sent and the browser cannot read it to pass along.
 * The dashboard therefore exchanges its cookie for one of these short-lived
 * tickets over the proxied REST API.
 *
 * `typ: "socket"` is checked on verify so a leaked ticket cannot be replayed
 * against the REST API as an access token, and the 2-minute TTL keeps the
 * exposure window small since this value does reach JS.
 */
export type SocketTicket = TokenPayload & { typ: "socket" };

export const signSocketTicket = (payload: TokenPayload) =>
  jwt.sign({ ...payload, typ: "socket" }, env.JWT_SECRET, { expiresIn: "2m", algorithm: ALG });

export function verifySocketTicket(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALG] }) as SocketTicket;
  if (decoded.typ !== "socket") throw new Error("Not a socket ticket");
  return decoded;
}
