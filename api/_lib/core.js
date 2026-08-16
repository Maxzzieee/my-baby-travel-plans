// Shared backend logic for both the Vercel serverless functions (api/*.js) and
// the local Express dev server (server/index.js). Single source of truth so the
// two never drift again. Files under api/_lib are NOT routed by Vercel.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-4-8";
export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
export const KCAT = { FD6: "food", CE7: "food", MT1: "shop", CS2: "shop", AT4: "activity", CT1: "activity", AD5: "stay" };
export const GROUP = { activity: "AT4", food: "FD6", cafe: "CE7", shop: "MT1", culture: "CT1" };

// Lazy Anthropic client — resolves ANTHROPIC_API_KEY or an `ant auth login`
// profile. Returns null if construction fails so callers can degrade gracefully.
let _client;
export function getClient() {
  if (_client !== undefined) return _client;
  try { _client = new Anthropic(); } catch { _client = null; }
  return _client;
}

export const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short, cute title for this travel plan idea (max ~8 words)." },
    summary: { type: "string", description: "1-2 sentence friendly summary of what this place/activity is about." },
    activities: { type: "array", items: { type: "string" }, description: "2-4 concrete things the couple could do here, each a short phrase." },
    location: { type: "string", description: "City / country / area this relates to, or 'Unknown' if unclear." },
    venue: { type: "string", description: "The exact OFFICIAL place name as it appears on a map or signboard — as SHORT as possible, NO descriptive words (e.g. 'T1 베이스캠프' NOT 'T1 Shop for Esports Fans'; 'Puradak' NOT 'Crispy Korean Fried Chicken'). Strongly prefer the Korean name. 'Unknown' only if there is no specific place." },
  },
  required: ["title", "summary", "activities", "location", "venue"],
  additionalProperties: false,
};

export const EXTRACT_PROMPT =
  "You are helping a couple plan a cozy winter trip to Seoul. From the provided content " +
  "(a web page, social post, or screenshot), extract a single travel-plan idea. Be warm and " +
  "concise. Focus on what the place is and what they could actually do there. `venue` must be the " +
  "real, short, map-searchable place name (Korean strongly preferred) — never a description.";

