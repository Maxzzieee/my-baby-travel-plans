/**
 * Vercel Serverless Function: POST /api/voice
 * Rewrite an idea's details in the couple's house voice. body: { title, place, summary, dial }.
 * Logic in ./_lib/core.js.
 */
import { runVoice } from "./_lib/core.js";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { status, json } = await runVoice(body);
    return res.status(status).json(json);
  } catch (err) {
    console.error("voice error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Voice rewrite failed." });
  }
}
