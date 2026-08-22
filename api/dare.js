/**
 * Vercel Serverless Function: POST /api/dare
 * The AI dares the couple to caption a place themselves. body: { title, place, summary }.
 * Logic in ./_lib/core.js.
 */
import { runDare } from "./_lib/core.js";

export const config = { maxDuration: 45 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { status, json } = await runDare(body);
    return res.status(status).json(json);
  } catch (err) {
    console.error("dare error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Dare failed." });
  }
}