export function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Kakao Local keyword search → { name, address, lat, lng, kind } or null. Seoul-biased.
export async function kakaoGeocode(q) {
  const key = process.env.KAKAO_REST_KEY;
  if (!key || !q || q === "Unknown") return null;
  try {
    const r = await fetch("https://dapi.kakao.com/v2/local/search/keyword.json?size=10&query=" + encodeURIComponent(q), {
      headers: { Authorization: "KakaoAK " + key },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const docs = d.documents || [];
    const doc = docs.find((x) => (x.road_address_name || x.address_name || "").startsWith("서울")) || docs[0];
    if (!doc) return null;
    return { name: doc.place_name || "", address: doc.road_address_name || doc.address_name || "", lat: +doc.y, lng: +doc.x, kind: KCAT[doc.category_group_code] || null };
  } catch { return null; }
}

// Pull 1-3 content photos from page HTML (og:image first, then <img> tags).
export function extractImages(html, baseUrl, max = 3) {
  const out = [];
  const bad = /(sprite|logo|icon|avatar|favicon|pixel|blank|spacer|1x1|placeholder|loading|advert|badge|button|emoji|share|social)/i;
  const push = (u) => {
    if (!u || out.length >= max) return;
    try { u = new URL(u, baseUrl).href; } catch { return; }
    if (!/^https?:\/\//i.test(u)) return;
    if (/\.svg(\?|$)/i.test(u) || u.startsWith("data:")) return;
    if (bad.test(u)) return;
    if (!out.includes(u)) out.push(u);
  };
  for (const m of html.match(/<meta[^>]+>/gi) || []) {
    if (/(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/i.test(m)) {
      const c = m.match(/content=["']([^"']+)["']/i);
      if (c) push(c[1]);
    }
  }
  for (const tag of html.match(/<img[^>]+>/gi) || []) {
    if (out.length >= max) break;
    const s = tag.match(/(?:data-src|data-lazy-src|data-original|src)=["']([^"']+)["']/i);
    if (s) push(s[1]);
  }
  return out.slice(0, max);
}

// Kakao/Daum image search — reliable when the source site blocks scraping.
export async function kakaoImages(q, n = 4) {
  const key = process.env.KAKAO_REST_KEY;
  if (!key || !q || q === "Unknown") return [];
  try {
    const r = await fetch("https://dapi.kakao.com/v2/search/image?sort=accuracy&size=" + (n * 2) + "&query=" + encodeURIComponent(q), { headers: { Authorization: "KakaoAK " + key } });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.documents || []).filter((x) => x.image_url && (x.width || 0) >= 300 && (x.height || 0) >= 220).map((x) => x.image_url).slice(0, n);
  } catch { return []; }
}

// Re-host an image into Supabase storage (source CDNs often Referer-block hotlinks).
export async function uploadToStorage(imageUrl) {
  const base = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_ANON_KEY || "").trim();
  if (!base || !key || !imageUrl) return null;
  try {
    const r = await fetch(imageUrl, { headers: { "user-agent": BROWSER_UA }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!ct.startsWith("image/")) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.length < 2500 || bytes.length > 6_000_000) return null;
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : ct.includes("gif") ? "gif" : "jpg";
    const path = `scraped/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const up = await fetch(`${base}/storage/v1/object/memes/${path}`, {
      method: "POST", headers: { apikey: key, Authorization: "Bearer " + key, "content-type": ct }, body: bytes,
    });
    if (!up.ok) return null;
    return `${base}/storage/v1/object/public/memes/${path}`;
  } catch { return null; }
}

// ---- endpoint cores: each returns { status, json } ----

export async function runExtract(body) {
  const { url, image, mediaType } = body || {};
  const client = getClient();
  if (!client) return { status: 500, json: { error: "AI not configured (ANTHROPIC_API_KEY missing)." } };

  let userContent, rawHtml = "";
  if (image) {
    userContent = [
      { type: "image", source: { type: "base64", media_type: mediaType || "image/png", data: image } },
      { type: "text", text: `${EXTRACT_PROMPT}\n\nThis is a screenshot. Read it and extract the plan idea.` },
    ];
  } else if (url) {
    let pageText = "";
    try {
      const r = await fetch(url, { headers: { "user-agent": BROWSER_UA, accept: "text/html" }, signal: AbortSignal.timeout(8000) });
      rawHtml = await r.text();
      pageText = stripHtml(rawHtml).slice(0, 6000);
    } catch { /* page blocked scraping or needs JS — fall back to URL-only inference */ }
    userContent = [{ type: "text", text: `${EXTRACT_PROMPT}\n\nURL: ${url}\n\nPage content (may be partial):\n${pageText || "(could not fetch page text — infer what you can from the URL itself)"}` }];
  } else {
    return { status: 400, json: { error: "Provide a 'url' or an 'image'." } };
  }

  const response = await client.messages.create({
    model: MODEL, max_tokens: 1024,
    output_config: { format: { type: "json_schema", schema: EXTRACT_SCHEMA }, effort: "low" },
    messages: [{ role: "user", content: userContent }],
  });
  if (response.stop_reason === "refusal") return { status: 422, json: { error: "The model declined to read this content." } };

  const textBlock = response.content.find((b) => b.type === "text");
  const data = JSON.parse(textBlock?.text || "{}");

  const geo = await kakaoGeocode(data.venue || data.title);
  if (geo && Number.isFinite(geo.lat)) {
    data.location = geo.name ? `${geo.name} · ${geo.address}` : geo.address || data.location;
    data.lat = geo.lat; data.lng = geo.lng;
    if (geo.kind) data.kind = geo.kind;
  }
  let candidates = rawHtml ? extractImages(rawHtml, url, 4) : [];
  if (candidates.length < 3) candidates = candidates.concat(await kakaoImages((geo && geo.name) || data.venue || data.title, 4));
  candidates = candidates.filter((v, i, a) => a.indexOf(v) === i);
  const photos = [];
  for (const src of candidates) { if (photos.length >= 3) break; const hosted = await uploadToStorage(src); if (hosted) photos.push(hosted); }
  if (photos.length) { data.photos = photos; data.thumb = photos[0]; }
  return { status: 200, json: data };
}

// Batch-translate Korean place names + categories to natural English. Best-effort:
// returns null on any failure so callers fall back to client-side romanization.
const TRANSLATE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          en: { type: "string", description: "Natural, concise English name. Keep it recognizable — transliterate the proper name and add a short gloss where it helps (e.g. '봉제골목' -> 'Bongje Sewing Alley', '창신동족발골목' -> 'Changsin-dong Jokbal (Pig Trotter) Alley')." },
          catEn: { type: "string", description: "Category in plain English (e.g. 'Food alley', 'Viewpoint')." },
        },
        required: ["en", "catEn"], additionalProperties: false,
      },
    },
  },
  required: ["items"], additionalProperties: false,
};
export async function translateNames(items) {
  const client = getClient();
  const list = (items || []).filter((it) => it && it.name);
  if (!client || !list.length) return null;
  try {
    const lines = list.map((it, i) => `${i + 1}. ${it.name}${it.cat ? ` [${it.cat}]` : ""}`).join("\n");
    const response = await client.messages.create({
      model: MODEL, max_tokens: 900,
      output_config: { format: { type: "json_schema", schema: TRANSLATE_SCHEMA }, effort: "low" },
      messages: [{ role: "user", content:
        "Translate these Korean place names and categories to natural English for a traveler who can't read Korean. " +
        "Return exactly one item per input, in the SAME ORDER.\n\n" + lines }],
    });
    if (response.stop_reason === "refusal") return null;
    const textBlock = response.content.find((b) => b.type === "text");
    const out = JSON.parse(textBlock?.text || "{}").items;
    return Array.isArray(out) && out.length === list.length ? out : null;
  } catch { return null; }
}

export async function runSuggest({ x, y, kind = "activity", translate = false }) {
  const key = (process.env.KAKAO_REST_KEY || "").trim();
  if (!key || !x || !y) return { status: 200, json: { places: [] } };
  const code = GROUP[kind] || "AT4";
  try {
    const r = await fetch(
      `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${code}&x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}&radius=6000&size=12&sort=distance`,
      { headers: { Authorization: "KakaoAK " + key } }
    );
    if (!r.ok) return { status: 200, json: { places: [] } };
    const d = await r.json();
    const places = (d.documents || []).map((doc) => ({
      name: doc.place_name, address: doc.road_address_name || doc.address_name || "",
      lat: +doc.y, lng: +doc.x, kind: KCAT[doc.category_group_code] || kind,
      cat: (doc.category_name || "").split(" > ").slice(-1)[0], url: doc.place_url || "",
    }));
    if (translate && places.length) {
      const en = await translateNames(places.map((p) => ({ name: p.name, cat: p.cat })));
      if (en) places.forEach((p, i) => { p.en = en[i]?.en || ""; p.catEn = en[i]?.catEn || ""; });
    }
    return { status: 200, json: { places } };
  } catch (e) {
    return { status: 200, json: { places: [], error: String(e) } };
  }
}

export async function runGeocode(q) {
  q = (q || "").toString().trim();
  if (!q) return { status: 400, json: { error: "missing q" } };
  const key = process.env.KAKAO_REST_KEY;
  try {
    if (key) {
      const r = await fetch("https://dapi.kakao.com/v2/local/search/keyword.json?size=1&query=" + encodeURIComponent(q), { headers: { Authorization: "KakaoAK " + key } });
      if (r.ok) {
        const d = await r.json();
        const doc = d.documents && d.documents[0];
        if (doc) return { status: 200, json: { lat: +doc.y, lng: +doc.x, address: doc.road_address_name || doc.address_name || "", name: doc.place_name || "", cat: doc.category_group_code || "", source: "kakao" } };
      }
    }
    const nr = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=" + encodeURIComponent(q + ", Seoul, South Korea"), { headers: { "User-Agent": "metrip/1.0 (info@zhenghe.com.sg)" } });
    if (nr.ok) { const arr = await nr.json(); if (arr && arr[0]) return { status: 200, json: { lat: +arr[0].lat, lng: +arr[0].lon, source: "osm" } }; }
    return { status: 200, json: { lat: null, lng: null } };
  } catch (e) {
    return { status: 200, json: { lat: null, lng: null, error: String(e) } };
  }
}

// Seoul transit directions between two stops (subway/bus/walk). AI-generated
// (no free Korean transit API without a separate key), so it's a realistic
// guide, not gospel — the client tells users to confirm in a maps app.
const DIRECTIONS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "One-line overview, e.g. 'Subway Line 3, ~18 min'." },
    totalMinutes: { type: "integer", description: "Realistic door-to-door minutes." },
    steps: {
      type: "array",
      description: "2-6 ordered steps from origin to destination.",
      items: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["walk", "subway", "bus", "taxi", "transfer"], description: "Mode for this step." },
          text: { type: "string", description: "Concise instruction: name the subway line (number + colour) or bus number, board/alight stations, transfers, and where to walk." },
          minutes: { type: "integer", description: "Minutes for this step." },
        },
        required: ["mode", "text", "minutes"], additionalProperties: false,
      },
    },
  },
  required: ["summary", "totalMinutes", "steps"], additionalProperties: false,
};
export async function runDirections({ from, to }) {
  const client = getClient();
  if (!client) return { status: 500, json: { error: "AI not configured (ANTHROPIC_API_KEY missing)." } };
  const label = (p) => p && (p.title || p.place);
  if (!label(from) || !label(to)) return { status: 400, json: { error: "Need a 'from' and a 'to'." } };
  const loc = (p) => `${p.title || ""}${p.place ? ` — ${p.place}` : ""}${p.lat != null && p.lng != null ? ` [${(+p.lat).toFixed(4)},${(+p.lng).toFixed(4)}]` : ""}`;
  try {
    const response = await client.messages.create({
      model: MODEL, max_tokens: 700,
      output_config: { format: { type: "json_schema", schema: DIRECTIONS_SCHEMA }, effort: "low" },
      messages: [{ role: "user", content:
        "You are a Seoul local giving quick public-transport directions for a couple travelling on foot + subway/bus. " +
        "Prefer the subway (name the line number, its colour, and the get-off station) plus short walks; use a bus only when clearly better; taxi only for short awkward hops with no transit. " +
        "Be realistic and concise. The coordinates disambiguate each place.\n\n" +
        `FROM: ${loc(from)}\nTO: ${loc(to)}` }],
    });
    if (response.stop_reason === "refusal") return { status: 422, json: { error: "Couldn't produce directions for this pair." } };
    const textBlock = response.content.find((b) => b.type === "text");
    return { status: 200, json: JSON.parse(textBlock?.text || "{}") };
  } catch (e) {
    return { status: 500, json: { error: e?.message || "Directions failed." } };
  }
}
