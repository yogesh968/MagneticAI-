import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { appUrl } from "../config/env.js";
import { Bot, Tenant, User } from "../models/index.js";
import { signAccessToken, signRefreshToken, signSocketTicket, verifyRefreshToken } from "../utils/jwt.js";
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies, setSessionHint } from "../utils/cookies.js";

const tokens = (user: any) => {
  const payload = { id: String(user._id), tenantId: String(user.tenantId), role: user.role, name: user.name, tokenVersion: user.tokenVersion ?? 0 };
  return { accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload) };
};

/**
 * Cookies are the browser transport; the tokens stay in the body so non-browser
 * clients and the test suite keep working against the same endpoints.
 */
function issue(res: Response, user: any) {
  const { accessToken, refreshToken } = tokens(user);
  setAuthCookies(res, accessToken, refreshToken);
  setSessionHint(res, { role: user.role, tenantId: String(user.tenantId), name: user.name });
  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response) {
  const { name, email, password, businessName } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "Email already registered. Please sign in instead." });
  }
  const slug = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomBytes(3).toString("hex")}`;
  const tenant = await Tenant.create({ name: businessName, slug, email });
  const user = await User.create({ tenantId: tenant._id, name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12), role: "admin", isVerified: true });
  // Every tenant starts with one default bot so the widget and KB upload have a
  // target from the first minute.
  await Bot.create({
    tenantId: tenant._id,
    botName: "Support Assistant",
    description: "Your first bot. Rename it and give it a knowledge base.",
    isDefault: true,
    settings: { widgetColor: "#2563eb", widgetPosition: "bottom-right" },
  });
  res.status(201).json({ user: { id: user._id, name, email: user.email, tenantId: tenant._id, role: user.role }, ...issue(res, user) });
}

export async function login(req: Request, res: Response) {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  res.json({ user: { id: user._id, name: user.name, email: user.email, tenantId: user.tenantId, role: user.role }, ...issue(res, user) });
}

async function sendResetEmail(email: string, token: string) {
  // appUrl, not FRONTEND_URL: the latter may list several origins.
  const link = `${appUrl}/reset-password?token=${token}`;
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
  // A password reset must kick every existing session — that is the whole point
  // of resetting after a suspected compromise.
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
  clearAuthCookies(res);
  res.json({ message: "Password reset successfully. You can now sign in." });
}

export async function refresh(req: Request, res: Response) {
  // Body is still accepted so existing API clients keep working.
  const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
  if (!token) return res.status(401).json({ message: "Refresh token required" });

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }

  const user = await User.findOne({ _id: payload.id, tenantId: payload.tenantId });
  if (!user) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Invalid refresh token" });
  }
  // Rejects tokens minted before the last logout / password reset.
  if ((user.tokenVersion ?? 0) !== payload.tokenVersion) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Session has been revoked. Please sign in again." });
  }
  // Re-issuing from the DB row (not the token) means role changes take effect here.
  res.json(issue(res, user));
}

/**
 * Exchanges the httpOnly session cookie for a short-lived socket ticket. The
 * dashboard needs this because Socket.IO talks to the API origin directly, where
 * the cookie is not sent.
 */
export async function socketTicket(req: Request, res: Response) {
  const user = req.user!;
  res.json({ ticket: signSocketTicket(user) });
}

export async function logout(req: Request, res: Response) {
  // Bumping the version is what actually revokes; clearing cookies only ends
  // this browser's session. Access tokens still die on their own 15m expiry.
  if (req.user?.id) {
    await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
  }
  clearAuthCookies(res);
  res.status(204).end();
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
