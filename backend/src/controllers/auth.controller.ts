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
    if (await bcrypt.compare(password, existing.passwordHash)) {
      return res.json({ user: { id: existing._id, name: existing.name, email: existing.email, tenantId: existing.tenantId, role: existing.role }, ...tokens(existing) });
    }
    return res.status(409).json({ message: "Email already registered. Please sign in instead." });
  }
  const slug = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
  const tenant = await Tenant.create({ name: businessName, slug, email });
  const user = await User.create({ tenantId: tenant._id, name, email, passwordHash: await bcrypt.hash(password, 12), role: "admin", isVerified: true });
  await BotConfig.create({ tenantId: tenant._id });
  res.status(201).json({ user: { id: user._id, name, email, tenantId: tenant._id, role: user.role }, ...tokens(user) });
}

export async function login(req: Request, res: Response) {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  res.json({ user: { id: user._id, name: user.name, email: user.email, tenantId: user.tenantId, role: user.role }, ...tokens(user) });
}

async function sendResetEmail(email: string, token: string) {
  const link = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
  // Use SMTP if configured (SMTP_HOST + SMTP_USER + SMTP_PASS), otherwise log to console
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: email,
      subject: "Reset your Magnetic AI password",
      html: `<p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${link}">${link}</a></p>`,
    });
  } else {
    console.info(`\nPASSWORD RESET LINK for ${email}:\n   ${link}\n   (Set SMTP_HOST/SMTP_USER/SMTP_PASS to send real emails)\n`);
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (user) {
    user.resetToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    await sendResetEmail(user.email, user.resetToken).catch((e) => console.error("Reset email failed:", e));
  }
  // Always return 200 to prevent email enumeration
  res.json({ message: "If an account exists for that email, a reset link has been sent." });
}

export async function resetPassword(req: Request, res: Response) {
  const user = await User.findOne({ resetToken: req.body.token, resetTokenExpiry: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: "Invalid or expired reset token. Please request a new one." });
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();
  res.json({ message: "Password reset successfully. You can now sign in." });
}

export async function refresh(req: Request, res: Response) {
  const payload = verifyRefreshToken(req.body.refreshToken);
  const user = await User.findOne({ _id: payload.id, tenantId: payload.tenantId });
  if (!user) return res.status(401).json({ message: "Invalid refresh token" });
  res.json(tokens(user));
}

export async function me(req: Request, res: Response) {
  const user = await User.findOne({ _id: req.user!.id, tenantId: req.tenantId }).select("-passwordHash -resetToken -resetTokenExpiry");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
}

// ── Team management ──────────────────────────────────────────────────────────
export async function inviteMember(req: Request, res: Response) {
  const { name, email, password, role } = req.body;
  const tenantId = req.tenantId;
  if (await User.exists({ email: email.toLowerCase(), tenantId })) {
    return res.status(409).json({ message: "A member with this email already exists in your team" });
  }
  const user = await User.create({
    tenantId,
    name,
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    role: role ?? "agent",
    isVerified: true,
  });
  res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
}

export async function removeMember(req: Request, res: Response) {
  // Cannot delete yourself or a superadmin
  if (String(req.params.id) === String(req.user!.id)) {
    return res.status(400).json({ message: "You cannot remove yourself" });
  }
  const deleted = await User.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId, role: { $ne: "superadmin" } });
  if (!deleted) return res.status(404).json({ message: "Member not found" });
  res.status(204).end();
}
