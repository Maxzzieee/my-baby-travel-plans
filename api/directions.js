/**
 * Vercel Serverless Function: POST /api/directions
 * Seoul transit directions between two stops. Logic in ./_lib/core.js.
 * body: { from: {title,place,lat,lng}, to: {…} }
 */
import { runDirections } from "./_lib/core.js";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { status, json } = await runDirections(body);
    return res.status(status).json(json);
  } catch (err) {
    console.error("directions error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Directions failed." });
  }
}
