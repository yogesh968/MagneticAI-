import { io } from "socket.io-client";
import { api } from "./api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

/**
 * Socket.IO connects to the API origin directly, so the httpOnly auth cookie is
 * never sent and cannot be read to pass along. Instead we trade the cookie for a
 * 2-minute, socket-only ticket over the proxied REST API and hand that to the
 * handshake. The server now authenticates at connect time, so this must resolve
 * before connecting.
 */
export async function connectAsAgent() {
  if (socket.connected) return;
  const { data } = await api.post("/auth/socket-ticket");
  socket.auth = { ticket: data.ticket };
  socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}
