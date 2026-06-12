import "dotenv/config";
import "express-async-errors";
import { mkdir } from "node:fs/promises";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import express from "express";
import helmetPkg from "helmet";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/index.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { configRouter, widgetRouter } from "./routes/config.routes.js";
import { conversationRouter } from "./routes/conversation.routes.js";
import { integrationRouter } from "./routes/integration.routes.js";
import { kbRouter } from "./routes/kb.routes.js";
import { ticketRouter } from "./routes/ticket.routes.js";
import { uploadDir } from "./utils/upload-path.js";

const corsOptions: cors.CorsOptions = {
  origin: "*",
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  optionsSuccessStatus: 200,
};

export const app = express();

// CORS + preflight MUST be first — before helmet, routes, rate limiters
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use((helmetPkg as any)({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" })); // Twilio sends form-encoded webhooks

app.get("/", (_req, res) => res.json({ status: "ok", service: "Magnetic AI API" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/favicon.ico", (_req, res) => res.status(204).end());

// Serve widget.js with correct CORS + cache headers so it works on any domain
app.get("/widget.js", (_req, res) => {
  const widgetPath = new URL("../widget/widget.js", import.meta.url).pathname;
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=300"); // 5 min cache
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

app.use("/api/auth", authRouter);
app.use("/api/kb", kbRouter);
app.use("/api/chat", chatRouter);
app.use("/api/tickets", ticketRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/config", configRouter);
app.use("/api/widget", widgetRouter);
app.use("/api/integrations", integrationRouter);
app.use(errorHandler);

let initPromise: Promise<void> | undefined;

export function initializeApp() {
  initPromise ??= Promise.all([
    mkdir(uploadDir, { recursive: true }),
    connectDB(),
  ]).then(() => undefined);

  return initPromise;
}
