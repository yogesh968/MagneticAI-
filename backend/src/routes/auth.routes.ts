import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { forgotPassword, inviteMember, login, logout, me, refresh, register, removeMember, resetPassword, socketTicket } from "../controllers/auth.controller.js";
import { extractTenant, rbacCheck, validate, verifyJWT } from "../middleware/index.js";

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });

// Credential-guessing needs a far tighter budget than general API traffic.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Please try again in a few minutes." },
});

export const authRouter = Router();

// Skip rate limit on OPTIONS preflight
authRouter.use((req, res, next) => req.method === "OPTIONS" ? next() : limiter(req, res, next));

// Public routes
authRouter.post("/register",
  validate(z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), businessName: z.string().min(2) })),
  register
);
authRouter.post("/login",
  credentialLimiter,
  validate(z.object({ email: z.string().email(), password: z.string().min(1) })),
  login
);
authRouter.post("/forgot-password",
  credentialLimiter,
  validate(z.object({ email: z.string().email() })),
  forgotPassword
);
authRouter.post("/reset-password",
  credentialLimiter,
  validate(z.object({ token: z.string().min(20), newPassword: z.string().min(8) })),
  resetPassword
);
// The refresh token now normally arrives as an httpOnly cookie, so the body is optional.
authRouter.post("/refresh",
  validate(z.object({ refreshToken: z.string().min(1).optional() })),
  refresh
);

// Protected routes
authRouter.get("/me", verifyJWT, extractTenant, me);
authRouter.post("/logout", verifyJWT, logout);
authRouter.post("/socket-ticket", verifyJWT, socketTicket);

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
