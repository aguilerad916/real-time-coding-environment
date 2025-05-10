import { Server } from "socket.io";

// In-memory storage for room data
interface RoomData {
  code: string;
  language: 'javascript' | 'python';
  users: number; // Track number of users in the room
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
      // Track which room this socket is in
      let currentRoom: string | null = null;
      
      socket.on("join-room", (roomId) => {
        // Set current room for this socket
        currentRoom = roomId;
        
        // Join the Socket.IO room
        socket.join(roomId);
        
        // Initialize room if it doesn't exist
        if (!rooms[roomId]) {
          rooms[roomId] = { 
            code: '', 
            language: 'javascript',
            users: 0 // Start with zero users
          };
        }
        
        // Increment user count
        rooms[roomId].users += 1;
        
        // Send existing code and language to new participant
        socket.emit("room-data", rooms[roomId]);
        
        // Broadcast updated user count to all clients in the room
        io.to(roomId).emit("user-count", rooms[roomId].users);
        
        console.log(`User joined room ${roomId}. Current users: ${rooms[roomId].users}`);
      });

      socket.on("code-change", ({ roomId, code, language }) => {
        // Initialize room if it doesn't exist
        if (!rooms[roomId]) {
          rooms[roomId] = { 
            code: '', 
            language: 'javascript',
            users: 1  // Assume this is the first user
          };
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
      
      // Handle typing indicator
      socket.on("typing", ({ roomId, isTyping }) => {
        // Broadcast typing status to all other clients in the room
        socket.to(roomId).emit("user-typing", isTyping);
      });
      
      // Handle disconnections
      socket.on("disconnect", () => {
        // If user was in a room, update the room data
        if (currentRoom && rooms[currentRoom]) {
          // Decrement user count
          rooms[currentRoom].users = Math.max(0, rooms[currentRoom].users - 1);
          
          console.log(`User left room ${currentRoom}. Current users: ${rooms[currentRoom].users}`);
          
          // Broadcast updated user count
          io.to(currentRoom).emit("user-count", rooms[currentRoom].users);
          
          // Clean up empty rooms after some time to avoid memory leaks
          if (rooms[currentRoom].users === 0) {
            const roomToClean = currentRoom; // Store in a constant to avoid closure issues
            // Optional: delete the room after a delay if it stays empty
            setTimeout(() => {
              if (roomToClean && rooms[roomToClean] && rooms[roomToClean].users === 0) {
                delete rooms[roomToClean];
                console.log(`Deleted empty room: ${roomToClean}`);
              }
            }, 3600000); // Clean up after 1 hour of inactivity
          }
        }
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}