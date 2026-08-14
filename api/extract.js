import Anthropic from "@anthropic-ai/sdk";

/**
 * Vercel Serverless Function: POST /api/extract
 *
 * Reads a link (or screenshot) into a travel-plan idea. For links it ALSO:
 *  - asks the model for the specific venue name, then geocodes it with Kakao
 *    (exact Korean address + coords + category) so the idea pins itself;
 *  - grabs 1-3 relevant photos from the page (og:image + content images).
 * Reads ANTHROPIC_API_KEY + KAKAO_REST_KEY from env — never committed.
 */

export const config = { maxDuration: 60 };

const client = new Anthropic();
const MODEL = "claude-opus-4-8";

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short, cute title for this travel plan idea (max ~8 words)." },
    summary: { type: "string", description: "1-2 sentence friendly summary of what this place/activity is about." },
    activities: { type: "array", items: { type: "string" }, description: "2-4 concrete things the couple could do here, each a short phrase." },
    location: { type: "string", description: "City / country / area this relates to, or 'Unknown' if unclear." },
    venue: { type: "string", description: "The SPECIFIC place/venue name to look up on a map (restaurant, cafe, attraction, shop) — in Korean if the page gives it, else romanized/English. 'Unknown' if it is not a specific place." },
  },
  required: ["title", "summary", "activities", "location", "venue"],
  additionalProperties: false,
};

const PROMPT =
  "You are helping a couple plan a cozy winter trip to Seoul. From the provided content " +
  "(a web page, social post, or screenshot), extract a single travel-plan idea. Be warm and " +
  "concise. Focus on what the place is and what they could actually do there. For `venue`, give " +
  "the exact business/place name so it can be found on a map (prefer the Korean name if present).";

const KCAT = { FD6: "food", CE7: "food", MT1: "shop", CS2: "shop", AT4: "activity", CT1: "activity", AD5: "stay" };

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Kakao Local keyword search → { name, address, lat, lng, kind } or null.
async function kakaoGeocode(q) {
  const key = process.env.KAKAO_REST_KEY;
  if (!key || !q || q === "Unknown") return null;
  try {
    const r = await fetch("https://dapi.kakao.com/v2/local/search/keyword.json?size=1&query=" + encodeURIComponent(q), {
      headers: { Authorization: "KakaoAK " + key },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const doc = d.documents && d.documents[0];
    if (!doc) return null;
    return {
      name: doc.place_name || "",
      address: doc.road_address_name || doc.address_name || "",
      lat: +doc.y, lng: +doc.x,
      kind: KCAT[doc.category_group_code] || null,
    };
  } catch { return null; }
}

// Pull 1-3 content photos from page HTML (og:image first, then <img> tags).
function extractImages(html, baseUrl, max = 3) {
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
  const metas = html.match(/<meta[^>]+>/gi) || [];
  for (const m of metas) {
    if (/(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/i.test(m)) {
      const c = m.match(/content=["']([^"']+)["']/i);
      if (c) push(c[1]);
    }
  }
  const imgs = html.match(/<img[^>]+>/gi) || [];
  for (const tag of imgs) {
    if (out.length >= max) break;
    const s = tag.match(/(?:data-src|data-lazy-src|data-original|src)=["']([^"']+)["']/i);
    if (s) push(s[1]);
  }
  return out.slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { url, image, mediaType } = body;
    let userContent;
    let rawHtml = "";

    if (image) {
      userContent = [
        { type: "image", source: { type: "base64", media_type: mediaType || "image/png", data: image } },
        { type: "text", text: `${PROMPT}\n\nThis is a screenshot. Read it and extract the plan idea.` },
      ];
    } else if (url) {
      let pageText = "";
      try {
        const r = await fetch(url, {
          headers: { "user-agent": "Mozilla/5.0 (compatible; BabyTravelPlans/1.0)" },
          signal: AbortSignal.timeout(8000),
        });
        rawHtml = await r.text();
        pageText = stripHtml(rawHtml).slice(0, 6000);
      } catch (e) {
        // Page blocked scraping or needs JS — fall back to URL-only inference.
      }
      userContent = [
        {
          type: "text",
          text: `${PROMPT}\n\nURL: ${url}\n\nPage content (may be partial):\n${
            pageText || "(could not fetch page text — infer what you can from the URL itself)"
          }`,
        },
      ];
    } else {
      return res.status(400).json({ error: "Provide a 'url' or an 'image'." });
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: "low" },
      messages: [{ role: "user", content: userContent }],
    });

    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "The model declined to read this content." });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    const data = JSON.parse(textBlock?.text || "{}");

    // Kakao: exact address + coords + category from the venue name.
    const geo = await kakaoGeocode(data.venue || data.title);
    if (geo && Number.isFinite(geo.lat)) {
      data.location = geo.name ? `${geo.name} · ${geo.address}` : geo.address || data.location;
      data.lat = geo.lat; data.lng = geo.lng;
      if (geo.kind) data.kind = geo.kind;
    }

    // 1-3 relevant photos from the page.
    if (rawHtml) {
      const photos = extractImages(rawHtml, url, 3);
      if (photos.length) { data.photos = photos; data.thumb = photos[0]; }
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("extract error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Extraction failed." });
  }
}
