import "dotenv/config";
import "express-async-errors";
import { mkdir } from "node:fs/promises";
import http from "node:http";
import cors from "cors";
import express from "express";
import helmetPkg from "helmet";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import { errorHandler } from "./middleware/index.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { configRouter, widgetRouter } from "./routes/config.routes.js";
import { conversationRouter } from "./routes/conversation.routes.js";
import { kbRouter } from "./routes/kb.routes.js";
import { ticketRouter } from "./routes/ticket.routes.js";
import { integrationRouter } from "./routes/integration.routes.js";
import { registerChatSocket } from "./socket/chat.socket.js";

const origin = process.env.FRONTEND_URL ?? "http://localhost:3000";
const isDev = process.env.NODE_ENV?.trim() !== "production";

// Support multiple allowed origins (comma-separated in FRONTEND_URL)
const allowedOrigins = origin.split(",").map((o) => o.trim()).filter(Boolean);

const corsOptions: cors.CorsOptions = {
  // Widget.js is served as a public script loaded by third-party sites — always allow *.
  // Dashboard API calls also tolerate * in dev; in prod they include credentials=false so * is safe.
  origin: "*",
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  optionsSuccessStatus: 200,
};

const app = express();

// CORS + preflight MUST be first — before helmet, routes, rate limiters
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use((helmetPkg as any)({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" })); // Twilio sends form-encoded webhooks

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/kb", kbRouter);
app.use("/api/chat", chatRouter);
app.use("/api/tickets", ticketRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/config", configRouter);
app.use("/api/widget", widgetRouter);
app.use("/api/integrations", integrationRouter);
app.use("/widget.js", express.static(new URL("../widget/widget.js", import.meta.url).pathname));
app.use(errorHandler);

await mkdir("/tmp/uploads", { recursive: true });
await connectDB();

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
registerChatSocket(io);

const PORT = Number(process.env.PORT ?? 5000);
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} already in use. Run: lsof -ti :${PORT} | xargs kill -9`);
    process.exit(1);
  } else throw err;
});
server.listen(PORT, () => console.info(`API listening on ${PORT}`));
