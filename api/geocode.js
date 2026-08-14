/**
 * Vercel Serverless Function: GET /api/geocode?q=...
 *
 * Turns a place name/address into { lat, lng, address, name, cat } using Kakao's
 * Local keyword search (best-in-Korea), falling back to OpenStreetMap Nominatim.
 * Reads KAKAO_REST_KEY from the Vercel project env — never committed.
 */
export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  const q = ((req.query && req.query.q) || "").toString().trim();
  if (!q) return res.status(400).json({ error: "missing q" });
  const key = process.env.KAKAO_REST_KEY;
  try {
    if (key) {
      const r = await fetch(
        "https://dapi.kakao.com/v2/local/search/keyword.json?size=1&query=" + encodeURIComponent(q),
        { headers: { Authorization: "KakaoAK " + key } }
      );
      if (r.ok) {
        const d = await r.json();
        const doc = d.documents && d.documents[0];
        if (doc) {
          return res.status(200).json({
            lat: +doc.y, lng: +doc.x,
            address: doc.road_address_name || doc.address_name || "",
            name: doc.place_name || "",
            cat: doc.category_group_code || "",
            source: "kakao",
          });
        }
      }
    }
    // fallback: OpenStreetMap (keyless), biased to Seoul
    const nr = await fetch(
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=" +
        encodeURIComponent(q + ", Seoul, South Korea"),
      { headers: { "User-Agent": "metrip/1.0 (info@zhenghe.com.sg)" } }
    );
    if (nr.ok) {
      const arr = await nr.json();
      if (arr && arr[0]) return res.status(200).json({ lat: +arr[0].lat, lng: +arr[0].lon, source: "osm" });
    }
    return res.status(200).json({ lat: null, lng: null });
  } catch (e) {
    return res.status(200).json({ lat: null, lng: null, error: String(e) });
  }
}
