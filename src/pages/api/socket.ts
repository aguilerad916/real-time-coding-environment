import { Server } from "socket.io";

// In-memory storage for room data
interface RoomData {
  code: string;
  language: 'javascript' | 'python';
}

const rooms: Record<string, RoomData> = {};

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
        // Send existing code and language to new participant
        if (rooms[roomId]) {
          socket.emit("room-data", rooms[roomId]);
        }
      });

      socket.on("code-change", ({ roomId, code, language }) => {
        // Initialize room if it doesn't exist
        if (!rooms[roomId]) {
          rooms[roomId] = { code: '', language: 'javascript' };
        }
        
        // Update the code
        rooms[roomId].code = code;
        
        // Update language if provided
        if (language) {
          rooms[roomId].language = language;
        }
        
        // Broadcast the updated code to all other clients in the room
        socket.to(roomId).emit("code-update", code);
        
        // If language changed, broadcast that too
        if (language) {
          socket.to(roomId).emit("language-update", language);
        }
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}