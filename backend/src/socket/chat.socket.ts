import type { Server, Socket } from "socket.io";
import { Conversation, Message } from "../models/index.js";
import { verifyAccessToken } from "../utils/jwt.js";

export function registerChatSocket(io: Server) {
  io.on("connection", (socket: Socket) => {

    // ── Join a conversation room ───────────────────────────────────────────
    // Customers join without a token; agents join with their JWT.
    socket.on(
      "join:conversation",
      ({ conversationId, token }: { conversationId: string; token?: string }) => {
        if (token) {
          try {
            const user = verifyAccessToken(token);
            socket.data.user = user;
            socket.data.isAgent = true;
          } catch {
            socket.emit("error", { message: "Unauthorized" });
            return;
          }
        }
        socket.join(`conv:${conversationId}`);
        socket.data.conversationId = conversationId;

        // Tell all room members who just joined
        socket.to(`conv:${conversationId}`).emit("agent:joined", {
          agentName: socket.data.user?.name ?? "Agent",
        });
      },
    );

    // ── Agent sends a message ─────────────────────────────────────────────
    socket.on(
      "agent:message",
      async ({ conversationId, content }: { conversationId: string; content: string }) => {
        if (!socket.data.isAgent) {
          socket.emit("error", { message: "Only agents can send messages this way" });
          return;
        }
        const tenantId = socket.data.user.tenantId;
        const message = await Message.create({
          tenantId,
          conversationId,
          role:      "assistant",
          content,
          eventType: "human_joined",
        });
        // Update conversation status to show human has taken over
        await Conversation.updateOne(
          { _id: conversationId, tenantId },
          { status: "active", isEscalated: false },
        );
        io.to(`conv:${conversationId}`).emit("message:new", message);
      },
    );

    // ── Customer message (from widget via socket) ─────────────────────────
    socket.on(
      "customer:message",
      async ({ conversationId, content }: { conversationId: string; content: string }) => {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;
        const msg = await Message.create({
          tenantId:      conversation.tenantId,
          conversationId,
          role:          "user",
          content,
        });
        // Broadcast to all agents watching this room
        socket.to(`conv:${conversationId}`).emit("message:new", msg);
      },
    );

    // ── Typing indicator ──────────────────────────────────────────────────
    socket.on("typing:start", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit("typing:start", {
        isAgent: socket.data.isAgent ?? false,
      });
    });
    socket.on("typing:stop", ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit("typing:stop");
    });

    // ── Human handoff — agent requests to take over ───────────────────────
    socket.on(
      "handoff:request",
      async ({ conversationId }: { conversationId: string }) => {
        if (!socket.data.isAgent) return;
        const tenantId = socket.data.user.tenantId;
        const sysMsg = await Message.create({
          tenantId,
          conversationId,
          role:      "system",
          content:   `${socket.data.user.name ?? "An agent"} has joined the conversation.`,
          eventType: "human_joined",
        });
        await Conversation.updateOne(
          { _id: conversationId, tenantId },
          { status: "active" },
        );
        io.to(`conv:${conversationId}`).emit("handoff:active", {
          agentName: socket.data.user.name,
          message:   sysMsg,
        });
      },
    );

    // ── Leave room ────────────────────────────────────────────────────────
    socket.on("leave:conversation", ({ conversationId }: { conversationId: string }) => {
      socket.leave(`conv:${conversationId}`);
      if (socket.data.isAgent) {
        socket.to(`conv:${conversationId}`).emit("agent:left", {
          agentName: socket.data.user?.name ?? "Agent",
        });
      }
    });

    socket.on("disconnect", () => {
      const cid = socket.data.conversationId;
      if (cid && socket.data.isAgent) {
        socket.to(`conv:${cid}`).emit("agent:left", {
          agentName: socket.data.user?.name ?? "Agent",
        });
      }
    });
  });
}
