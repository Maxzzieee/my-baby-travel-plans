import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Plan-extraction backend for "My Baby Travel Plans".
 *
 * POST /api/extract
 *   body: { url } | { image: <base64-no-prefix>, mediaType }
 *   returns: { title, summary, activities: string[], location }
 *
 * Uses the Claude API (claude-opus-4-8) with vision for screenshots and
 * server-side page fetching for links, constrained to a JSON schema so the
 * frontend always receives a clean, structured plan object.
 */

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" })); // screenshots arrive base64-encoded

// Resolves credentials from ANTHROPIC_API_KEY (or an `ant auth login` profile).
const client = new Anthropic();
const MODEL = "claude-opus-4-8";

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short, cute title for this travel plan idea (max ~8 words)." },
    summary: { type: "string", description: "1-2 sentence friendly summary of what this place/activity is about." },
    activities: {
      type: "array",
      items: { type: "string" },
      description: "2-4 concrete things the couple could do here, each a short phrase.",
    },
    location: { type: "string", description: "City / country / area this relates to, or 'Unknown' if unclear." },
  },
  required: ["title", "summary", "activities", "location"],
  additionalProperties: false,
};

const PROMPT =
  "You are helping a couple plan a cozy winter trip. From the provided content " +
  "(a web page, social post, or screenshot), extract a single travel-plan idea. " +
  "Be warm and concise. Focus on what the place is and what they could actually do there.";

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

app.post("/api/extract", async (req, res) => {
  try {
    const { url, image, mediaType } = req.body || {};
    let userContent;

    if (image) {
      userContent = [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType || "image/png", data: image },
        },
        { type: "text", text: `${PROMPT}\n\nThis is a screenshot. Read it and extract the plan idea.` },
      ];
    } else if (url) {
      let pageText = "";
      try {
        const r = await fetch(url, {
          headers: { "user-agent": "Mozilla/5.0 (compatible; BabyTravelPlans/1.0)" },
          signal: AbortSignal.timeout(8000),
        });
        pageText = stripHtml(await r.text()).slice(0, 6000);
      } catch (e) {
        // Some pages block scraping or need JS — fall back to URL-only inference.
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
    res.json(data);
  } catch (err) {
    console.error("extract error:", err?.message || err);
    res.status(500).json({ error: err?.message || "Extraction failed." });
  }
});

// AI fate narrator for the chicken sim widget (mirrors api/fate.js on Vercel)
const FX_PROPS = {
  vitality: { type: "integer" }, cluck: { type: "integer" }, swagger: { type: "integer" },
  peck: { type: "integer" }, seeds: { type: "integer" },
};
const FATE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Punchy event title, max ~6 words." },
    text: { type: "string", description: "1-2 whimsical sentences setting up the dilemma." },
    choices: {
      type: "array",
      description: "Exactly 2 or 3 distinct choices.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "Short button label." },
          out: { type: "string", description: "One-sentence outcome shown after picking this." },
          trait: { type: "string", enum: ["none", "facetat", "goldtooth", "mohawk"], description: "Permanent trait; usually 'none'." },
          fx: { type: "object", description: "Stat deltas -15..+15, 0 for untouched.", properties: FX_PROPS, required: ["vitality", "cluck", "swagger", "peck", "seeds"], additionalProperties: false },
        },
        required: ["label", "out", "trait", "fx"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "text", "choices"],
  additionalProperties: false,
};
const clampFx = (n) => Math.max(-15, Math.min(15, Math.round(Number(n) || 0)));

