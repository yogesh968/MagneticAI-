import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { BotConfig, Tenant, User } from "../models/index.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";

const tokens = (user: any) => {
  const payload = { id: String(user._id), tenantId: String(user.tenantId), role: user.role };
  return { accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload) };
};

export async function register(req: Request, res: Response) {
  const { name, email, password, businessName } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    // Email exists — try to log them in with the provided password
    if (await bcrypt.compare(password, existing.passwordHash)) {
      return res.json({ user: { id: existing._id, name: existing.name, email: existing.email, tenantId: existing.tenantId, role: existing.role }, ...tokens(existing) });
    }
    return res.status(409).json({ message: "Email already registered. Please sign in instead." });
  }
  const slug = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
  const tenant = await Tenant.create({ name: businessName, slug, email });
  const user = await User.create({ tenantId: tenant._id, name, email, passwordHash: await bcrypt.hash(password, 12), role: "admin" });
  await BotConfig.create({ tenantId: tenant._id });
  res.status(201).json({ user: { id: user._id, name, email, tenantId: tenant._id, role: user.role }, ...tokens(user) });
}

export async function login(req: Request, res: Response) {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) return res.status(401).json({ message: "Invalid email or password" });
  res.json({ user: { id: user._id, name: user.name, email: user.email, tenantId: user.tenantId, role: user.role }, ...tokens(user) });
}

export async function forgotPassword(req: Request, res: Response) {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (user) {
    user.resetToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    if (process.env.NODE_ENV !== "production") console.info(`Password reset token for ${user.email}: ${user.resetToken}`);
  }
  res.json({ message: "If the email exists, a reset link has been generated." });
}

export async function resetPassword(req: Request, res: Response) {
  const user = await User.findOne({ resetToken: req.body.token, resetTokenExpiry: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  user.resetToken = undefined; user.resetTokenExpiry = undefined;
  await user.save();
  res.json({ message: "Password reset successfully" });
}

export async function refresh(req: Request, res: Response) {
  const payload = verifyRefreshToken(req.body.refreshToken);
  const user = await User.findOne({ _id: payload.id, tenantId: payload.tenantId });
  if (!user) return res.status(401).json({ message: "Invalid refresh token" });
  res.json(tokens(user));
}

export async function me(req: Request, res: Response) {
  const user = await User.findOne({ _id: req.user!.id, tenantId: req.tenantId }).select("-passwordHash -resetToken");
  res.json(user);
}
