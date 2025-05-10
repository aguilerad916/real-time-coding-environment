import { Server } from "socket.io";

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
      });

      socket.on("code-change", ({ roomId, code }) => {
        socket.to(roomId).emit("code-update", code);
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}