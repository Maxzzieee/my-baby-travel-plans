/**
 * Vercel Serverless Function: GET /api/geocode?q=...
 * Place name/address → { lat, lng, address, name, cat } via Kakao (Seoul-best),
 * falling back to OpenStreetMap. Logic in ./_lib/core.js.
 */
import { runGeocode } from "./_lib/core.js";

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  const { status, json } = await runGeocode((req.query && req.query.q) || "");
  return res.status(status).json(json);
}
