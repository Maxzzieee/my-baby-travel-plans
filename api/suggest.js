/**
 * Vercel Serverless Function: GET /api/suggest?x=<lng>&y=<lat>&kind=activity&en=1
 * Recommends real places near a point via Kakao category search. With en=1 the
 * Korean names are also translated to English. Logic in ./_lib/core.js.
 */
import { runSuggest } from "./_lib/core.js";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  const q = req.query || {};
  const { status, json } = await runSuggest({
    x: q.x || "", y: q.y || "", kind: (q.kind || "activity").toString(),
    translate: q.en === "1" || q.en === "true",
  });
  return res.status(status).json(json);
}
