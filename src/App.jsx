import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Heart,
  Plane,
  Snowflake,
  Sunset,
  Train,
  MapPin,
  Wallet,
  Thermometer,
  ChevronDown,
  Moon,
  Star,
  Calendar,
  Trophy,
  CloudSnow,
  RefreshCw,
  Crown,
  RotateCcw,
  Link2,
  Image as ImageIcon,
  PenLine,
  Sparkles,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  X,
  NotebookPen,
  MessageCircle,
  Send,
  Cloud,
  CloudOff,
  Check,
} from "lucide-react";
import { hasSupabase, loadState, saveState, subscribe, loadGallery, postImage, deleteImage, subscribeGallery, loadCopy, saveCopy, subscribeCopy } from "./lib/supabase";

/**
 * My Baby Travel Plans 🧳✨  — Nov 27 – Dec 4
 *
 * Each destination is a "passport". Its deep-dive drawer holds a per-passport
 * Idea Board: paste a link or drop a screenshot, the AI scrubs it into a clean
 * plan entry pinned to that destination. Plus your notes + what you want to do.
 * Heart Tracker (Max vs Partner) and live weather peeks throughout.
 */

const ACCENTS = {
  winter: { name: "Powder Winter Blue", hex: "#B9DAE7", soft: "#EAF5FA", border: "#9CCBDD", text: "#3D6B7D" },
  blush: { name: "Soft Blush Pink", hex: "#FFDFD3", soft: "#FFF3EE", border: "#F6C3B2", text: "#A65A45" },
  mint: { name: "Minty Pastel Green", hex: "#C5EBD5", soft: "#EDFAF2", border: "#A2DCBA", text: "#3F7C5C" },
};

const BUDGET_TONE = {
  under: { label: "Well Under Budget", emoji: "🌿", chip: ACCENTS.mint },
  target: { label: "On Budget Target", emoji: "✅", chip: ACCENTS.mint },
  onbudget: { label: "On Budget", emoji: "🟢", chip: ACCENTS.mint },
  slightly: { label: "Slightly Over", emoji: "🟡", chip: ACCENTS.blush },
  over: { label: "Over Budget", emoji: "🔴", chip: ACCENTS.blush },
};

const VOTES_KEY = "maxpartner.trip.votes.v2";
const PLANS_KEY = "maxbaby.plans.byDest.v1";

const DESTINATIONS = [
  {
    id: "sapporo", emoji: "❄️", name: "Sapporo", region: "Hokkaido, Japan", tagline: "Deep-snow seafood wonderland",
    accent: ACCENTS.winter, cozyScore: 5, coords: { lat: 43.0618, lon: 141.3545 }, recommendation: { rank: 2 },
    flight: { price: "S$1,000+", per: "per pax", carrier: "Various", budget: "over", note: "Premium for peak deep-winter Hokkaido demand." },
    weather: { range: "-1°C to 6°C", label: "Freezing", snow: "High snow accumulation probability", snowIcon: true },
    sunset: "4:00 PM", sunsetNote: "Elite early dark cozy-night vibe",
    basecamp: { station: "Nakajima Koen Station", logic: "1 stop on Namboku Subway Line to Odori Park", vibe: "Local food lanes, quiet park-side calm", price: "S$90–S$110 / night" },
  },
  {
    id: "seoul", emoji: "🧸", name: "Seoul", region: "South Korea", tagline: "Crisp winds & character flagships",
    accent: ACCENTS.blush, cozyScore: 4, coords: { lat: 37.5665, lon: 126.978 }, recommendation: { rank: 1 },
    flight: { price: "S$768", per: "per pax", carrier: "Korean Air (full-service)", budget: "target", note: "Full-service comfort right on the budget line." },
    weather: { range: "-2°C to 7°C", label: "Biting Cold", snow: "Crisp clear winds, potential early flurries", snowIcon: true },
    sunset: "5:15 PM", sunsetNote: "Golden-hour over the Han River",
    basecamp: { station: "Hapjeong Station", logic: "1 stop on Line 2 from the main Hongdae chaos", vibe: "Calm neighborhood, easy late-night returns", price: "S$80–S$100 / night" },
  },
  {
    id: "tokyo", emoji: "✨", name: "Tokyo", region: "Japan", tagline: "Winter illuminations & IP mecca",
    accent: ACCENTS.blush, cozyScore: 4, coords: { lat: 35.6762, lon: 139.6503 }, recommendation: { rank: 3 },
    flight: { price: "S$948", per: "per pax", carrier: "ZIPAIR + baggage bundle", budget: "slightly", note: "Low-cost base fare, nudged up by the baggage bundle." },
    weather: { range: "6°C to 13°C", label: "Brisk Winter Jacket", snow: "Zero snow chance", snowIcon: false },
    sunset: "4:30 PM", sunsetNote: "City flips into winter illuminations early",
    basecamp: { station: "Koenji Station", logic: "2 stops on JR Chuo Line from Shinjuku", vibe: "Retro indoor izakaya shotengai alleys", price: "S$100–S$120 / night" },
  },
  {
    id: "taipei", emoji: "🦦", name: "Taipei", region: "Taiwan", tagline: "Budget king & night-market feasts",
    accent: ACCENTS.mint, cozyScore: 3, coords: { lat: 25.033, lon: 121.5654 }, recommendation: { rank: 4 },
    flight: { price: "S$500", per: "per pax", carrier: "STARLUX / China Airlines", budget: "under", note: "The clear financial win of the shortlist." },
    weather: { range: "15°C to 20°C", label: "Cool & mild", snow: "Needs a Cingjing / Alishan mountain day for sub-10°C cold", snowIcon: false },
    sunset: "5:05 PM", sunsetNote: "Soft warm evenings, lightest jacket of the lot",
    basecamp: { station: "Shuanglian Station", logic: "1 stop on Red Line to Taipei Main", vibe: "Right next to Ningxia Night Market food rows", price: "S$70–S$90 / night" },
  },
  {
    id: "fukuoka", emoji: "🍱", name: "Fukuoka", region: "Kyushu, Japan", tagline: "Yatai stalls & coastal calm",
    accent: ACCENTS.mint, cozyScore: 3, coords: { lat: 33.5904, lon: 130.4017 }, recommendation: { rank: 5 },
    flight: { price: "S$530–S$630", per: "per pax", carrier: "Budget via Hanoi / Manila", budget: "onbudget", note: "Cheap fare, but high-friction 8–15h layovers." },
    weather: { range: "7°C to 14°C", label: "Chilly & coastal", snow: "Clear brisk walking skies, no snow", snowIcon: false },
    sunset: "5:00 PM", sunsetNote: "Riverside lights along the Naka River",
    basecamp: { station: "Gion Station", logic: "1 stop to Hakata Main Station", vibe: "Local neighborhood feel, walkable to Canal City", price: "S$80–S$100 / night" },
  },
];

