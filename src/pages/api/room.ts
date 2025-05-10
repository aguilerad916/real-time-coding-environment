import { NextApiRequest, NextApiResponse } from 'next';

// Define room data structure
interface RoomData {
  code: string;
  language: 'javascript' | 'python';
}

// In-memory storage for room data
const rooms: Record<string, RoomData> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { roomId, code, language = 'javascript' } = req.body;
    
    // Initialize room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = { code: '', language: 'javascript' };
    }
    
    // Update room data
    if (code !== undefined) {
      rooms[roomId].code = code;
    }
    
    if (language) {
      rooms[roomId].language = language;
    }
    
    res.status(200).json({ ok: true });
  } else if (req.method === "GET") {
    const roomId = req.query.roomId as string;
    
    // Get room data or return defaults if room doesn't exist
    const roomData = rooms[roomId] || { code: '', language: 'javascript' };
    
    res.status(200).json(roomData);
  }
}