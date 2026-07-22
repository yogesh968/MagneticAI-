import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { ZodError, type ZodType } from "zod";
import * as Sentry from "@sentry/node";
import { verifyAccessToken, verifySessionToken } from "../utils/jwt.js";
import { ACCESS_COOKIE } from "../utils/cookies.js";
import { isProd } from "../config/env.js";

/**
 * The httpOnly cookie is the dashboard's transport (set via the Next.js rewrite
 * proxy so it lands on the frontend origin). The Bearer header is kept for
 * non-browser API clients and the test suite.
 */
function readAccessToken(req: Request): string | undefined {
  return req.cookies?.[ACCESS_COOKIE] ?? req.headers.authorization?.replace(/^Bearer\s+/i, "");
}

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const token = readAccessToken(req);
    if (!token) return res.status(401).json({ message: "Authentication required" });
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired access token" });
  }
}

/**
 * Public widget auth. Replaces trusting a caller-supplied tenantId in the body:
 * the tenant is now read from a token this server signed at session creation.
 */
export function verifySession(req: Request, res: Response, next: NextFunction) {
  const raw = req.headers["x-session-token"];
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (!token) return res.status(401).json({ message: "Session token required" });
  try {
    req.session = verifySessionToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session token" });
  }
}

export function extractTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.tenantId || !Types.ObjectId.isValid(req.user.tenantId)) return res.status(403).json({ message: "Tenant context missing" });
  req.tenantId = new Types.ObjectId(req.user.tenantId);
  next();
}

export const rbacCheck = (...roles: string[]) => (req: Request, res: Response, next: NextFunction) =>
  req.user && roles.includes(req.user.role) ? next() : res.status(403).json({ message: "Insufficient permissions" });

export const validate = (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
  try { req.body = schema.parse(req.body); next(); } catch (error) { next(error); }
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) return res.status(400).json({ message: "Validation failed", issues: error.flatten() });
  if ((error as { type?: string }).type === "entity.too.large") return res.status(413).json({ message: "Payload too large" });
  if ((error as { code?: string }).code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "Uploaded file is too large. Maximum size is 10MB." });
  if ((error as { name?: string }).name === "CastError") return res.status(400).json({ message: "Invalid resource identifier" });
  if ((error as { code?: number }).code === 11000) return res.status(409).json({ message: "A resource with that value already exists" });
  // A bad/expired token is a client error; it used to fall through to a 500 that
  // echoed the raw jsonwebtoken message back to the caller.
  const name = (error as { name?: string }).name;
  if (name === "JsonWebTokenError" || name === "TokenExpiredError" || name === "NotBeforeError") {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
  console.error(error);
  const status = (error as { status?: number }).status ?? 500;
  // Report genuine server faults to Sentry (a no-op when SENTRY_DSN is unset).
  // Client errors (4xx) are handled above and never reach here.
  if (status >= 500) Sentry.captureException(error);
  // Never leak internal exception text in production.
  const message = status >= 500 && isProd ? "Internal server error" : (error as Error).message || "Internal server error";
  res.status(status).json({ message });
};
