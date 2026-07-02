import React, { useState, useMemo, useEffect, useCallback, useRef, useContext } from "react";
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
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Bed,
  Utensils,
} from "lucide-react";
import { hasSupabase, loadState, saveState, subscribe, loadGallery, postImage, deleteImage, subscribeGallery, loadCopy, saveCopy, subscribeCopy, loadMessages, postMessage, subscribeMessages, loadMessageCounts, subscribeAllMessages, uploadImage, loadItinerary, addItineraryItem, updateItineraryItem, deleteItineraryItem, subscribeItinerary } from "./lib/supabase";

// Which person is on THIS device ("me" | "baby"). Set once, stored locally.
const IDENTITY_KEY = "maxbaby.identity.v1";
const SEEN_KEY = "maxbaby.seen.v1";
const IdentityContext = React.createContext("me");
const LightboxContext = React.createContext(() => {}); // openLightbox(images, index)
const WHO_NAME = { me: "Me", baby: "Ants" };

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

const DEST_BY_ID = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d]));

// Trip runs Nov 27 – Dec 4, 2026 (8 days)
const TRIP_START = new Date(2026, 10, 27);
const TRIP_DAYS = 8;
const dayDate = (d) => { const dt = new Date(TRIP_START); dt.setDate(dt.getDate() + d); return dt; };
const dayLabel = (d) => dayDate(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const KIND_META = {
  stay: { label: "Stay", emoji: "🏨" },
  activity: { label: "Activity", emoji: "✨" },
  food: { label: "Food", emoji: "🍽️" },
  note: { label: "Note", emoji: "📝" },
};

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

const EMPTY_DRAFT = { title: "", summary: "", activities: [], location: "", comment: "", want: "", sourceUrl: "", thumb: "", photos: [] };

// ---------------------------------------------------------------------------
// A single saved idea, with its own comment thread
// ---------------------------------------------------------------------------
function SavedIdea({ plan, accent, onDelete, onAddComment, onEdit, onAddToItinerary }) {
  const me = useContext(IdentityContext);
  const openLightbox = useContext(LightboxContext);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showDays, setShowDays] = useState(false);
  const [addedDay, setAddedDay] = useState(null);
  const photoRef = useRef(null);

  // septic-fuck rating (1–5), stored per person and synced with the plan
  const partnerKey = me === "me" ? "baby" : "me";
  const myRating = plan.ratings?.[me] || 0;
  const partnerRating = plan.ratings?.[partnerKey] || 0;
  const [drag, setDrag] = useState(null); // live value while sliding
  const [floater, setFloater] = useState(null); // { v, key } — float-up feedback
  const commitRating = (v) => {
    onEdit(plan.id, { ratings: { ...(plan.ratings || {}), [me]: v } });
    setFloater({ v, key: Date.now() });
    setTimeout(() => setFloater(null), 1400);
  };
  const endSlide = () => { if (drag != null) { commitRating(drag); setDrag(null); } };

  const pickDay = (dd) => {
    onAddToItinerary(dd);
    setShowDays(false);
    setAddedDay(dd);
    setTimeout(() => setAddedDay(null), 2500);
  };
  const comments = plan.comments || [];
  const acts = plan.activities || [];
  const photos = plan.photos || [];
  const allPhotos = [plan.thumb, ...photos].filter(Boolean);
  const lbBase = plan.thumb ? 1 : 0;

  const addPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const src = hasSupabase ? await uploadImage(file) : await fileToBase64(file);
      if (src) onEdit(plan.id, { photos: [...photos, src] });
    } catch (e) {
      console.warn("add photo failed:", e?.message || e);
    } finally {
      setUploading(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  };

  const add = () => {
    if (!text.trim()) return;
    onAddComment(plan.id, { id: `c_${Date.now()}`, who: me, text: text.trim(), at: Date.now() });
    setText("");
  };

  return (
    <div className="rounded-xl bg-white p-3" style={{ border: `1.5px solid ${accent.border}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <EditText value={plan.title || ""} onSave={(v) => onEdit(plan.id, { title: v })} placeholder="Untitled" className="text-sm font-extrabold text-stone-800" />
          <div className="text-xs text-stone-600"><EditText value={plan.summary || ""} onSave={(v) => onEdit(plan.id, { summary: v })} multiline placeholder="add a summary…" className="text-xs" /></div>
        </div>
        <button onClick={() => onDelete(plan.id)} className="flex-shrink-0 text-stone-300 transition-colors hover:text-rose-400" aria-label="Delete idea"><Trash2 size={14} /></button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {plan.thumb && (
          <button onClick={() => openLightbox(allPhotos, 0)} className="overflow-hidden rounded-xl border border-stone-200" aria-label="View photo">
            <img src={plan.thumb} alt="" className="h-28 w-28 object-cover transition-transform hover:scale-105 sm:h-32 sm:w-32" />
          </button>
        )}
        {photos.map((src, i) => (
          <div key={i} className="relative">
            <button onClick={() => openLightbox(allPhotos, lbBase + i)} className="block overflow-hidden rounded-xl border border-stone-200" aria-label="View photo">
              <img src={src} alt="" className="h-28 w-28 object-cover transition-transform hover:scale-105 sm:h-32 sm:w-32" />
            </button>
            <button onClick={() => onEdit(plan.id, { photos: photos.filter((_, j) => j !== i) })} className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-stone-400 shadow hover:text-rose-500" aria-label="Remove photo"><X size={12} /></button>
          </div>
        ))}
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => addPhoto(e.target.files?.[0])} />
        <button onClick={() => photoRef.current?.click()} disabled={uploading} className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-stone-400 transition-colors hover:border-rose-200 hover:text-rose-400 disabled:opacity-50 sm:h-32 sm:w-32">
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} strokeWidth={2.2} />}
          <span className="text-[11px] font-bold">Add photo</span>
        </button>
      </div>

      <ul className="mt-2 space-y-1">
        {acts.map((a, i) => (
          <li key={i} className="flex items-center gap-1.5 text-xs text-stone-500">
            <span>✨</span>
            <EditText value={a} onSave={(v) => onEdit(plan.id, { activities: acts.map((x, j) => (j === i ? v : x)) })} className="text-xs" />
            <button onClick={() => onEdit(plan.id, { activities: acts.filter((_, j) => j !== i) })} className="text-stone-300 hover:text-rose-400" aria-label="Remove"><X size={11} /></button>
          </li>
        ))}
        <li>
          <button onClick={() => onEdit(plan.id, { activities: [...acts, "New idea"] })} className="flex items-center gap-1 text-[11px] font-bold text-stone-400 transition-colors hover:text-rose-400"><Plus size={11} strokeWidth={3} /> add activity</button>
        </li>
      </ul>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-lg px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: ACCENTS.mint.soft, color: ACCENTS.mint.text }}>🎯 <EditText value={plan.want || ""} onSave={(v) => onEdit(plan.id, { want: v })} placeholder="what to do…" className="text-[11px]" /></span>
        <span className="rounded-lg px-2 py-1 text-[11px] text-stone-500" style={{ backgroundColor: accent.soft }}>💬 <EditText value={plan.comment || ""} onSave={(v) => onEdit(plan.id, { comment: v })} placeholder="note…" className="text-[11px]" /></span>
        {plan.sourceUrl && <a href={plan.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-400 hover:text-rose-400"><ExternalLink size={11} /> source</a>}
      </div>

      {/* septic-fuck rating slider */}
      <div className="relative mt-2.5 rounded-xl border border-stone-100 bg-stone-50/70 px-3 py-2">
        {floater && (
          <img key={floater.key} src="/septic-fuck.png" alt="" className="septic-float pointer-events-none absolute bottom-2 left-1/2 z-10 object-contain" style={{ width: 22 + floater.v * 22 }} />
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Septic rating</span>
          <div className="flex items-end gap-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (drag ?? myRating) >= n;
              return (
                <img key={n} src="/septic-fuck.png" alt="" className="object-contain transition-all duration-150" style={{ width: 14 + n * 5, opacity: active ? 1 : 0.25, filter: active ? "none" : "grayscale(1)" }} />
              );
            })}
          </div>
          <input
            type="range" min="1" max="5" step="1"
            value={drag ?? (myRating || 3)}
            onChange={(e) => setDrag(Number(e.target.value))}
            onPointerUp={endSlide}
            onTouchEnd={endSlide}
            onKeyUp={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") endSlide(); }}
            className="h-1.5 min-w-[110px] flex-1 cursor-pointer accent-emerald-400"
            aria-label="Rate 1 to 5 septic fucks"
          />
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-stone-400">
            {myRating > 0 && <>{WHO_NAME[me]}: {drag ?? myRating}</>}
            {partnerRating > 0 && <span className="flex items-center gap-0.5">{WHO_NAME[partnerKey]}: {partnerRating}<img src="/septic-fuck.png" alt="" className="w-4 object-contain" /></span>}
          </span>
        </div>
      </div>

      {hasSupabase && (
        <div className="mt-2">
          {addedDay != null ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-extrabold text-emerald-600"><Check size={12} strokeWidth={3} /> Added to Day {addedDay + 1} · {dayLabel(addedDay)}</span>
          ) : !showDays ? (
            <button onClick={() => setShowDays(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition-colors" style={{ backgroundColor: accent.soft, color: accent.text }}>
              <CalendarDays size={12} strokeWidth={2.8} /> Add to itinerary
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] font-bold uppercase text-stone-400">Which day?</span>
              {Array.from({ length: TRIP_DAYS }).map((_, dd) => (
                <button key={dd} onClick={() => pickDay(dd)} title={dayLabel(dd)} className="rounded-md px-2 py-1 text-[11px] font-extrabold transition-transform hover:scale-110" style={{ backgroundColor: accent.soft, color: accent.text }}>{dd + 1}</button>
              ))}
              <button onClick={() => setShowDays(false)} className="ml-1 text-stone-300 hover:text-rose-400" aria-label="Cancel"><X size={12} /></button>
            </div>
          )}
        </div>
      )}

      {/* comment thread */}
      <div className="mt-3 border-t border-stone-100 pt-2.5">
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-stone-400"><MessageCircle size={11} strokeWidth={2.8} /> Comments{comments.length > 0 ? ` (${comments.length})` : ""}</p>
        {comments.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {comments.map((c) => {
              const ca = c.who === "baby" ? ACCENTS.blush : ACCENTS.winter;
              return (
                <div key={c.id} className="flex items-start gap-1.5 text-xs">
                  <span className="mt-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold" style={{ backgroundColor: ca.soft, color: ca.text }}>{WHO_NAME[c.who] || "?"}</span>
                  <span className="text-stone-600">{c.text}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-2 flex items-center gap-1.5">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={`Comment as ${WHO_NAME[me]}…`} className="flex-1 rounded-lg border-2 border-stone-200 px-2.5 py-1.5 text-xs outline-none focus:border-rose-200" />
          <button onClick={add} disabled={!text.trim()} className="rounded-lg p-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-40" style={{ backgroundColor: accent.hex, color: accent.text }} aria-label="Send comment"><Send size={13} strokeWidth={2.8} /></button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-passport Idea Board (lives inside the deep-dive drawer)
// ---------------------------------------------------------------------------
function IdeaBoard({ dest, plans, onAdd, onDelete, onAddComment, onEdit, onAddToItinerary }) {
  const accent = dest.accent;
  const [mode, setMode] = useState("link");
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [hasDraft, setHasDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const photoRef = useRef(null);

  const reset = () => { setDraft(EMPTY_DRAFT); setHasDraft(false); setUrl(""); setError(""); };

  const addPhoto = async (file) => {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const src = hasSupabase ? await uploadImage(file) : await fileToBase64(file);
      if (src) setDraft((d) => ({ ...d, photos: [...(d.photos || []), src] }));
      setHasDraft(true);
    } catch (e) {
      setError(`Couldn't add photo (${e?.message || e}).`);
    } finally {
      setBusy(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  };

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
    // Keep the screenshot as a photo on the idea: upload to storage when synced,
    // otherwise fall back to the inline data URL.
    if (hasSupabase) {
      uploadImage(file).then((src) => { if (src) setDraft((d) => ({ ...d, photos: [...(d.photos || []), src] })); }).catch(() => {});
    } else {
      setDraft((d) => ({ ...d, photos: [...(d.photos || []), dataUrl] }));
    }
    callExtract({ image: base64, mediaType: file.type || "image/png" });
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
          {/* photos */}
          <div className="flex flex-wrap gap-2">
            {draft.thumb && <img src={draft.thumb} alt="" className="h-20 w-20 rounded-lg border border-stone-200 object-cover" />}
            {(draft.photos || []).map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="h-20 w-20 rounded-lg border border-stone-200 object-cover" />
                <button onClick={() => setDraft({ ...draft, photos: draft.photos.filter((_, j) => j !== i) })} className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-stone-400 shadow hover:text-rose-500"><X size={12} /></button>
              </div>
            ))}
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => addPhoto(e.target.files?.[0])} />
            <button onClick={() => photoRef.current?.click()} disabled={busy} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 text-stone-400 transition-colors hover:border-rose-200 hover:text-rose-400 disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} strokeWidth={2.2} />}
              <span className="text-[10px] font-bold">Add photo</span>
            </button>
          </div>
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
            <SavedIdea key={p.id} plan={p} accent={accent} onDelete={(planId) => onDelete(dest.id, planId)} onAddComment={(planId, comment) => onAddComment(dest.id, planId, comment)} onEdit={onEdit} onAddToItinerary={(day) => onAddToItinerary(day, p)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-destination live chat (instant, realtime — like IG/YouTube comments)
// ---------------------------------------------------------------------------
function DestChat({ dest, isOpen }) {
  const accent = dest.accent;
  const me = useContext(IdentityContext);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const refresh = useCallback(async () => { setMsgs(await loadMessages(dest.id)); }, [dest.id]);

  useEffect(() => {
    if (!isOpen) return;
    refresh();
    const unsub = subscribeMessages(dest.id, refresh);
    return () => unsub();
  }, [isOpen, dest.id, refresh]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setText(""); setSending(true);
    // optimistic — show instantly for the sender
    const optimistic = { id: `tmp_${Date.now()}`, dest: dest.id, who: me, body, created_at: new Date().toISOString(), _optimistic: true };
    setMsgs((m) => [...m, optimistic]);
    await postMessage({ dest: dest.id, who: me, body });
    setSending(false);
    refresh(); // reconcile with server truth (realtime also refreshes both sides)
  };

  if (!hasSupabase) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 p-4 text-center text-xs text-stone-400">
        💬 Live chat turns on once Supabase sync is connected.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4" style={{ border: `1.5px solid ${accent.border}` }}>
      <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ color: accent.text }}>
        <MessageCircle size={14} strokeWidth={2.8} /> Chat · {dest.name}
      </p>

      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
        {msgs.length === 0 && <p className="py-4 text-center text-xs text-stone-400">No messages yet — say something 💕</p>}
        {msgs.map((m) => {
          const mine = m.who === me;
          const wa = m.who === "baby" ? ACCENTS.blush : ACCENTS.winter;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] rounded-2xl px-3 py-1.5 ${m._optimistic ? "opacity-60" : ""}`} style={{ backgroundColor: wa.soft }}>
                <span className="mr-1.5 text-[10px] font-extrabold" style={{ color: wa.text }}>{WHO_NAME[m.who] || "?"}</span>
                <span className="text-sm text-stone-600">{m.body}</span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={`Message as ${WHO_NAME[me]}…`} className="flex-1 rounded-xl border-2 border-stone-200 px-3 py-2 text-sm outline-none focus:border-rose-200" />
        <button onClick={send} disabled={!text.trim() || sending} className="rounded-xl p-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-40" style={{ backgroundColor: accent.hex, color: accent.text }} aria-label="Send"><Send size={15} strokeWidth={2.8} /></button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passport card
// ---------------------------------------------------------------------------
function PassportCard({ dest, votes, onVote, isOpen, onToggle, plans, onAddPlan, onDeletePlan, onAddComment, overrides, onEditField, unread = 0, onEditPlan, onAddToItinerary }) {
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
            {!isOpen && unread > 0 && <span key={unread} className="flex animate-pop items-center gap-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white"><MessageCircle size={9} strokeWidth={3} />{unread} new</span>}
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
            <IdeaBoard dest={dest} plans={plans} onAdd={onAddPlan} onDelete={onDeletePlan} onAddComment={onAddComment} onEdit={(planId, patch) => onEditPlan(dest.id, planId, patch)} onAddToItinerary={(day, idea) => onAddToItinerary(dest.id, day, idea)} />
            <DestChat dest={dest} isOpen={isOpen} />
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
const WHO_LABEL = { max: "Me", partner: "Ants" };

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
    <span onClick={(e) => { stop(e); setEditing(true); }} className={`cursor-text rounded px-1 py-0.5 underline decoration-dashed decoration-stone-300 underline-offset-2 transition-colors hover:bg-rose-50 hover:decoration-rose-300 ${className}`} title="Tap to edit — saved for both">
      {value || <span className="italic text-stone-300">{placeholder}</span>}
      <PenLine size={10} strokeWidth={2.6} className="ml-0.5 inline-block translate-y-[-1px] align-middle text-stone-300" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Photos & Memes wall (shared, realtime via Supabase Storage)
// ---------------------------------------------------------------------------
function MemeWall() {
  const me = useContext(IdentityContext);
  const openLightbox = useContext(LightboxContext);
  const [items, setItems] = useState([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const refresh = useCallback(async () => { setItems(await loadGallery()); }, []);
  useEffect(() => { refresh(); const unsub = subscribeGallery(refresh); return () => unsub(); }, [refresh]);

  const onFile = async (file) => {
    if (!file) return;
    setBusy(true); setErr("");
    try { await postImage(file, me, caption.trim()); setCaption(""); await refresh(); }
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
        <span className="rounded-xl px-3 py-2.5 text-sm font-extrabold" style={{ backgroundColor: (me === "baby" ? ACCENTS.blush : ACCENTS.winter).soft, color: (me === "baby" ? ACCENTS.blush : ACCENTS.winter).text }} title="Posting as you">{WHO_NAME[me]}</span>
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption (optional)…" className="flex-1 rounded-xl border-2 border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-rose-200" />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-extrabold text-rose-500 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" style={{ backgroundColor: ACCENTS.blush.hex, border: `1.5px solid ${ACCENTS.blush.border}` }}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} strokeWidth={2.8} />}{busy ? "Posting…" : "Post a photo / meme"}
        </button>
      </div>
      {err && <p className="mx-auto mt-2 max-w-2xl rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-600">{err}</p>}

      {items.length > 0 && (
        <div className="mt-6 columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
          {items.map((it, idx) => {
            const wa = it.who === "baby" ? ACCENTS.blush : ACCENTS.winter;
            return (
              <div key={it.id} className="group relative break-inside-avoid overflow-hidden rounded-2xl border-2 border-white bg-white shadow-sm">
                <img src={it.url} alt={it.caption || "meme"} onClick={() => openLightbox(items.map((x) => x.url), idx)} className="w-full cursor-zoom-in object-cover" loading="lazy" />
                <button onClick={() => deleteImage(it).then(refresh)} className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-stone-400 opacity-100 shadow transition-opacity hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Delete"><Trash2 size={14} /></button>
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

// ---------------------------------------------------------------------------
// Lightbox — pleasant in-app photo zoom (backdrop, Esc, arrows, swipe)
// ---------------------------------------------------------------------------
function Lightbox({ data, onClose }) {
  const [i, setI] = useState(data ? data.index : 0);
  const touchX = useRef(null);
  const images = data?.images || [];
  const multi = images.length > 1;

  useEffect(() => { if (data) setI(data.index || 0); }, [data]);

  const go = useCallback((d) => setI((x) => (x + d + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (!data) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data, onClose, go]);

  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touchX.current == null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (multi && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); touchX.current = null; }}
    >
      <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/30" aria-label="Close"><X size={22} strokeWidth={2.6} /></button>
      {multi && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-3 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/30" aria-label="Previous"><ChevronLeft size={26} strokeWidth={2.6} /></button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-3 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/30" aria-label="Next"><ChevronRight size={26} strokeWidth={2.6} /></button>
        </>
      )}
      <img src={images[i]} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
      {multi && (
        <div className="absolute bottom-5 flex gap-1.5">
          {images.map((_, n) => (
            <span key={n} className="h-1.5 rounded-full transition-all" style={{ width: n === i ? 18 : 6, backgroundColor: n === i ? "#fff" : "rgba(255,255,255,0.4)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Glaggle Game — whack-the-glaggle. Timer shrinks as you score; at the end he
// darts around on his own. High score is shared (synced) with who holds it.
// ---------------------------------------------------------------------------
const glaggleTier = (score) => (score >= 35 ? 2 : score >= 22 ? 4 : score >= 12 ? 6 : 10);
const GLAGGLE_LOOSE_AT = 35; // score where he starts darting on his own

function GlaggleGame({ high, onHigh }) {
  const me = useContext(IdentityContext);
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [pos, setPos] = useState({ top: 45, left: 45 });
  const [ended, setEnded] = useState(null); // final score after a loss
  const deadline = useRef(0);
  const scoreRef = useRef(0);

  const move = () => setPos({ top: 12 + Math.random() * 70, left: 4 + Math.random() * 80 });

  const start = () => {
    scoreRef.current = 0;
    setScore(0); setEnded(null); setPlaying(true);
    deadline.current = Date.now() + 10000; setTimeLeft(10);
    move();
  };

  // countdown — lose when it hits 0
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const left = deadline.current - Date.now();
      setTimeLeft(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) { setPlaying(false); setEnded(scoreRef.current); }
    }, 100);
    return () => clearInterval(t);
  }, [playing]);

  // final tier: glaggle darts around on his own (slower hops than before)
  useEffect(() => {
    if (!playing || score < GLAGGLE_LOOSE_AT) return;
    const d = setInterval(move, 1000);
    return () => clearInterval(d);
  }, [playing, score]);

  // record shared high score on loss
  useEffect(() => {
    if (ended == null) return;
    if (ended > (high?.score || 0)) onHigh({ score: ended, who: me, at: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  const bop = (e) => {
    e.stopPropagation();
    const s = scoreRef.current + 1;
    scoreRef.current = s;
    setScore(s);
    const secs = glaggleTier(s);
    deadline.current = Date.now() + secs * 1000;
    setTimeLeft(secs);
    move();
  };

  return (
    <>
      {/* high-score chip — top of the site */}
      <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-4 py-2 backdrop-blur">
        <img src="/glaggle.png" alt="Glaggle" className="h-6 w-6 object-contain" />
        <span className="text-xs font-extrabold uppercase tracking-wide text-stone-400">Glaggle Game</span>
        <span className="text-sm font-extrabold text-stone-600">
          {high?.score ? <>🏆 {high.score} · {WHO_NAME[high.who] || "?"}</> : "no high score yet"}
        </span>
        {!playing && (
          <button onClick={start} className="ml-1 rounded-full px-3 py-1 text-xs font-extrabold transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: ACCENTS.blush.hex, color: ACCENTS.blush.text, border: `1.5px solid ${ACCENTS.blush.border}` }}>
            {ended != null ? "Play again" : "Play"}
          </button>
        )}
      </div>
      {ended != null && !playing && (
        <p className="mt-1.5 text-center text-xs font-bold text-stone-400">Glaggle escaped! You scored {ended}{ended > 0 && ended >= (high?.score || 0) ? " — new high score! 🎉" : ""}</p>
      )}

      {/* live game overlay */}
      {playing && (
        <>
          <div className="fixed left-1/2 top-3 z-[55] flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-rose-200 bg-white px-4 py-2 shadow-lg">
            <span className="text-sm font-extrabold text-stone-600">Score {score}</span>
            <span className={`text-sm font-extrabold tabular-nums ${timeLeft <= 3 ? "animate-pop text-rose-500" : "text-stone-500"}`} key={timeLeft}>⏱ {timeLeft}s</span>
            {score >= GLAGGLE_LOOSE_AT && <span className="text-xs font-extrabold text-rose-500">HE'S LOOSE!!</span>}
            <button onClick={() => { setPlaying(false); setEnded(scoreRef.current); }} className="text-stone-300 hover:text-rose-400" aria-label="Give up"><X size={14} /></button>
          </div>
          <button
            onClick={bop}
            className="fixed z-[55] transition-all duration-200 ease-out hover:scale-110 active:scale-90"
            style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
            aria-label="Bop the glaggle!"
          >
            <img src="/glaggle.png" alt="Glaggle" draggable={false} className="h-24 w-24 object-contain drop-shadow-lg sm:h-28 sm:w-28" />
          </button>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Itinerary — day-by-day timed planner (per destination)
// ---------------------------------------------------------------------------
// Calendar-grid helpers — Google-Calendar-style week view
const DAY_START_H = 6;   // grid runs 06:00 → 24:00
const DAY_END_H = 24;
const HOUR_PX = 44;
const toMin = (t) => { if (!t) return null; const [h, m] = String(t).split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const KIND_COLOR = {
  stay: ACCENTS.winter,
  activity: ACCENTS.blush,
  food: ACCENTS.mint,
  note: { soft: "#F5F5F4", border: "#D6D3D1", text: "#57534E", hex: "#E7E5E4" },
};

function TimeBlock({ item, onOpen }) {
  const c = KIND_COLOR[item.kind] || KIND_COLOR.activity;
  const meta = KIND_META[item.kind] || KIND_META.activity;
  const s = toMin(item.start_time);
  const e = toMin(item.end_time) ?? s + 60;
  const top = Math.max(0, ((s - DAY_START_H * 60) / 60) * HOUR_PX);
  const height = Math.max(22, ((Math.max(e, s + 15) - s) / 60) * HOUR_PX - 2);
  return (
    <button
      onClick={(ev) => { ev.stopPropagation(); onOpen(item.id); }}
      className="absolute left-0.5 right-0.5 overflow-hidden rounded-lg border text-left shadow-sm transition-transform hover:z-10 hover:scale-[1.02]"
      style={{ top, height, backgroundColor: c.soft, borderColor: c.border }}
      title={`${item.title || meta.label} · tap to edit`}
    >
      <div className="px-1.5 pt-0.5 text-[9px] font-bold leading-tight" style={{ color: c.text }}>
        {item.start_time}{item.end_time ? `–${item.end_time}` : ""}
      </div>
      <div className="truncate px-1.5 text-[10px] font-extrabold leading-tight text-stone-700">{meta.emoji} {item.title || "…"}</div>
    </button>
  );
}

// Bottom-sheet editor for one itinerary item (tap a block or unscheduled chip)
function ItemEditor({ item, onUpdate, onRemove, onClose }) {
  if (!item) return null;
  const KINDS = [
    { kind: "stay", icon: Bed },
    { kind: "activity", icon: Sparkles },
    { kind: "food", icon: Utensils },
    { kind: "note", icon: NotebookPen },
  ];
  return (
    <div className="fixed inset-0 z-[58] flex items-end justify-center bg-stone-900/30 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div key={item.id} className="w-full max-w-md space-y-3 rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          {KINDS.map((k) => {
            const active = item.kind === k.kind;
            const c = KIND_COLOR[k.kind];
            return (
              <button key={k.kind} onClick={() => onUpdate(item.id, { kind: k.kind })} className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-extrabold transition-all" style={{ backgroundColor: active ? c.hex : "#fff", color: active ? c.text : "#A8A29E", border: `1.5px solid ${active ? c.border : "#E7E1D8"}` }}>
                <k.icon size={15} strokeWidth={2.6} /> {KIND_META[k.kind].label}
              </button>
            );
          })}
        </div>
        <input defaultValue={item.title || ""} onBlur={(e) => e.target.value !== (item.title || "") && onUpdate(item.id, { title: e.target.value })} placeholder={item.kind === "stay" ? "Hotel / where you're staying" : "What are you doing?"} className="w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-sm font-bold outline-none focus:border-rose-200" />
        <div className="flex flex-wrap items-center gap-2">
          <select value={item.day} onChange={(e) => onUpdate(item.id, { day: Number(e.target.value) })} className="rounded-xl border-2 border-stone-200 px-2 py-2 text-xs font-bold text-stone-600 outline-none focus:border-rose-200">
            {Array.from({ length: TRIP_DAYS }).map((_, dd) => (<option key={dd} value={dd}>Day {dd + 1} · {dayLabel(dd)}</option>))}
          </select>
          <input type="time" value={item.start_time || ""} onChange={(e) => onUpdate(item.id, { start_time: e.target.value })} className="rounded-xl border-2 border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-rose-200" />
          <span className="text-xs font-bold text-stone-400">→</span>
          <input type="time" value={item.end_time || ""} onChange={(e) => onUpdate(item.id, { end_time: e.target.value })} className="rounded-xl border-2 border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-rose-200" />
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={13} className="flex-shrink-0 text-stone-400" />
          <input defaultValue={item.place || ""} onBlur={(e) => e.target.value !== (item.place || "") && onUpdate(item.id, { place: e.target.value })} placeholder="address / place (powers the movement map)" className="w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-xs outline-none focus:border-rose-200" />
        </div>
        <textarea defaultValue={item.notes || ""} onBlur={(e) => e.target.value !== (item.notes || "") && onUpdate(item.id, { notes: e.target.value })} placeholder="notes…" rows={2} className="w-full resize-y rounded-xl border-2 border-stone-200 px-3 py-2 text-xs outline-none focus:border-rose-200" />
        <div className="flex items-center justify-between">
          <button onClick={() => { onRemove(item.id); onClose(); }} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-rose-400 transition-colors hover:bg-rose-50"><Trash2 size={14} /> Delete</button>
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-extrabold transition-all hover:scale-[1.03] active:scale-95" style={{ backgroundColor: ACCENTS.mint.hex, color: ACCENTS.mint.text, border: `1.5px solid ${ACCENTS.mint.border}` }}>Done</button>
        </div>
      </div>
    </div>
  );
}

function ItineraryView({ chosenDest, onSetChosen }) {
  const [dest, setDest] = useState(chosenDest || DESTINATIONS[0].id);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // item id open in the editor
  const accent = DEST_BY_ID[dest].accent;

  const refresh = useCallback(async () => setItems(await loadItinerary(dest)), [dest]);
  useEffect(() => { refresh(); const unsub = subscribeItinerary(dest, refresh); return () => unsub(); }, [dest, refresh]);

  const timedFor = (dd) => items.filter((it) => it.day === dd && it.start_time);
  const unscheduled = items.filter((it) => !it.start_time);

  // Tap an empty slot in a day column → create a 1h block right there
  const createAt = async (dd, hour) => {
    const pad = (n) => String(n).padStart(2, "0");
    const payload = { dest, day: dd, kind: "activity", start_time: `${pad(hour)}:00`, end_time: hour + 1 >= 24 ? "23:59" : `${pad(hour + 1)}:00`, title: "", place: "", notes: "", position: 0 };
    let row = await addItineraryItem(payload);
    if (!row) { const { end_time, ...rest } = payload; row = await addItineraryItem(rest); } // tolerate missing end_time column
    refresh();
    if (row) setEditing(row.id);
  };
  const addUnscheduled = async (dd) => {
    const row = await addItineraryItem({ dest, day: dd, kind: "activity", start_time: "", title: "", place: "", notes: "", position: 0 });
    refresh();
    if (row) setEditing(row.id);
  };
  const update = (id, patch) => { setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))); updateItineraryItem(id, patch); };
  const remove = async (id) => { setItems((xs) => xs.filter((x) => x.id !== id)); await deleteItineraryItem(id); refresh(); };

  if (!hasSupabase) {
    return (
      <section className="mt-8">
        <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-stone-300 bg-white/70 p-8 text-center text-sm text-stone-400">🗓️ The itinerary planner turns on once Supabase sync is connected.</div>
      </section>
    );
  }

  const hours = Array.from({ length: DAY_END_H - DAY_START_H }, (_, i) => DAY_START_H + i);
  const editingItem = editing ? items.find((x) => x.id === editing) || null : null;

  return (
    <section className="mt-8">
      {/* city selector */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {DESTINATIONS.map((x) => {
          const active = x.id === dest;
          return (
            <button key={x.id} onClick={() => { setDest(x.id); setDay(0); }} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-extrabold transition-all" style={{ backgroundColor: active ? x.accent.hex : "#fff", color: active ? x.accent.text : "#A8A29E", border: `1.5px solid ${active ? x.accent.border : "#E7E1D8"}` }}>
              {chosenDest === x.id && "⭐"} {x.emoji} {x.name}
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-center">
        <button onClick={() => onSetChosen(chosenDest === dest ? "" : dest)} className="rounded-full border px-3 py-1.5 text-xs font-extrabold transition-colors" style={{ borderColor: accent.border, color: accent.text, backgroundColor: chosenDest === dest ? accent.hex : accent.soft }}>
          {chosenDest === dest ? "⭐ This is our trip" : "☆ Mark as our trip"}
        </button>
      </div>

      {/* unscheduled tray — ideas added without a time land here */}
      {unscheduled.length > 0 && (
        <div className="mx-auto mt-5 max-w-4xl rounded-2xl border border-dashed border-stone-300 bg-white/70 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">No time yet — tap to schedule</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unscheduled.map((it) => (
              <button key={it.id} onClick={() => setEditing(it.id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-stone-600 transition-transform hover:scale-105" style={{ backgroundColor: (KIND_COLOR[it.kind] || KIND_COLOR.activity).soft, border: `1px solid ${(KIND_COLOR[it.kind] || KIND_COLOR.activity).border}` }}>
                {(KIND_META[it.kind] || KIND_META.activity).emoji} {it.title || "untitled"} <span className="text-stone-400">· D{it.day + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* week grid — Google-Calendar style */}
      <p className="mt-5 text-center text-xs text-stone-400">Tap an empty slot to add a block · tap a block to edit it</p>
      <div className="mt-2 overflow-x-auto rounded-3xl border border-stone-200 bg-white/85 backdrop-blur">
        <div className="flex min-w-[920px]">
          {/* time gutter */}
          <div className="sticky left-0 z-20 w-12 flex-shrink-0 border-r border-stone-100 bg-white">
            <div className="h-12 border-b border-stone-100" />
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR_PX }} className="pr-1.5 text-right text-[9px] font-bold text-stone-300">{String(h).padStart(2, "0")}:00</div>
            ))}
          </div>
          {/* day columns */}
          {Array.from({ length: TRIP_DAYS }).map((_, dd) => (
            <div key={dd} className="min-w-[108px] flex-1 border-r border-stone-100 last:border-r-0">
              <div className="flex h-12 items-center justify-between border-b border-stone-100 px-2">
                <div>
                  <div className="text-[9px] font-bold uppercase text-stone-400">Day {dd + 1}</div>
                  <div className="text-[10px] font-extrabold text-stone-600">{dayLabel(dd)}</div>
                </div>
                <button onClick={() => addUnscheduled(dd)} className="rounded-md p-1 text-stone-300 transition-colors hover:text-rose-400" title="Add without a time" aria-label={`Add to day ${dd + 1}`}><Plus size={13} strokeWidth={3} /></button>
              </div>
              <div
                className="relative cursor-copy"
                style={{ height: (DAY_END_H - DAY_START_H) * HOUR_PX }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const hour = DAY_START_H + Math.floor((e.clientY - rect.top) / HOUR_PX);
                  createAt(dd, Math.min(23, Math.max(DAY_START_H, hour)));
                }}
              >
                {hours.map((h, i) => (<div key={h} className="pointer-events-none absolute left-0 right-0 border-t border-stone-100/70" style={{ top: i * HOUR_PX }} />))}
                {timedFor(dd).map((it) => (<TimeBlock key={it.id} item={it} onOpen={setEditing} />))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ItemEditor item={editingItem} onUpdate={update} onRemove={remove} onClose={() => setEditing(null)} />
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
  const [lightbox, setLightbox] = useState(null); // { images, index } | null
  const openLightbox = useCallback((images, index = 0) => setLightbox({ images: images.filter(Boolean), index }), []);
  const hydrated = useRef(false);
  const lastSynced = useRef(null);

  // Device identity — who is using this device
  const [me, setMe] = useState(() => { try { return localStorage.getItem(IDENTITY_KEY) || null; } catch (e) { return null; } });
  useEffect(() => { if (me) { try { localStorage.setItem(IDENTITY_KEY, me); } catch (e) {} } }, [me]);

  // Unread chat badges — counts per destination vs. what this device has seen
  const [msgCounts, setMsgCounts] = useState({});
  const [seen, setSeen] = useState(() => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); } catch (e) { return {}; } });
  useEffect(() => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) {} }, [seen]);
  useEffect(() => {
    if (!hasSupabase) return;
    let unsub = () => {};
    (async () => {
      setMsgCounts(await loadMessageCounts());
      unsub = subscribeAllMessages(async () => setMsgCounts(await loadMessageCounts()));
    })();
    return () => unsub();
  }, []);
  useEffect(() => { if (openId) setSeen((s) => ({ ...s, [openId]: msgCounts[openId] || 0 })); }, [openId, msgCounts]);
  const unreadFor = (id) => Math.max(0, (msgCounts[id] || 0) - (seen[id] || 0));

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
  const editPlan = (destId, planId, patch) => setPlans((p) => ({
    ...p,
    [destId]: p[destId].map((x) => (x.id === planId ? { ...x, ...patch } : x)),
  }));
  const addToItinerary = (destId, day, idea) => addItineraryItem({
    dest: destId, day, kind: "activity", start_time: "",
    title: idea.title || "", place: idea.location || idea.title || "", notes: idea.summary || "",
    idea_id: idea.id, position: 0,
  });

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
  const totalUnread = DESTINATIONS.reduce((n, d) => n + unreadFor(d.id), 0);

  return (
    <IdentityContext.Provider value={me || "me"}>
    <LightboxContext.Provider value={openLightbox}>
    <Lightbox data={lightbox} onClose={() => setLightbox(null)} />
    {!me && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/20 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-3xl border-2 border-rose-100 bg-white p-6 text-center shadow-xl">
          <h2 className="text-xl font-black text-stone-800">Who's on this device? 💕</h2>
          <p className="mt-1 text-sm text-stone-400">So your messages, comments &amp; memes get tagged as you. You can switch anytime.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={() => setMe("me")} className="rounded-2xl px-4 py-5 text-lg font-extrabold transition-transform hover:scale-[1.03] active:scale-95" style={{ backgroundColor: ACCENTS.winter.soft, color: ACCENTS.winter.text, border: `2px solid ${ACCENTS.winter.border}` }}>{WHO_NAME.me}</button>
            <button onClick={() => setMe("baby")} className="rounded-2xl px-4 py-5 text-lg font-extrabold transition-transform hover:scale-[1.03] active:scale-95" style={{ backgroundColor: ACCENTS.blush.hex, color: ACCENTS.blush.text, border: `2px solid ${ACCENTS.blush.border}` }}>{WHO_NAME.baby}</button>
          </div>
        </div>
      </div>
    )}
    <div className="min-h-screen w-full font-sans text-stone-800" style={{ backgroundColor: "#FFFDF9", backgroundImage: "radial-gradient(circle at 15% 10%, #FFF5F0 0, transparent 45%), radial-gradient(circle at 85% 90%, #EEF6F1 0, transparent 48%)" }}>
      <div className="pointer-events-none fixed inset-0 opacity-[0.18]" style={{ backgroundImage: "radial-gradient(#EEE8DE 1px, transparent 1px)", backgroundSize: "26px 26px" }} />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="animate-float-in text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border-2 border-rose-100 bg-white/80 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-rose-400 shadow-sm backdrop-blur">
            <Calendar size={13} strokeWidth={3} /> Nov 27 – Dec 4
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-stone-800 sm:text-5xl">Me &amp; Ants <span className="text-emerald-300">♥</span> Travel Plans</h1>
          <p className="mt-3 text-base font-semibold text-stone-500 sm:text-lg">
            <Editable value={copy.subtitle} onSave={(v) => updateCopy("subtitle", v)} rows={2} />
          </p>
        </header>

        {/* Glaggle Game — shared high score + play */}
        <GlaggleGame high={copy.glaggleHigh} onHigh={(h) => updateCopy("glaggleHigh", h)} />

        {/* Tabs — show one section at a time */}
        <div className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-1 rounded-2xl border border-stone-200 bg-white/70 p-1.5 backdrop-blur">
          {[
            { id: "plan", label: "Decide", icon: MapPin },
            { id: "itinerary", label: "Itinerary", icon: CalendarDays },
            { id: "photos", label: "Photos", icon: ImageIcon },
            { id: "compare", label: "Compare", icon: Star },
          ].map((t) => {
            const active = view === t.id;
            return (
              <button key={t.id} onClick={() => setView(t.id)} className="relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold transition-all" style={{ backgroundColor: active ? ACCENTS.blush.hex : "transparent", color: active ? ACCENTS.blush.text : "#A8A29E" }}>
                <t.icon size={15} strokeWidth={2.8} /> {t.label}
                {t.id === "plan" && totalUnread > 0 && <span key={totalUnread} className="animate-pop rounded-full bg-rose-500 px-1.5 text-[10px] font-extrabold text-white">{totalUnread}</span>}
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
          {me && (
            <button onClick={() => setMe((x) => (x === "me" ? "baby" : "me"))} className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-4 py-2.5 backdrop-blur transition-colors hover:border-rose-200" title="Switch who this device is">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: (me === "baby" ? ACCENTS.blush : ACCENTS.winter).hex }} />
              <span className="text-sm font-bold text-stone-500">You: {WHO_NAME[me]}</span>
            </button>
          )}
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
              <PassportCard dest={dest} votes={votes[dest.id]} onVote={handleVote} isOpen={openId === dest.id} onToggle={handleToggle} plans={plans[dest.id]} onAddPlan={addPlan} onDeletePlan={deletePlan} onAddComment={addComment} overrides={copy.dest?.[dest.id]} onEditField={(key, val) => updateDestField(dest.id, key, val)} unread={unreadFor(dest.id)} onEditPlan={editPlan} onAddToItinerary={addToItinerary} />
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
                  <th className="px-5 py-4 font-extrabold">Destination</th><th className="px-4 py-4 font-extrabold">Flight</th><th className="px-4 py-4 font-extrabold">Weather</th><th className="px-4 py-4 font-extrabold">Sunset</th><th className="px-4 py-4 font-extrabold">Ideas</th><th className="px-4 py-4 font-extrabold">Me</th><th className="px-4 py-4 font-extrabold">Ants</th>
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

        {view === "itinerary" && <ItineraryView chosenDest={copy.chosenDest} onSetChosen={(id) => updateCopy("chosenDest", id)} />}

        <footer className="mt-12 text-center text-xs text-stone-400">
          <p className="font-semibold">Made with ❄️ 🍱 🦦 🧸 ✨ for a very specific kind of cozy winter trip.</p>
          <p className="mt-1">Prices in SGD per pax · planning weather &amp; sunset for late Nov / early Dec · live temps via Open-Meteo · plan scrubbing via Claude.</p>
        </footer>
      </div>
    </div>
    </LightboxContext.Provider>
    </IdentityContext.Provider>
  );
}
