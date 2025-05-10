import { NextApiRequest, NextApiResponse } from 'next';

// In-memory storage for room codes
const rooms: Record<string, string> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { roomId, code } = req.body;
    rooms[roomId] = code; // Update the in-memory storage
    res.status(200).json({ ok: true });
  } else if (req.method === "GET") {
    const roomId = req.query.roomId as string;
    const code = rooms[roomId] || "";
    res.status(200).json({ code });
  }
}