import Anthropic from "@anthropic-ai/sdk";

/**
 * Netlify Function: POST /api/extract  (redirected from netlify.toml)
 *
 * Mirrors server/index.js so the deployed site has the same "Read with AI"
 * plan extraction. Reads ANTHROPIC_API_KEY from the Netlify environment
 * (set it in Site settings → Environment variables — never commit it).
 */

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

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  try {
    const { url, image, mediaType } = JSON.parse(event.body || "{}");
    let userContent;

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
          signal: AbortSignal.timeout(6000),
        });
        pageText = stripHtml(await r.text()).slice(0, 6000);
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
      return json(400, { error: "Provide a 'url' or an 'image'." });
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: "low" },
      messages: [{ role: "user", content: userContent }],
    });

    if (response.stop_reason === "refusal") {
      return json(422, { error: "The model declined to read this content." });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    return json(200, JSON.parse(textBlock?.text || "{}"));
  } catch (err) {
    console.error("extract error:", err?.message || err);
    return json(500, { error: err?.message || "Extraction failed." });
  }
};