const WMO = {
  0: { t: "Clear", e: "☀️" }, 1: { t: "Mostly clear", e: "🌤️" }, 2: { t: "Partly cloudy", e: "⛅" },
  3: { t: "Overcast", e: "☁️" }, 45: { t: "Fog", e: "🌫️" }, 48: { t: "Rime fog", e: "🌫️" },
  51: { t: "Light drizzle", e: "🌦️" }, 53: { t: "Drizzle", e: "🌦️" }, 55: { t: "Dense drizzle", e: "🌧️" },
  61: { t: "Light rain", e: "🌧️" }, 63: { t: "Rain", e: "🌧️" }, 65: { t: "Heavy rain", e: "🌧️" },
  71: { t: "Light snow", e: "🌨️" }, 73: { t: "Snow", e: "❄️" }, 75: { t: "Heavy snow", e: "❄️" },
  77: { t: "Snow grains", e: "🌨️" }, 80: { t: "Rain showers", e: "🌦️" }, 85: { t: "Snow showers", e: "🌨️" },
  86: { t: "Snow showers", e: "❄️" }, 95: { t: "Thunderstorm", e: "⛈️" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function Pill({ children, accent, soft = true }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold leading-none" style={{ backgroundColor: soft ? accent.soft : accent.hex, color: accent.text, border: `1.5px solid ${accent.border}` }}>
      {children}
    </span>
  );
}

function StatRow({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: accent.soft, color: accent.text }}>
        <Icon size={16} strokeWidth={2.4} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">{label}</p>
        <p className="text-sm font-semibold text-stone-700">{value}</p>
      </div>
    </div>
  );
}

