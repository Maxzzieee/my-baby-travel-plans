/**
 * Vercel Serverless Function: GET /api/place?q=<name>
 * Turns a place name into a ready-to-add idea (Kakao geocode + one re-hosted
 * photo). Used by the concierge's "add to ideas" button. Logic in ./_lib/core.js.
 */
import { runPlace } from "./_lib/core.js";

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  const { status, json } = await runPlace((req.query && req.query.q) || "");
  return res.status(status).json(json);
}
