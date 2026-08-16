/**
 * Vercel Serverless Function: POST /api/extract
 * Reads a link (or screenshot) into a travel-plan idea, geocodes the venue with
 * Kakao, and grabs 1-3 re-hosted photos. Logic lives in ./_lib/core.js (shared
 * with the local Express dev server so the two can't drift).
 */
import { runExtract } from "./_lib/core.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { status, json } = await runExtract(body);
    return res.status(status).json(json);
  } catch (err) {
    console.error("extract error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Extraction failed." });
  }
}