app.post("/api/fate", async (req, res) => {
  try {
    const { name = "Piu", gen = 1, age = 0, stage = "adult", career = null, traits = [], stats = {} } = req.body || {};
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      output_config: { format: { type: "json_schema", schema: FATE_SCHEMA }, effort: "low" },
      messages: [{
        role: "user",
        content:
          "You write BitLife-style life events for a cozy rogue-lite chicken life simulator. Invent ONE short, surprising event with 2-3 distinct choices. " +
          "Each choice needs real tradeoffs (stat deltas between -15 and +15, 0 for untouched stats, 1-3 nonzero per choice). Keep it cute, a little absurd, never gory. " +
          "Traits are permanent cosmetic life-changers (facetat/goldtooth/mohawk) — grant one on at most ONE choice, and only if the dice is 80+; otherwise use 'none'. " +
          "Match the event to the chicken's life stage and situation.\n\n" +
          `Chicken: ${name}, generation ${gen}, age ${age}/100 (${stage}).\n` +
          `Career: ${career || "unemployed free spirit"}.\n` +
          `Existing traits: ${traits.length ? traits.join(", ") : "none"}.\n` +
          `Stats (0-100): ${JSON.stringify(stats)}.\n` +
          `Dice: ${Math.floor(Math.random() * 100) + 1}.`,
      }],
    });
    if (response.stop_reason === "refusal") return res.status(422).json({ error: "Fate declined to speak." });
    const textBlock = response.content.find((b) => b.type === "text");
    const ev = JSON.parse(textBlock?.text || "{}");
    const choices = (Array.isArray(ev.choices) ? ev.choices : []).slice(0, 3).map((c) => {
      const fx = {};
      for (const k of Object.keys(FX_PROPS)) { const v = clampFx(c.fx?.[k]); if (v !== 0) fx[k] = v; }
      const out = { label: String(c.label || "Okay").slice(0, 60), out: String(c.out || "It happened.").slice(0, 160), fx };
      if (c.trait && c.trait !== "none") out.trait = c.trait;
      return out;
    });
    if (choices.length < 2) throw new Error("model returned too few choices");
    res.json({
      title: String(ev.title || "A Strange Breeze").slice(0, 60),
      text: String(ev.text || "Something inexplicable is happening.").slice(0, 240),
      choices,
    });
  } catch (err) {
    console.error("fate error:", err?.message || err);
    res.status(500).json({ error: err?.message || "Fate failed." });
  }
});

// Flight prices via Amadeus Self-Service (mirrors api/flights.js on Vercel)
const FL_CITY = { sapporo: "CTS", seoul: "ICN", tokyo: "TYO", taipei: "TPE", fukuoka: "FUK", sydney: "SYD" };
const FL_ORIGIN = "SIN", FL_DEPART = "2026-11-27", FL_RETURN = "2026-12-04";
const flBase = () => (process.env.AMADEUS_ENV === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com");
let flToken = { token: null, exp: 0 };
async function flGetToken() {
  if (flToken.token && Date.now() < flToken.exp) return flToken.token;
  const r = await fetch(flBase() + "/v1/security/oauth2/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: process.env.AMADEUS_KEY, client_secret: process.env.AMADEUS_SECRET }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(j.error_description || "Amadeus auth failed");
  flToken = { token: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return flToken.token;
}
app.get("/api/flights", async (req, res) => {
  const to = String(req.query.to || "").toLowerCase();
  const dest = FL_CITY[to];
  if (!dest) return res.status(400).json({ error: "unknown destination" });
  if (!process.env.AMADEUS_KEY || !process.env.AMADEUS_SECRET) return res.json({ configured: false, dest });
  try {
    const token = await flGetToken();
    const url = `${flBase()}/v2/shopping/flight-offers?originLocationCode=${FL_ORIGIN}&destinationLocationCode=${dest}&departureDate=${FL_DEPART}&returnDate=${FL_RETURN}&adults=1&currencyCode=SGD&max=15`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    if (j.errors) return res.json({ configured: true, offers: [], note: j.errors[0]?.detail || "no offers" });
    const carriers = (j.dictionaries && j.dictionaries.carriers) || {};
    const dur = (d) => (d || "").replace("PT", "").replace("H", "h ").replace("M", "m").toLowerCase().trim();
    const offers = (j.data || []).map((o) => {
      const out = o.itineraries[0], back = o.itineraries[1], segs = out.segments;
      const bi = o.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;
      const bags = bi ? (bi.quantity != null ? `${bi.quantity} bag${bi.quantity !== 1 ? "s" : ""}` : bi.weight ? `${bi.weight}${bi.weightUnit || "kg"}` : "included") : "none / add-on";
      const codes = [...new Set(segs.map((s) => s.carrierCode))];
      return { price: Number(o.price.grandTotal), currency: o.price.currency || "SGD", airlines: codes.map((c) => carriers[c] || c), outStops: segs.length - 1, outDur: dur(out.duration), backStops: back ? back.segments.length - 1 : null, depTime: segs[0].departure.at, bags };
    }).sort((a, b) => a.price - b.price).slice(0, 5);
    res.json({ configured: true, offers });
  } catch (err) {
    console.error("flights error:", err?.message || err);
    res.json({ configured: true, offers: [], note: err?.message || "lookup failed" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`🧳 Plan extractor running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠️  ANTHROPIC_API_KEY is not set — /api/extract will fail until you set it.");
  }
});
