import "dotenv/config";
import "express-async-errors";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import express from "express";
import helmetPkg from "helmet";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { qdrant } from "./config/qdrant.js";
import { dashboardCors, publicCors } from "./config/cors.js";
import { errorHandler } from "./middleware/index.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { botRouter, widgetRouter } from "./routes/bot.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { conversationRouter } from "./routes/conversation.routes.js";
import { integrationRouter } from "./routes/integration.routes.js";
import { kbRouter } from "./routes/kb.routes.js";
import { ticketRouter } from "./routes/ticket.routes.js";
import { paymentRouter } from "./routes/payment.routes.js";
import { billingRouter } from "./routes/billing.routes.js";
import { uploadDir } from "./utils/upload-path.js";
import { startRetentionJob } from "./services/retention.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

export const app = express();

// Vercel/Railway terminate TLS upstream. Without this, req.ip is the proxy's
// address and every rate limiter buckets the whole world into one key.
app.set("trust proxy", 1);

app.use((helmetPkg as any)({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb", verify: (req: any, _res, buf) => { req.rawBody = buf; } })); // rawBody for webhook signature checks
app.use(express.urlencoded({ extended: true, limit: "1mb", verify: (req: any, _res, buf) => { req.rawBody = buf; } })); // Twilio sends form-encoded webhooks
app.use(cookieParser());

app.get("/", (_req, res) => res.json({ status: "ok", service: "Magnetic AI API" }));
// Liveness — cheap, no dependencies. This is what a process supervisor pings.
app.get("/health", (_req, res) => res.json({ status: "ok" }));
// Readiness — verifies the critical dependencies are actually reachable, so an
// uptime monitor learns about a dead DB/vector store before a client does.
// Mongo down → 503 (we can't serve); Qdrant down → still 200 but flagged
// "degraded" (non-KB chat and the dashboard keep working).
app.get("/ready", async (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  let qdrantUp = false;
  try {
    await Promise.race([
      qdrant.getCollections(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
    ]);
    qdrantUp = true;
  } catch {
    qdrantUp = false;
  }
  const status = !dbUp ? "unhealthy" : qdrantUp ? "ok" : "degraded";
  res.status(dbUp ? 200 : 503).json({ status, checks: { mongo: dbUp, qdrant: qdrantUp } });
});
app.get("/favicon.ico", (_req, res) => res.status(204).end());

// Serve widget.js — use resolve() so path works after tsc compilation on any platform
app.get("/widget.js", (_req, res) => {
  // In dev  (tsx): __dirname = backend/src  → ../widget/widget.js = backend/widget/widget.js ✓
  // In prod (tsc): __dirname = backend/dist → ../widget/widget.js = backend/widget/widget.js ✓
  const widgetPath = resolve(__dirname, "../widget/widget.js");
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.sendFile(widgetPath);
});

app.use("/api", async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await initializeApp();
    next();
  } catch (error) {
    next(error);
  }
});

// Public surface — embeddable widget and third-party webhooks. Any origin.
app.use("/api/chat", publicCors, chatRouter);
app.use("/api/widget", publicCors, widgetRouter);
app.use("/api/payment", publicCors, paymentRouter);
// Not mounted with publicCors: this router mixes public webhooks with one
// credentialed dashboard route, so each route picks its own policy. A mount-level
// publicCors would answer the /status preflight with `*` and no credentials.
app.use("/api/integrations", integrationRouter);

// Dashboard surface — credentialed, allowlisted origins only.
app.use("/api/auth", dashboardCors, authRouter);
app.use("/api/kb", dashboardCors, kbRouter);
app.use("/api/tickets", dashboardCors, ticketRouter);
app.use("/api/conversations", dashboardCors, conversationRouter);
app.use("/api/analytics", dashboardCors, analyticsRouter);
app.use("/api/bots", dashboardCors, botRouter);
app.use("/api/billing", dashboardCors, billingRouter);
app.use(errorHandler);

let initPromise: Promise<void> | undefined;

export function initializeApp() {
  initPromise ??= Promise.all([
    // mkdir may fail on read-only filesystems (Vercel) — swallow the error
    mkdir(uploadDir, { recursive: true }).catch(() => undefined),
    connectDB(),
  ]).then(() => {
    // Retention purge needs the DB; start it once connected. No-op when disabled.
    startRetentionJob();
  });

  return initPromise;
}
