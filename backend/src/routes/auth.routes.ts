import { Router } from "express";
import rateLimitPkg from "express-rate-limit";
import { z } from "zod";
import { forgotPassword, login, me, refresh, register, resetPassword } from "../controllers/auth.controller.js";
import { extractTenant, validate, verifyJWT } from "../middleware/index.js";

// Created at module level — not inside a request handler
const limiter = (rateLimitPkg as any)({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });

export const authRouter = Router();
authRouter.use(limiter);
authRouter.post("/register", validate(z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), businessName: z.string().min(2) })), register);
authRouter.post("/login", validate(z.object({ email: z.string().email(), password: z.string().min(1) })), login);
authRouter.post("/forgot-password", validate(z.object({ email: z.string().email() })), forgotPassword);
authRouter.post("/reset-password", validate(z.object({ token: z.string().min(20), newPassword: z.string().min(8) })), resetPassword);
authRouter.post("/refresh", validate(z.object({ refreshToken: z.string().min(1) })), refresh);
authRouter.get("/me", verifyJWT, extractTenant, me);
