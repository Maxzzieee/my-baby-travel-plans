/**
 * Vercel Serverless Function: GET /api/geocode?q=...
 *
 * Turns a place name/address into { lat, lng, address, name, cat } using Kakao's
 * Local keyword search (best-in-Korea), falling back to OpenStreetMap Nominatim.
 * Reads KAKAO_REST_KEY from the Vercel project env — never committed.
 */
export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  // env presence check (booleans only, no values) for debugging deploys
  if (req.query && req.query.diag) {
    return res.status(200).json({
      KAKAO_REST_KEY: !!process.env.KAKAO_REST_KEY,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    });
  }
  if (req.query && req.query.imgtest) {
    const qq = req.query.imgtest.toString();
    const key = process.env.KAKAO_REST_KEY, base = process.env.SUPABASE_URL, sk = process.env.SUPABASE_ANON_KEY;
    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    const out = { q: qq, tries: [] };
    try {
      const kr = await fetch("https://dapi.kakao.com/v2/search/image?size=6&query=" + encodeURIComponent(qq), { headers: { Authorization: "KakaoAK " + key } });
      const kd = await kr.json();
      const docs = (kd.documents || []).filter((x) => x.image_url && (x.width || 0) >= 300).slice(0, 3);
      for (const doc of docs) {
        const t = { imgHost: (() => { try { return new URL(doc.image_url).host; } catch { return "?"; } })() };
        try {
          const ir = await fetch(doc.image_url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(7000) });
          t.fetch = ir.status;
          if (ir.ok) {
            const bytes = new Uint8Array(await ir.arrayBuffer());
            t.bytes = bytes.length;
            const path = `scraped/diag-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
            const up = await fetch(`${base}/storage/v1/object/memes/${path}`, { method: "POST", headers: { apikey: sk, Authorization: "Bearer " + sk, "content-type": "image/jpeg" }, body: bytes });
            t.upload = up.status + (up.ok ? " OK" : " " + (await up.text()).slice(0, 60));
          }
        } catch (e) { t.err = String(e).slice(0, 55); }
        out.tries.push(t);
      }
    } catch (e) { out.error = String(e).slice(0, 90); }
    return res.status(200).json(out);
  }
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
