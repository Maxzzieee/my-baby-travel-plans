/**
 * Vercel Serverless Function: POST /api/concierge
 * Trip-aware chat concierge. body: { message, context, history }. Logic in ./_lib/core.js.
 */
import { runConcierge } from "./_lib/core.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { status, json } = await runConcierge(body);
    return res.status(status).json(json);
  } catch (err) {
    console.error("concierge error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Concierge failed." });
  }
}
