import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { forgotPassword, inviteMember, login, me, refresh, register, removeMember, resetPassword } from "../controllers/auth.controller.js";
import { extractTenant, rbacCheck, validate, verifyJWT } from "../middleware/index.js";

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });

export const authRouter = Router();

// Skip rate limit on OPTIONS preflight
authRouter.use((req, res, next) => req.method === "OPTIONS" ? next() : limiter(req, res, next));

// Public routes
authRouter.post("/register",
  validate(z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), businessName: z.string().min(2) })),
  register
);
authRouter.post("/login",
  validate(z.object({ email: z.string().email(), password: z.string().min(1) })),
  login
);
authRouter.post("/forgot-password",
  validate(z.object({ email: z.string().email() })),
  forgotPassword
);
authRouter.post("/reset-password",
  validate(z.object({ token: z.string().min(20), newPassword: z.string().min(8) })),
  resetPassword
);
authRouter.post("/refresh",
  validate(z.object({ refreshToken: z.string().min(1) })),
  refresh
);

// Protected routes
authRouter.get("/me", verifyJWT, extractTenant, me);

// Team management — admin only
authRouter.post("/invite",
  verifyJWT, extractTenant, rbacCheck("admin", "superadmin"),
  validate(z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), role: z.enum(["admin", "agent"]) })),
  inviteMember
);
authRouter.delete("/members/:id",
  verifyJWT, extractTenant, rbacCheck("admin", "superadmin"),
  removeMember
);
