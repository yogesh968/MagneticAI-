import { z } from "zod";

/**
 * Fail fast on boot rather than at the first request that needs a secret.
 * Previously JWT_SECRET was read with a non-null assertion, so a missing
 * secret booted fine and only surfaced as a 500 on the first login.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // 32 bytes of entropy minimum. Rejects the .env.example placeholders outright.
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

  // Comma-separated list of allowed dashboard origins.
  FRONTEND_URL: z.string().default("http://localhost:3000"),

  // Signs public widget session tokens. Falls back to JWT_SECRET when unset.
  WIDGET_SECRET: z.string().min(32).optional(),

  QDRANT_URL: z.string().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),

  // Shared secret for the inbound email-to-ticket webhook.
  EMAIL_WEBHOOK_SECRET: z.string().min(16).optional(),

  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  WHATSAPP_TENANT_ID: z.string().optional(),

  PUBLIC_API_URL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  throw new Error("Environment validation failed. See the errors above.");
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";

/** Origins permitted to call the credentialed dashboard API. */
export const allowedOrigins = env.FRONTEND_URL.split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const widgetSecret = env.WIDGET_SECRET ?? env.JWT_SECRET;

// A secret that is merely long enough still must not be the shipped placeholder.
const placeholders = [/^change_me/i, /^replace_with/i, /^your_/i];
if (isProd) {
  for (const [key, value] of Object.entries({ JWT_SECRET: env.JWT_SECRET, JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET })) {
    if (placeholders.some((p) => p.test(value))) {
      throw new Error(`${key} is still set to a placeholder value. Generate one with: openssl rand -base64 48`);
    }
  }
  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be different values.");
  }
  if (allowedOrigins.includes("http://localhost:3000")) {
    console.warn("[env] FRONTEND_URL still allows http://localhost:3000 in production.");
  }
}
