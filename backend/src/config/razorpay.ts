import RazorpayPkg from "razorpay";
import { env } from "./env.js";

// Interop shim matching config/groq.ts — the package is CommonJS.
const Razorpay = (RazorpayPkg as any).default ?? RazorpayPkg;

let client: any;

export const isRazorpayConfigured = () => Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

/**
 * Lazily constructed so the server still boots in dev without Razorpay keys —
 * only a billing call that actually needs it hits this. In production env.ts has
 * already refused to start if the keys are missing.
 */
export function razorpay(): any {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
  }
  client ??= new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return client;
}