function CozyMeter({ score, accent }) {
  return (
    <div className="flex items-center gap-1" title={`Cozy-night score: ${score}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Moon key={n} size={14} strokeWidth={2.4} style={{ color: n <= score ? accent.text : "#E7E1D8", fill: n <= score ? accent.hex : "transparent" }} />
      ))}
    </div>
  );
}

function LiveWeather({ coords, accent }) {
  const [state, setState] = useState({ status: "loading", data: null });
  const load = useCallback(() => {
    setState({ status: "loading", data: null });
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&timezone=auto`;
    fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => setState({ status: "ok", data: { temp: Math.round(j.current.temperature_2m), code: j.current.weather_code } }))
      .catch(() => setState({ status: "error", data: null }));
  }, [coords.lat, coords.lon]);
  useEffect(() => { load(); }, [load]);
  const w = state.data ? WMO[state.data.code] || { t: "—", e: "🌡️" } : null;
  return (
    <div className="flex items-center justify-between rounded-2xl px-4 py-2.5" style={{ backgroundColor: accent.soft, border: `1.5px solid ${accent.border}` }}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Live there now</span>
        {state.status === "loading" && <span className="text-sm font-semibold text-stone-400">fetching…</span>}
        {state.status === "error" && <span className="text-sm font-semibold text-stone-400">offline — see planning range</span>}
        {state.status === "ok" && <span className="text-sm font-extrabold" style={{ color: accent.text }}>{w.e} {state.data.temp}°C · {w.t}</span>}
      </div>
      <button onClick={load} className="rounded-full p-1.5 transition-transform hover:rotate-90 active:scale-90" style={{ color: accent.text }} aria-label="Refresh live weather">
        <RefreshCw size={14} strokeWidth={2.6} />
      </button>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const EMPTY_DRAFT = { title: "", summary: "", activities: [], location: "", comment: "", want: "", sourceUrl: "", thumb: "" };

// ---------------------------------------------------------------------------
// A single saved idea, with its own comment thread
// ---------------------------------------------------------------------------
function SavedIdea({ plan, accent, onDelete, onAddComment }) {
  const [text, setText] = useState("");
  const [who, setWho] = useState("me");
  const comments = plan.comments || [];

  const add = () => {
    if (!text.trim()) return;
    onAddComment(plan.id, { id: `c_${Date.now()}`, who, text: text.trim(), at: Date.now() });
    setText("");
  };

  return (
    <div className="rounded-xl bg-white p-3" style={{ border: `1.5px solid ${accent.border}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {plan.thumb && <img src={plan.thumb} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg border border-stone-200 object-cover" />}
          <div>
            <h4 className="text-sm font-extrabold text-stone-800">{plan.title || "Untitled"}</h4>
            {plan.summary && <p className="text-xs text-stone-600">{plan.summary}</p>}
          </div>
        </div>
        <button onClick={() => onDelete(plan.id)} className="flex-shrink-0 text-stone-300 transition-colors hover:text-rose-400" aria-label="Delete idea"><Trash2 size={14} /></button>
      </div>

      {plan.activities?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {plan.activities.map((a, i) => (<li key={i} className="flex gap-1.5 text-xs text-stone-500"><span>✨</span><span>{a}</span></li>))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {plan.want && <span className="rounded-lg px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: ACCENTS.mint.soft, color: ACCENTS.mint.text }}>🎯 {plan.want}</span>}
        {plan.comment && <span className="rounded-lg px-2 py-1 text-[11px] text-stone-500" style={{ backgroundColor: accent.soft }}>💬 {plan.comment}</span>}
        {plan.sourceUrl && <a href={plan.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-400 hover:text-rose-400"><ExternalLink size={11} /> source</a>}
      </div>

      {/* comment thread */}
      <div className="mt-3 border-t border-stone-100 pt-2.5">
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-stone-400"><MessageCircle size={11} strokeWidth={2.8} /> Comments{comments.length > 0 ? ` (${comments.length})` : ""}</p>
        {comments.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {comments.map((c) => {
              const ca = c.who === "baby" ? ACCENTS.blush : ACCENTS.winter;
              return (
                <div key={c.id} className="flex items-start gap-1.5 text-xs">
                  <span className="mt-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold capitalize" style={{ backgroundColor: ca.soft, color: ca.text }}>{c.who}</span>
                  <span className="text-stone-600">{c.text}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-2 flex items-center gap-1.5">
          <button onClick={() => setWho((w) => (w === "me" ? "baby" : "me"))} className="rounded-md px-2 py-1.5 text-[10px] font-extrabold capitalize transition-colors" style={{ backgroundColor: (who === "baby" ? ACCENTS.blush : ACCENTS.winter).soft, color: (who === "baby" ? ACCENTS.blush : ACCENTS.winter).text }} title="Tap to switch who's commenting">{who}</button>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a comment…" className="flex-1 rounded-lg border-2 border-stone-200 px-2.5 py-1.5 text-xs outline-none focus:border-rose-200" />
          <button onClick={add} disabled={!text.trim()} className="rounded-lg p-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-40" style={{ backgroundColor: accent.hex, color: accent.text }} aria-label="Send comment"><Send size={13} strokeWidth={2.8} /></button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-passport Idea Board (lives inside the deep-dive drawer)
// ---------------------------------------------------------------------------
function IdeaBoard({ dest, plans, onAdd, onDelete, onAddComment }) {
  const accent = dest.accent;
  const [mode, setMode] = useState("link");
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [hasDraft, setHasDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const reset = () => { setDraft(EMPTY_DRAFT); setHasDraft(false); setUrl(""); setError(""); };

  const applyExtract = (data, extra = {}) => {
    setDraft((d) => ({
      ...d,
      title: data.title || d.title,
      summary: data.summary || d.summary,
      activities: Array.isArray(data.activities) ? data.activities : d.activities,
      location: data.location || d.location,
      ...extra,
    }));
    setHasDraft(true);
  };

  const callExtract = async (payload, onErrExtra = {}) => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server ${res.status}`);
      applyExtract(await res.json(), payload.url ? { sourceUrl: payload.url } : {});
    } catch (e) {
      setError(`Couldn't scrub with AI (${e.message}). You can still fill it in by hand below.`);
      setDraft((d) => ({ ...d, ...onErrExtra }));
      setHasDraft(true);
    } finally {
      setBusy(false);
    }
  };

  const readLink = () => { if (url.trim()) callExtract({ url: url.trim() }, { sourceUrl: url.trim() }); };

  const readScreenshot = async (file) => {
    if (!file) return;
    const dataUrl = await fileToBase64(file).catch(() => "");
    const base64 = dataUrl.split(",")[1];
    setDraft((d) => ({ ...d, thumb: dataUrl }));
    callExtract({ image: base64, mediaType: file.type || "image/png" }, { thumb: dataUrl });
  };

  const save = () => {
    if (!draft.title.trim() && !draft.summary.trim()) return;
    onAdd(dest.id, { ...draft, id: `plan_${Date.now()}`, createdAt: Date.now(), comments: [] });
    reset();
  };

  const TABS = [
    { id: "link", label: "Link", icon: Link2 },
    { id: "screenshot", label: "Screenshot", icon: ImageIcon },
    { id: "manual", label: "Write it", icon: PenLine },
  ];

  return (
    <div className="rounded-2xl bg-white p-4" style={{ border: `1.5px solid ${accent.border}` }}>
      <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ color: accent.text }}>
        <NotebookPen size={14} strokeWidth={2.8} /> Idea Board · {dest.name}
      </p>
      <p className="mt-1 text-xs text-stone-400">Paste a link or drop a screenshot — AI scrubs it into a clean plan pinned here.</p>

      {/* tabs */}
      <div className="mt-3 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = mode === t.id;
          return (
            <button key={t.id} onClick={() => { setMode(t.id); setError(""); }} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition-all hover:scale-[1.03] active:scale-95"
              style={{ backgroundColor: active ? accent.hex : "#fff", color: active ? accent.text : "#A8A29E", border: `1.5px solid ${active ? accent.border : "#E7E1D8"}` }}>
              <t.icon size={13} strokeWidth={2.8} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* inputs */}
      {mode === "link" && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && readLink()} placeholder="Paste a website, blog or social post link…" className="flex-1 rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-200" />
          <button onClick={readLink} disabled={busy || !url.trim()} className="flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-extrabold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" style={{ backgroundColor: accent.hex, color: accent.text, border: `1.5px solid ${accent.border}` }}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} strokeWidth={2.8} />}{busy ? "Scrubbing…" : "Read with AI"}
          </button>
        </div>
      )}
      {mode === "screenshot" && (
        <div className="mt-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => readScreenshot(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50/60 px-4 py-5 text-stone-400 transition-colors hover:border-rose-200 hover:text-rose-400 disabled:opacity-60">
            {busy ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} strokeWidth={2.2} />}
            <span className="text-sm font-bold">{busy ? "Scrubbing screenshot…" : "Upload a screenshot"}</span>
          </button>
        </div>
      )}
      {mode === "manual" && !hasDraft && (
        <button onClick={() => setHasDraft(true)} className="mt-3 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-extrabold text-stone-500 transition-all hover:scale-[1.02] active:scale-95" style={{ backgroundColor: ACCENTS.mint.soft, border: `1.5px solid ${ACCENTS.mint.border}` }}>
          <PenLine size={15} strokeWidth={2.8} /> Start a blank plan
        </button>
      )}

      {error && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-600">{error}</p>}

      {/* editable draft */}
      {hasDraft && (
        <div className="mt-4 space-y-3 rounded-xl border-2 border-stone-100 bg-stone-50/50 p-3">
          {draft.thumb && <img src={draft.thumb} alt="" className="max-h-36 w-auto rounded-lg border border-stone-200 object-contain" />}
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className="w-full rounded-lg border-2 border-stone-200 px-3 py-2 text-sm font-bold outline-none focus:border-rose-200" />
          <textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} rows={2} placeholder="What is this place / idea about?" className="w-full resize-y rounded-lg border-2 border-stone-200 px-3 py-2 text-sm outline-none focus:border-rose-200" />
          {draft.activities.length > 0 && (
            <ul className="space-y-1.5">
              {draft.activities.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span>✨</span>
                  <input value={a} onChange={(e) => { const n = [...draft.activities]; n[i] = e.target.value; setDraft({ ...draft, activities: n }); }} className="flex-1 rounded-md border border-stone-200 px-2 py-1 text-sm outline-none focus:border-rose-200" />
                  <button onClick={() => setDraft({ ...draft, activities: draft.activities.filter((_, j) => j !== i) })} className="text-stone-300 hover:text-rose-400"><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <textarea value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} rows={2} placeholder="💬 Your notes" className="w-full resize-y rounded-lg border-2 border-stone-200 px-3 py-2 text-sm outline-none focus:border-rose-200" />
            <textarea value={draft.want} onChange={(e) => setDraft({ ...draft, want: e.target.value })} rows={2} placeholder="🎯 What you want to do" className="w-full resize-y rounded-lg border-2 border-stone-200 px-3 py-2 text-sm outline-none focus:border-rose-200" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={reset} className="rounded-xl border-2 border-stone-200 px-3.5 py-1.5 text-sm font-extrabold text-stone-400 transition-colors hover:text-stone-600">Cancel</button>
            <button onClick={save} disabled={!draft.title.trim() && !draft.summary.trim()} className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-extrabold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50" style={{ backgroundColor: accent.hex, color: accent.text, border: `1.5px solid ${accent.border}` }}>
              <Plus size={15} strokeWidth={3} /> Save to {dest.name}
            </button>
          </div>
        </div>
      )}

      {/* saved ideas */}
      {plans.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {plans.map((p) => (
            <SavedIdea key={p.id} plan={p} accent={accent} onDelete={(planId) => onDelete(dest.id, planId)} onAddComment={(planId, comment) => onAddComment(dest.id, planId, comment)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passport card
// ---------------------------------------------------------------------------
function PassportCard({ dest, votes, onVote, isOpen, onToggle, plans, onAddPlan, onDeletePlan, onAddComment, overrides, onEditField }) {
  const accent = dest.accent;
  const budget = BUDGET_TONE[dest.flight.budget];
  const total = votes.max + votes.partner;
  const isTopPick = dest.recommendation.rank === 1;
  const planCount = plans.length;
  const t = (key, fallback) => (overrides && overrides[key] != null ? overrides[key] : fallback);
  const E = (key, fallback, opts = {}) => <EditText value={t(key, fallback)} onSave={(v) => onEditField(key, v)} {...opts} />;

  return (
    <div className="overflow-hidden rounded-3xl bg-white/90 shadow-sm backdrop-blur transition-all" style={{ border: `1.5px solid ${isOpen ? accent.border : "#EBE5DB"}` }}>
      {/* Compact header — tap to expand (text is click-to-edit) */}
      <div onClick={() => onToggle(dest.id)} className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 transition-colors hover:bg-stone-50/50">
        <span className="text-2xl leading-none">{dest.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {E("name", dest.name, { className: "text-lg font-extrabold text-stone-800" })}
            {isTopPick && <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-600"><Crown size={9} strokeWidth={3} fill="#FCD34D" />Top</span>}
            {planCount > 0 && <span className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold" style={{ backgroundColor: accent.soft, color: accent.text }}><NotebookPen size={9} strokeWidth={3} />{planCount}</span>}
          </div>
          <p className="mt-0.5 text-xs text-stone-400"><span className="font-bold" style={{ color: accent.text }}>{t("flightPrice", dest.flight.price)}</span> · {t("weatherRange", dest.weather.range)} · sunset {t("sunset", dest.sunset)}</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl px-2.5 py-1.5" style={{ backgroundColor: accent.soft }}>
          <Heart size={15} strokeWidth={2.5} style={{ color: accent.text, fill: total > 0 ? accent.hex : "transparent" }} />
          <span className="text-sm font-extrabold tabular-nums" style={{ color: accent.text }}>{total}</span>
        </div>
        <ChevronDown size={18} strokeWidth={2.8} className="text-stone-300 transition-transform duration-300" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
      </div>

      {/* Expandable detail */}
      <div className="grid transition-all duration-500 ease-out" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="space-y-4 px-5 pb-6" style={{ borderTop: `1.5px dashed ${accent.border}` }}>
            <div className="pt-4">
              <p className="text-sm italic text-stone-500">{E("tagline", dest.tagline, { multiline: true, className: "italic" })}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-stone-400"><MapPin size={11} strokeWidth={2.6} />{E("region", dest.region, { className: "text-xs" })}</p>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-stone-400">Who wants it?</p>
              <div className="grid grid-cols-2 gap-2">
                {["max", "partner"].map((who) => (
                  <button key={who} onClick={(e) => { e.stopPropagation(); onVote(dest.id, who); }} className="flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 transition-all hover:scale-[1.02] active:scale-95" style={{ backgroundColor: "#fff", border: `1.5px solid ${accent.border}` }}>
                    <span className="text-xs font-extrabold text-stone-500">{WHO_LABEL[who]}</span>
                    <Heart size={15} strokeWidth={2.6} style={{ color: accent.text, fill: votes[who] > 0 ? accent.hex : "transparent" }} className={votes[who] > 0 ? "animate-pop" : ""} key={votes[who]} />
                    <span className="text-sm font-extrabold tabular-nums" style={{ color: accent.text }}>{votes[who]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-2xl p-4" style={{ backgroundColor: accent.soft + "80" }}>
              <StatRow icon={dest.weather.snowIcon ? CloudSnow : Thermometer} label="Weather" value={E("weatherRange", dest.weather.range, { className: "text-sm font-semibold text-stone-700" })} accent={accent} />
              <StatRow icon={Sunset} label="Sunset" value={E("sunset", dest.sunset, { className: "text-sm font-semibold text-stone-700" })} accent={accent} />
              <StatRow icon={Plane} label="Flight" value={E("flightPrice", dest.flight.price, { className: "text-sm font-semibold text-stone-700" })} accent={accent} />
              <StatRow icon={Wallet} label="Stay / night" value={E("stayPrice", dest.basecamp.price, { className: "text-sm font-semibold text-stone-700" })} accent={accent} />
            </div>
            <p className="text-xs text-stone-400">{budget.emoji} {budget.label} · {E("carrier", dest.flight.carrier, { className: "text-xs" })} · {E("weatherLabel", dest.weather.label, { className: "text-xs" })}, {E("weatherSnow", dest.weather.snow, { multiline: true, className: "text-xs" })}</p>

            <LiveWeather coords={dest.coords} accent={accent} />
            <div className="rounded-2xl p-4" style={{ backgroundColor: accent.soft, border: `1.5px solid ${accent.border}` }}>
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ color: accent.text }}><Train size={14} strokeWidth={2.8} /> Basecamp</p>
              <p className="mt-1 text-sm font-bold text-stone-700">{E("bcStation", dest.basecamp.station, { className: "text-sm font-bold text-stone-700" })}</p>
              <p className="text-xs text-stone-500">{E("bcLogic", dest.basecamp.logic, { multiline: true, className: "text-xs text-stone-500" })}</p>
              <p className="mt-1 text-xs italic text-stone-500">{E("bcVibe", dest.basecamp.vibe, { multiline: true, className: "text-xs italic text-stone-500" })}</p>
            </div>
            <IdeaBoard dest={dest} plans={plans} onAdd={onAddPlan} onDelete={onDeletePlan} onAddComment={onAddComment} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main hub
// ---------------------------------------------------------------------------
const emptyVotes = () => DESTINATIONS.reduce((acc, d) => ({ ...acc, [d.id]: { max: 0, partner: 0 } }), {});
const emptyPlans = () => DESTINATIONS.reduce((acc, d) => ({ ...acc, [d.id]: [] }), {});
const mergeVotes = (raw) => { const base = emptyVotes(); if (raw) for (const id of Object.keys(base)) if (raw[id]) base[id] = { max: raw[id].max || 0, partner: raw[id].partner || 0 }; return base; };
const mergePlans = (raw) => { const base = emptyPlans(); if (raw) for (const id of Object.keys(base)) if (Array.isArray(raw[id])) base[id] = raw[id]; return base; };
const WHO_LABEL = { max: "Me", partner: "Baby" };

const COPY_KEY = "maxbaby.copy.v1";
const DEFAULT_COPY = {
  subtitle: "Our cozy year-end trip planner",
  recommendation:
    "Seoul is the best all-rounder — biting cold with possible flurries, on-budget on full-service Korean Air, and the latest usable daylight (5:15 PM). If budget can stretch and falling snow is the whole point, Sapporo is the more unforgettable snow-globe trip.",
};

// Inline editable text. Edits save for everyone (shared copy).
function Editable({ value, onSave, className = "", rows = 4, center = true }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);

  if (editing) {
    return (
      <div className={center ? "mx-auto max-w-2xl" : ""}>
        <textarea autoFocus value={v} onChange={(e) => setV(e.target.value)} rows={rows} className="w-full resize-y rounded-2xl border-2 border-rose-200 bg-white px-3 py-2 text-sm text-stone-600 outline-none" />
        <div className={`mt-2 flex gap-2 ${center ? "justify-center" : ""}`}>
          <button onClick={() => { onSave(v.trim() || value); setEditing(false); }} className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-extrabold text-rose-500 transition hover:bg-rose-200"><Check size={13} strokeWidth={3} /> Save for both</button>
          <button onClick={() => { setV(value); setEditing(false); }} className="rounded-full px-3 py-1.5 text-xs font-extrabold text-stone-400 transition hover:text-stone-600">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <span className="group relative inline">
      <span className={className}>{value}</span>
      <button onClick={() => setEditing(true)} title="Edit — saved for both of you" className="ml-1.5 inline-flex translate-y-[1px] align-middle text-stone-300 opacity-60 transition-opacity hover:text-rose-400 sm:opacity-0 sm:group-hover:opacity-100"><PenLine size={13} /></button>
    </span>
  );
}

// Click-to-edit inline text. Click the text → type → Enter/blur saves (for both).
function EditText({ value, onSave, className = "", multiline = false, placeholder = "text" }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);

  const commit = () => { setEditing(false); const nv = (v ?? "").trim(); if (nv && nv !== value) onSave(nv); };
  const stop = (e) => e.stopPropagation();

  if (editing) {
    const common = { autoFocus: true, value: v, onClick: stop, onChange: (e) => setV(e.target.value), onBlur: commit };
    return multiline ? (
      <textarea {...common} rows={2} className={`w-full resize-y rounded-lg border border-rose-200 bg-white px-2 py-1 outline-none ${className}`} />
    ) : (
      <input {...common} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setV(value); setEditing(false); } }} className={`rounded-lg border border-rose-200 bg-white px-2 py-0.5 outline-none ${className}`} />
    );
  }
  return (
    <span onClick={(e) => { stop(e); setEditing(true); }} className={`cursor-text rounded px-0.5 transition-colors hover:bg-rose-50 ${className}`} title="Click to edit — saved for both">
      {value || <span className="italic text-stone-300">{placeholder}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Photos & Memes wall (shared, realtime via Supabase Storage)
// ---------------------------------------------------------------------------
function MemeWall() {
  const [items, setItems] = useState([]);
  const [who, setWho] = useState("me");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const refresh = useCallback(async () => { setItems(await loadGallery()); }, []);
  useEffect(() => { refresh(); const unsub = subscribeGallery(refresh); return () => unsub(); }, [refresh]);

  const onFile = async (file) => {
    if (!file) return;
    setBusy(true); setErr("");
    try { await postImage(file, who, caption.trim()); setCaption(""); await refresh(); }
    catch (e) { setErr(e?.message || "Upload failed"); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  if (!hasSupabase) return null;

  return (
    <section className="mt-12">
      <h2 className="flex items-center justify-center gap-2 text-center text-xl font-black text-stone-700">
        <ImageIcon size={18} strokeWidth={2.8} className="text-rose-300" /> Photos &amp; Memes
      </h2>
      <p className="mt-1 text-center text-sm text-stone-400">Post pics &amp; silly memes — they pop up on both our screens in real time 💕</p>

      <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-2 rounded-3xl border-2 border-rose-100 bg-white/85 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center">
        <button onClick={() => setWho((w) => (w === "me" ? "baby" : "me"))} className="rounded-xl px-3 py-2.5 text-sm font-extrabold capitalize transition-colors" style={{ backgroundColor: (who === "baby" ? ACCENTS.blush : ACCENTS.winter).soft, color: (who === "baby" ? ACCENTS.blush : ACCENTS.winter).text }} title="Tap to switch who's posting">{who}</button>
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption (optional)…" className="flex-1 rounded-xl border-2 border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-rose-200" />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-extrabold text-rose-500 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" style={{ backgroundColor: ACCENTS.blush.hex, border: `1.5px solid ${ACCENTS.blush.border}` }}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} strokeWidth={2.8} />}{busy ? "Posting…" : "Post a photo / meme"}
        </button>
      </div>
      {err && <p className="mx-auto mt-2 max-w-2xl rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-600">{err}</p>}

      {items.length > 0 && (
        <div className="mt-6 columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
          {items.map((it) => {
            const wa = it.who === "baby" ? ACCENTS.blush : ACCENTS.winter;
            return (
              <div key={it.id} className="group relative break-inside-avoid overflow-hidden rounded-2xl border-2 border-white bg-white shadow-sm">
                <img src={it.url} alt={it.caption || "meme"} className="w-full object-cover" loading="lazy" />
                <button onClick={() => deleteImage(it).then(refresh)} className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-stone-400 opacity-0 shadow transition-opacity hover:text-rose-500 group-hover:opacity-100" aria-label="Delete"><Trash2 size={14} /></button>
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-extrabold capitalize" style={{ backgroundColor: wa.soft, color: wa.text }}>{it.who || "?"}</span>
                  {it.caption && <span className="truncate text-xs text-stone-500">{it.caption}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [votes, setVotes] = useState(() => {
    try {
      const saved = localStorage.getItem(VOTES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const base = emptyVotes();
        for (const id of Object.keys(base)) if (parsed[id]) base[id] = { max: parsed[id].max || 0, partner: parsed[id].partner || 0 };
        return base;
      }
    } catch (e) {}
    return emptyVotes();
  });

  const [plans, setPlans] = useState(() => {
    try {
      const saved = localStorage.getItem(PLANS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const base = emptyPlans();
        for (const id of Object.keys(base)) if (Array.isArray(parsed[id])) base[id] = parsed[id];
        return base;
      }
    } catch (e) {}
    return emptyPlans();
  });

  const [openId, setOpenId] = useState(null);
  const [view, setView] = useState("plan"); // plan | photos | compare
  const [synced, setSynced] = useState(false);
  const hydrated = useRef(false);
  const lastSynced = useRef(null);

  const [copy, setCopy] = useState(() => {
    try { const s = localStorage.getItem(COPY_KEY); if (s) return { ...DEFAULT_COPY, ...JSON.parse(s) }; } catch (e) {}
    return DEFAULT_COPY;
  });
  const copyHydrated = useRef(false);
  const lastCopy = useRef(null);
  const updateCopy = (key, val) => setCopy((c) => ({ ...c, [key]: val }));
  const updateDestField = (destId, key, val) => setCopy((c) => ({ ...c, dest: { ...(c.dest || {}), [destId]: { ...((c.dest || {})[destId] || {}), [key]: val } } }));

  // Shared editable copy: load + subscribe + debounced save
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const remote = await loadCopy();
      if (remote) { const m = { ...DEFAULT_COPY, ...remote }; lastCopy.current = JSON.stringify(m); setCopy(m); }
      copyHydrated.current = true;
      unsub = subscribeCopy((r) => { const m = { ...DEFAULT_COPY, ...r }; lastCopy.current = JSON.stringify(m); setCopy(m); });
    })();
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { localStorage.setItem(COPY_KEY, JSON.stringify(copy)); } catch (e) {}
    if (!hasSupabase || !copyHydrated.current) return;
    const cur = JSON.stringify(copy);
    if (cur === lastCopy.current) return;
    const t = setTimeout(() => { lastCopy.current = cur; saveCopy(copy); }, 500);
    return () => clearTimeout(t);
  }, [copy]);

  // Load the shared board, push local seed if empty, and subscribe to partner's live changes.
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const remote = await loadState();
      if (remote && (remote.votes || remote.plans)) {
        const v = mergeVotes(remote.votes); const p = mergePlans(remote.plans);
        lastSynced.current = JSON.stringify({ v, p });
        setVotes(v); setPlans(p);
      } else if (hasSupabase) {
        lastSynced.current = JSON.stringify({ v: votes, p: plans });
        saveState(votes, plans);
      }
      hydrated.current = true;
      setSynced(hasSupabase);
      unsub = subscribe((r) => {
        const v = mergeVotes(r.votes); const p = mergePlans(r.plans);
        lastSynced.current = JSON.stringify({ v, p });
        setVotes(v); setPlans(p);
      });
    })();
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage always; push to Supabase (debounced) when it's a local change.
  useEffect(() => {
    try { localStorage.setItem(VOTES_KEY, JSON.stringify(votes)); localStorage.setItem(PLANS_KEY, JSON.stringify(plans)); } catch (e) {}
    if (!hasSupabase || !hydrated.current) return;
    const cur = JSON.stringify({ v: votes, p: plans });
    if (cur === lastSynced.current) return;
    const t = setTimeout(() => { lastSynced.current = cur; saveState(votes, plans); }, 400);
    return () => clearTimeout(t);
  }, [votes, plans]);

  const handleVote = (id, who) => setVotes((v) => ({ ...v, [id]: { ...v[id], [who]: v[id][who] + 1 } }));
  const handleToggle = (id) => setOpenId((cur) => (cur === id ? null : id));
  const resetVotes = () => setVotes(emptyVotes());
  const addPlan = (destId, plan) => setPlans((p) => ({ ...p, [destId]: [plan, ...p[destId]] }));
  const deletePlan = (destId, planId) => setPlans((p) => ({ ...p, [destId]: p[destId].filter((x) => x.id !== planId) }));
  const addComment = (destId, planId, comment) => setPlans((p) => ({
    ...p,
    [destId]: p[destId].map((x) => (x.id === planId ? { ...x, comments: [...(x.comments || []), comment] } : x)),
  }));

  const totals = useMemo(() => {
    const out = {}; let sum = 0;
    for (const d of DESTINATIONS) { const t = votes[d.id].max + votes[d.id].partner; out[d.id] = t; sum += t; }
    return { out, sum };
  }, [votes]);

  const leader = useMemo(() => {
    if (totals.sum === 0) return null;
    const topId = Object.entries(totals.out).sort((a, b) => b[1] - a[1])[0][0];
    return DESTINATIONS.find((d) => d.id === topId);
  }, [totals]);

  const totalIdeas = useMemo(() => Object.values(plans).reduce((n, arr) => n + arr.length, 0), [plans]);

  return (
    <div className="min-h-screen w-full font-sans text-stone-800" style={{ backgroundColor: "#FFFDF9", backgroundImage: "radial-gradient(circle at 15% 10%, #FFF5F0 0, transparent 45%), radial-gradient(circle at 85% 90%, #EEF6F1 0, transparent 48%)" }}>
      <div className="pointer-events-none fixed inset-0 opacity-[0.18]" style={{ backgroundImage: "radial-gradient(#EEE8DE 1px, transparent 1px)", backgroundSize: "26px 26px" }} />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="animate-float-in text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border-2 border-rose-100 bg-white/80 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-rose-400 shadow-sm backdrop-blur">
            <Calendar size={13} strokeWidth={3} /> Nov 27 – Dec 4
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-stone-800 sm:text-5xl">Me &amp; Baby <span className="text-rose-300">♥</span> Travel Plans</h1>
          <p className="mt-3 text-base font-semibold text-stone-500 sm:text-lg">
            <Editable value={copy.subtitle} onSave={(v) => updateCopy("subtitle", v)} rows={2} />
          </p>
        </header>

        {/* Tabs — show one section at a time */}
        <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white/70 p-1.5 backdrop-blur">
          {[
            { id: "plan", label: "Destinations", icon: MapPin },
            { id: "photos", label: "Photos", icon: ImageIcon },
            { id: "compare", label: "Compare", icon: Star },
          ].map((t) => {
            const active = view === t.id;
            return (
              <button key={t.id} onClick={() => setView(t.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold transition-all" style={{ backgroundColor: active ? ACCENTS.blush.hex : "transparent", color: active ? ACCENTS.blush.text : "#A8A29E" }}>
                <t.icon size={15} strokeWidth={2.8} /> {t.label}
              </button>
            );
          })}
        </div>

        {view === "plan" && (<>
        {/* Recommendation banner */}
        <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-amber-100 bg-white/80 p-5 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-500"><Trophy size={20} strokeWidth={2.6} /></div>
            <div>
              <p className="text-sm font-black text-stone-700">Top recommendation</p>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">
                <Editable value={copy.recommendation} onSave={(v) => updateCopy("recommendation", v)} rows={5} center={false} />
              </p>
            </div>
          </div>
        </div>

        {/* Live tally bar */}
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-4 py-2.5 backdrop-blur">
            <Heart size={16} strokeWidth={2.6} className="text-rose-300" fill="#FFDFD3" /><span className="text-sm font-bold text-stone-500">{totals.sum} hearts</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-4 py-2.5 backdrop-blur" title={synced ? "Both phones sync live" : "Saving on this device only"}>
            {synced ? <Cloud size={16} strokeWidth={2.6} style={{ color: ACCENTS.mint.text }} /> : <CloudOff size={16} strokeWidth={2.6} className="text-stone-400" />}
            <span className="text-sm font-bold text-stone-500">{synced ? "Synced live" : "Local only"}</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-4 py-2.5 backdrop-blur">
            <Trophy size={16} strokeWidth={2.6} style={{ color: leader ? leader.accent.text : "#B8AE9E" }} /><span className="text-sm font-bold text-stone-500">{leader ? <>Leader {leader.name}</> : "Tap a heart to vote"}</span>
          </div>
          {totals.sum > 0 && (
            <button onClick={resetVotes} className="flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white/70 px-4 py-2.5 text-sm font-bold text-stone-400 backdrop-blur transition-colors hover:text-stone-600"><RotateCcw size={14} strokeWidth={2.6} /> Reset</button>
          )}
        </div>

        <main className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {DESTINATIONS.map((dest) => (
            <div key={dest.id} className={openId === dest.id ? "lg:col-span-2" : ""}>
              <PassportCard dest={dest} votes={votes[dest.id]} onVote={handleVote} isOpen={openId === dest.id} onToggle={handleToggle} plans={plans[dest.id]} onAddPlan={addPlan} onDeletePlan={deletePlan} onAddComment={addComment} overrides={copy.dest?.[dest.id]} onEditField={(key, val) => updateDestField(dest.id, key, val)} />
            </div>
          ))}
        </main>
        </>)}

        {view === "photos" && <MemeWall />}

        {view === "compare" && (
        <section className="mt-8">
          <h2 className="flex items-center justify-center gap-2 text-center text-xl font-black text-stone-700"><Star size={18} strokeWidth={2.8} className="text-amber-300" fill="#FFE9B0" /> Quick Comparison Snapshot</h2>
          <div className="mt-5 overflow-x-auto rounded-3xl border-2 border-stone-100 bg-white/85 shadow-sm backdrop-blur">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-stone-400">
                  <th className="px-5 py-4 font-extrabold">Destination</th><th className="px-4 py-4 font-extrabold">Flight</th><th className="px-4 py-4 font-extrabold">Weather</th><th className="px-4 py-4 font-extrabold">Sunset</th><th className="px-4 py-4 font-extrabold">Ideas</th><th className="px-4 py-4 font-extrabold">Me</th><th className="px-4 py-4 font-extrabold">Baby</th>
                </tr>
              </thead>
              <tbody>
                {DESTINATIONS.map((d) => (
                  <tr key={d.id} className="border-t border-stone-100 transition-colors hover:bg-stone-50/60">
                    <td className="px-5 py-4"><span className="flex items-center gap-2 font-extrabold text-stone-700"><span className="text-lg">{d.emoji}</span> {d.name}</span><span className="text-xs text-stone-400">{d.region}</span></td>
                    <td className="px-4 py-4"><Pill accent={BUDGET_TONE[d.flight.budget].chip} soft={false}>{d.flight.price}</Pill></td>
                    <td className="px-4 py-4 font-semibold text-stone-600">{d.weather.range}</td>
                    <td className="px-4 py-4 font-semibold text-stone-600">{d.sunset}</td>
                    <td className="px-4 py-4 font-semibold text-stone-600">{plans[d.id].length}</td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ backgroundColor: d.accent.soft, color: d.accent.text }}><Heart size={11} strokeWidth={3} fill={d.accent.hex} /> {votes[d.id].max}</span></td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ backgroundColor: d.accent.soft, color: d.accent.text }}><Heart size={11} strokeWidth={3} fill={d.accent.hex} /> {votes[d.id].partner}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        )}

        <footer className="mt-12 text-center text-xs text-stone-400">
          <p className="font-semibold">Made with ❄️ 🍱 🦦 🧸 ✨ for a very specific kind of cozy winter trip.</p>
          <p className="mt-1">Prices in SGD per pax · planning weather &amp; sunset for late Nov / early Dec · live temps via Open-Meteo · plan scrubbing via Claude.</p>
        </footer>
      </div>
    </div>
  );
}
