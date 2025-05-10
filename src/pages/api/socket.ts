import { Server } from "socket.io";

export default function handler(req: any, res: any) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: { origin: "*" }
    });

    io.on("connection", (socket) => {
      socket.on("join-room", async (roomId) => {
        try {
          const client = await import('../../lib/mongodb').then(mod => mod.default);
          const db = client.db();
          const room = await db.collection("rooms").findOne({ roomId });
          
          socket.join(roomId);
          // Send existing code to new participant
          if (room?.code) {
            socket.emit("code-update", room.code);
          }
        } catch (error) {
          console.error("Join room error:", error);
        }
      });

      socket.on("code-change", ({ roomId, code }) => {
        socket.to(roomId).emit("code-update", code);
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}