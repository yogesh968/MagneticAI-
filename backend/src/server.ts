// Must be the very first import so Sentry can instrument http/express before use.
import "./instrument.js";
import http from "node:http";
import { Server } from "socket.io";
import { app, initializeApp } from "./app.js";
import { registerChatSocket } from "./socket/chat.socket.js";

await initializeApp();

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
