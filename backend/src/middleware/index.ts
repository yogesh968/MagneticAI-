import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { ZodError, type ZodType } from "zod";
import { verifyAccessToken } from "../utils/jwt.js";

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ message: "Authentication required" });
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired access token" });
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
  console.error(error);
  res.status((error as { status?: number }).status ?? 500).json({ message: (error as Error).message || "Internal server error" });
};
