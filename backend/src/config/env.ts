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

  // Embeddings. Read directly with a non-null assertion in embedding.service
  // before this was centralised — a missing key surfaced as silent "no vector".
  COHERE_API_KEY: z.string().optional(),

  // Payments (Razorpay). Optional in dev so the server still boots without them;
  // the isProd block below refuses to start production if any are missing.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  // Razorpay Plan ids that back the Starter/Pro tiers (created in the Razorpay
  // dashboard). Left blank until the plans exist; /billing/subscribe 400s for a
  // tier with no id rather than calling Razorpay with an empty plan.
  RAZORPAY_PLAN_STARTER: z.string().optional(),
  RAZORPAY_PLAN_PRO: z.string().optional(),

  // Object storage for KB uploads. "local" keeps files on disk (dev/default);
  // "s3" targets any S3-compatible bucket (AWS S3 or Cloudflare R2).
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("auto"),   // "auto" for R2; a real region for AWS
  S3_ENDPOINT: z.string().optional(),       // set for R2/custom; omit for AWS S3
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(), // optional CDN/public base for object URLs

  // Billing lifecycle knobs.
  GRACE_PERIOD_DAYS: z.coerce.number().default(7),   // keep serving a lapsed tenant this long
  DATA_RETENTION_DAYS: z.coerce.number().default(0), // 0 = retention purge disabled

  // Error tracking (Sentry). Optional everywhere — when unset the SDK is never
  // initialised and capture calls are no-ops, so the app runs identically.
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
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

/**
 * The app's canonical origin — the first entry in FRONTEND_URL. Anything that
 * builds a user-facing link (password reset, invites) must use this rather than
 * FRONTEND_URL itself, which may hold several comma-separated origins.
 */
export const appUrl = allowedOrigins[0] ?? "http://localhost:3000";

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

  // Fail fast on the billing/RAG secrets that used to be read straight from
  // process.env and so bypassed boot validation — a misconfig otherwise
  // surfaced as a silent 500 on payments or as "no embeddings" at query time.
  const requiredInProd = {
    COHERE_API_KEY: env.COHERE_API_KEY,
    RAZORPAY_KEY_ID: env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: env.RAZORPAY_WEBHOOK_SECRET,
  };
  const missing = Object.entries(requiredInProd).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  if (env.STORAGE_DRIVER === "s3") {
    const s3Required = { S3_BUCKET: env.S3_BUCKET, S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY };
    const s3Missing = Object.entries(s3Required).filter(([, v]) => !v).map(([k]) => k);
    if (s3Missing.length) {
      throw new Error(`STORAGE_DRIVER=s3 requires: ${s3Missing.join(", ")}`);
    }
  }
}
