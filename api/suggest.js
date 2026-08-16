/**
 * Vercel Serverless Function: GET /api/suggest?x=<lng>&y=<lat>&kind=activity
 *
 * Recommends real places near a point via Kakao category search — used to fill
 * gaps in a day (an activity in this area, or food near a day-trip).
 */
export const config = { maxDuration: 15 };

const GROUP = { activity: "AT4", food: "FD6", cafe: "CE7", shop: "MT1", culture: "CT1" };
const KCAT = { FD6: "food", CE7: "food", MT1: "shop", CS2: "shop", AT4: "activity", CT1: "activity", AD5: "stay" };

export default async function handler(req, res) {
  const key = (process.env.KAKAO_REST_KEY || "").trim();
  const x = (req.query && req.query.x) || "";
  const y = (req.query && req.query.y) || "";
  const kind = ((req.query && req.query.kind) || "activity").toString();
  if (!key || !x || !y) return res.status(200).json({ places: [] });
  const code = GROUP[kind] || "AT4";
  try {
    const r = await fetch(
      `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${code}&x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}&radius=6000&size=12&sort=distance`,
      { headers: { Authorization: "KakaoAK " + key } }
    );
    if (!r.ok) return res.status(200).json({ places: [] });
    const d = await r.json();
    const places = (d.documents || []).map((doc) => ({
      name: doc.place_name,
      address: doc.road_address_name || doc.address_name || "",
      lat: +doc.y, lng: +doc.x,
      kind: KCAT[doc.category_group_code] || kind,
      cat: (doc.category_name || "").split(" > ").slice(-1)[0],
      url: doc.place_url || "",
    }));
    return res.status(200).json({ places });
  } catch (e) {
    return res.status(200).json({ places: [], error: String(e) });
  }
}
