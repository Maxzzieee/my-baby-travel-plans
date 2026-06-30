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

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`🧳 Plan extractor running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠️  ANTHROPIC_API_KEY is not set — /api/extract will fail until you set it.");
  }
});
