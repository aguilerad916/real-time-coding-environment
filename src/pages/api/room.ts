import clientPromise from "@/lib/mongodb";

export default async function handler(req: any, res: any) {
  let roomId, code;
  if (req.method === "POST") {
    ({ roomId, code } = req.body);
  } else if (req.method === "GET") {
    roomId = req.query.roomId;
  }
  const client = await clientPromise;
  const db = client.db();

  if (req.method === "POST") {
    await db.collection("rooms").updateOne(
      { roomId },
      { $set: { code } },
      { upsert: true }
    );
    res.status(200).json({ ok: true });
  } else if (req.method === "GET") {
    const room = await db.collection("rooms").findOne({ roomId });
    res.status(200).json({ code: room?.code || "" });
  }
}