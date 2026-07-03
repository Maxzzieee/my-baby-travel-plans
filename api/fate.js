import Anthropic from "@anthropic-ai/sdk";

/**
 * Vercel Serverless Function: POST /api/fate
 *
 * BitLife-style narrative events for the chicken life sim. Given the chick's
 * life state, Claude invents ONE whimsical event with 2-3 choices, each with
 * stat effects (and occasionally a permanent trait like a face tat). Returned
 * as strict JSON; the widget validates and falls back to a local pool on error.
 */

export const config = { maxDuration: 30 };

const client = new Anthropic();
const MODEL = "claude-opus-4-8";

const FX_PROPS = {
  vitality: { type: "integer" }, cluck: { type: "integer" }, swagger: { type: "integer" },
  peck: { type: "integer" }, seeds: { type: "integer" },
};
const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Punchy event title, max ~6 words." },
    text: { type: "string", description: "1-2 whimsical sentences setting up the dilemma. Reference the chicken's age, career, or traits when fun." },
    choices: {
      type: "array",
      description: "Exactly 2 or 3 distinct choices.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "Short button label." },
          out: { type: "string", description: "One-sentence outcome shown after picking this." },
          trait: { type: "string", enum: ["none", "facetat", "goldtooth", "mohawk"], description: "Permanent trait this choice grants; usually 'none'. Grant a trait rarely and only when it fits." },
          fx: { type: "object", description: "Stat deltas -15..+15, 0 for untouched. Every choice should be a real tradeoff.", properties: FX_PROPS, required: ["vitality", "cluck", "swagger", "peck", "seeds"], additionalProperties: false },
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { name = "Piu", gen = 1, age = 0, stage = "adult", career = null, traits = [], stats = {} } = body;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: "low" },
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
    return res.status(200).json({
      title: String(ev.title || "A Strange Breeze").slice(0, 60),
      text: String(ev.text || "Something inexplicable is happening.").slice(0, 240),
      choices,
    });
  } catch (err) {
    console.error("fate error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Fate failed." });
  }
}
