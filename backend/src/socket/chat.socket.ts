import type { Server, Socket } from "socket.io";
import { Conversation, Message } from "../models/index.js";
import { verifySessionToken, verifySocketTicket } from "../utils/jwt.js";

type SocketIdentity =
  | { kind: "agent"; tenantId: string; userId: string; name?: string; role: string }
  | { kind: "customer"; tenantId: string; sessionId: string; conversationId: string };

/**
 * Authenticate once at connection time rather than per-event. Previously
 * `join:conversation` treated the token as optional and `customer:message` had
 * no check at all, so any client holding a conversation id could read a room's
 * broadcasts and write messages into another tenant's conversation.
 */
function authenticate(socket: Socket): SocketIdentity | null {
  const { ticket, sessionToken } = socket.handshake.auth ?? {};

  if (ticket) {
    try {
      const user = verifySocketTicket(String(ticket));
      return { kind: "agent", tenantId: user.tenantId, userId: user.id, role: user.role, name: user.name };
    } catch {
      return null;
    }
  }

  if (sessionToken) {
    try {
      const s = verifySessionToken(String(sessionToken));
      return { kind: "customer", tenantId: s.tenantId, sessionId: s.sessionId, conversationId: s.conversationId };
    } catch {
      return null;
    }
  }

  return null;
}

/** A customer may only ever touch the one conversation their token was minted for. */
async function canAccess(identity: SocketIdentity, conversationId: string): Promise<boolean> {
  if (identity.kind === "customer") return identity.conversationId === conversationId;
  return Boolean(await Conversation.exists({ _id: conversationId, tenantId: identity.tenantId }));
}

export function registerChatSocket(io: Server) {
  io.use((socket, next) => {
    const identity = authenticate(socket);
    if (!identity) return next(new Error("Unauthorized"));
    socket.data.identity = identity;
    socket.data.isAgent = identity.kind === "agent";
    next();
  });

  io.on("connection", (socket: Socket) => {
    const identity: SocketIdentity = socket.data.identity;

    // ── Join a conversation room ───────────────────────────────────────────
    socket.on("join:conversation", async ({ conversationId }: { conversationId: string }) => {
      if (!conversationId || !(await canAccess(identity, conversationId))) {
        socket.emit("error", { message: "Not authorized for this conversation" });
        return;
      }
      socket.join(`conv:${conversationId}`);
      socket.data.conversationId = conversationId;

      if (identity.kind === "agent") {
        socket.to(`conv:${conversationId}`).emit("agent:joined", { agentName: identity.name ?? "Agent" });
      }
    });

    // ── Agent sends a message ─────────────────────────────────────────────
    socket.on("agent:message", async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (identity.kind !== "agent") {
        socket.emit("error", { message: "Only agents can send messages this way" });
        return;
      }
      if (!content?.trim() || !(await canAccess(identity, conversationId))) {
        socket.emit("error", { message: "Not authorized for this conversation" });
        return;
      }
      const { tenantId } = identity;
      const message = await Message.create({
        tenantId,
        conversationId,
        role: "assistant",
        content,
        eventType: "human_joined",
      });
      // Update conversation status to show human has taken over
      await Conversation.updateOne({ _id: conversationId, tenantId }, { status: "active", isEscalated: false });
      io.to(`conv:${conversationId}`).emit("message:new", message);
    });

    // ── Customer message (from widget via socket) ─────────────────────────
    socket.on("customer:message", async ({ content }: { content: string }) => {
      if (identity.kind !== "customer" || !content?.trim()) return;
      const { conversationId, tenantId } = identity;
      const conversation = await Conversation.findOne({ _id: conversationId, tenantId, deletedAt: { $exists: false } });
      if (!conversation) return;
      const msg = await Message.create({ tenantId, conversationId, role: "user", content });
      // Broadcast to all agents watching this room
      socket.to(`conv:${conversationId}`).emit("message:new", msg);
    });

    // ── Typing indicator ──────────────────────────────────────────────────
    socket.on("typing:start", ({ conversationId }: { conversationId: string }) => {
      if (socket.data.conversationId !== conversationId) return;
      socket.to(`conv:${conversationId}`).emit("typing:start", { isAgent: socket.data.isAgent });
    });
    socket.on("typing:stop", ({ conversationId }: { conversationId: string }) => {
      if (socket.data.conversationId !== conversationId) return;
      socket.to(`conv:${conversationId}`).emit("typing:stop");
    });

    // ── Human handoff — agent requests to take over ───────────────────────
    socket.on("handoff:request", async ({ conversationId }: { conversationId: string }) => {
      if (identity.kind !== "agent" || !(await canAccess(identity, conversationId))) return;
      const { tenantId, name } = identity;
      const sysMsg = await Message.create({
        tenantId,
        conversationId,
        role: "system",
        content: `${name ?? "An agent"} has joined the conversation.`,
        eventType: "human_joined",
      });
      await Conversation.updateOne({ _id: conversationId, tenantId }, { status: "active" });
      io.to(`conv:${conversationId}`).emit("handoff:active", { agentName: name, message: sysMsg });
    });

    // ── Leave room ────────────────────────────────────────────────────────
    socket.on("leave:conversation", ({ conversationId }: { conversationId: string }) => {
      socket.leave(`conv:${conversationId}`);
      if (identity.kind === "agent") {
        socket.to(`conv:${conversationId}`).emit("agent:left", { agentName: identity.name ?? "Agent" });
      }
    });

    socket.on("disconnect", () => {
      const cid = socket.data.conversationId;
      if (cid && identity.kind === "agent") {
        socket.to(`conv:${cid}`).emit("agent:left", { agentName: identity.name ?? "Agent" });
      }
    });
  });
}
