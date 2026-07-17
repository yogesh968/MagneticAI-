import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import twilio from "twilio";
import { env, isProd } from "../config/env.js";

/** Constant-time compare that tolerates differing lengths. */
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Guards the email-to-ticket webhook with a shared secret. Without it the
 * endpoint accepted an arbitrary tenantId from anyone on the internet and
 * created a real ticket in that tenant.
 */
export function verifyEmailWebhook(req: Request, res: Response, next: NextFunction) {
  if (!env.EMAIL_WEBHOOK_SECRET) {
    if (isProd) return res.status(503).json({ message: "Email webhook is not configured" });
    console.warn("[webhook] EMAIL_WEBHOOK_SECRET unset — allowing unauthenticated email webhook in development");
    return next();
  }
  const raw = req.headers["x-webhook-secret"];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (!provided || !safeEqual(provided, env.EMAIL_WEBHOOK_SECRET)) {
    return res.status(401).json({ message: "Invalid webhook signature" });
  }
  next();
}

/**
 * Validates Twilio's X-Twilio-Signature. The SDK was already a dependency but
 * the signature was never checked, so anyone could forge an inbound WhatsApp
 * message and make us spend Twilio credits on the outbound reply.
 */
export function verifyTwilioWebhook(req: Request, res: Response, next: NextFunction) {
  if (!env.TWILIO_AUTH_TOKEN) {
    if (isProd) return res.status(503).json({ message: "WhatsApp webhook is not configured" });
    console.warn("[webhook] TWILIO_AUTH_TOKEN unset — allowing unvalidated Twilio webhook in development");
    return next();
  }
  const raw = req.headers["x-twilio-signature"];
  const signature = Array.isArray(raw) ? raw[0] : raw;
  if (!signature) return res.status(401).json({ message: "Missing Twilio signature" });

  // Twilio signs the exact public URL it was configured with. Behind a proxy,
  // req.protocol/host reflect the forwarded headers, so prefer an explicit
  // PUBLIC_API_URL when the deployment sits behind a rewrite.
  const base = env.PUBLIC_API_URL?.replace(/\/$/, "") ?? `${req.protocol}://${req.get("host")}`;
  const url = `${base}${req.originalUrl}`;

  if (!twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, req.body ?? {})) {
    return res.status(403).json({ message: "Invalid Twilio signature" });
  }
  next();
}
