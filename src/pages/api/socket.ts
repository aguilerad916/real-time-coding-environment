import { Server } from "socket.io";

// In-memory storage for room codes
const rooms: Record<string, string> = {};

export default function handler(req: any, res: any) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: { origin: "*" }
    });

    io.on("connection", (socket) => {
      socket.on("join-room", (roomId) => {
        socket.join(roomId);
        // Send existing code to new participant
        socket.emit("code-update", rooms[roomId] || "");
      });

      socket.on("code-change", ({ roomId, code }) => {
        rooms[roomId] = code; // Update the in-memory storage
        socket.to(roomId).emit("code-update", code);
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}