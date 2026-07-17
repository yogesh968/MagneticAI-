import cors from "cors";
import { allowedOrigins } from "./env.js";

/**
 * Two CORS policies, because this API serves two very different audiences.
 *
 * `publicCors` — the embeddable widget runs on arbitrary customer domains, so
 * any origin may call it. It carries no cookies; its routes authenticate with a
 * signed session token in x-session-token instead.
 *
 * `dashboardCors` — credentialed, so the origin must be an explicit allowlist:
 * the spec forbids `*` together with credentials. In normal operation the
 * dashboard reaches the API through the Next.js rewrite proxy and is
 * same-origin, so this only governs direct cross-origin calls.
 */
export const publicCors = cors({
  origin: "*",
  credentials: false,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "x-session-token", "x-razorpay-signature", "x-webhook-secret", "x-twilio-signature"],
  optionsSuccessStatus: 200,
});

export const dashboardCors = cors({
  origin: (origin, cb) => {
    // Same-origin and server-side calls send no Origin header.
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin.replace(/\/$/, ""))) return cb(null, true);
    cb(new Error(`Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  optionsSuccessStatus: 200,
});
