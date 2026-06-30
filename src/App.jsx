import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Heart,
  Plane,
  Snowflake,
  Sunset,
  Train,
  Utensils,
  Sparkles,
  MapPin,
  Wallet,
  Thermometer,
  ChevronDown,
  Sun,
  Moon,
  Star,
  Calendar,
  Trophy,
  CloudSnow,
  RefreshCw,
  Crown,
  RotateCcw,
} from "lucide-react";

/**
 * Max & Partner — Year-End Trip Planning Hub
 * Nov 27 – Dec 4
 *
 * Fully wired:
 *  - Two-person Heart Tracker (Max vs Partner), persisted to localStorage
 *  - Sliding deep-dive itinerary drawer (Level 4 daytime / Level 2 cozy night)
 *  - Live "right now" weather peek per city (Open-Meteo, no API key)
 *  - Baked-in recommendation engine
 */

// ---------------------------------------------------------------------------
// Pastel accent system
// ---------------------------------------------------------------------------
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

const STORAGE_KEY = "maxpartner.trip.votes.v2";

// ---------------------------------------------------------------------------
// Immutable destination data
// ---------------------------------------------------------------------------
const DESTINATIONS = [
  {
    id: "sapporo",
    emoji: "❄️",
    name: "Sapporo",
    region: "Hokkaido, Japan",
    tagline: "Deep-snow seafood wonderland",
    accent: ACCENTS.winter,
    cozyScore: 5,
    coords: { lat: 43.0618, lon: 141.3545 },
    recommendation: { rank: 2, badge: "Best Experience", note: "The snow-globe fantasy — if budget can stretch." },
    flight: { price: "S$1,000+", per: "per pax", carrier: "Various", budget: "over", note: "Premium for peak deep-winter Hokkaido demand." },
    weather: { range: "-1°C to 6°C", label: "Freezing", snow: "High snow accumulation probability", snowIcon: true },
    sunset: "4:00 PM",
    sunsetNote: "Elite early dark cozy-night vibe",
    basecamp: { station: "Nakajima Koen Station", logic: "1 stop on Namboku Subway Line to Odori Park", vibe: "Local food lanes, quiet park-side calm", price: "S$90–S$110 / night" },
    food: ["Nijo Market — massive raw uni & giant botan shrimp", "Sankaku Market — fresh ikura kaisendon bowls"],
    cuteIP: ["Sapporo PARCO — Mofusand Store", "JR Stellar Place — Pokémon Center"],
    deepDive: {
      level4: {
        title: "Level 4 Purpose — Daytime Power Run",
        items: [
          "Open Nijo Market early for a colossal uni + ikura + botan shrimp kaisendon breakfast.",
          "Namboku Line one stop to Odori → Sapporo PARCO Mofusand pilgrimage.",
          "JR Stellar Place Pokémon Center sweep before the 4PM blackout.",
        ],
      },
      level2: {
        title: "Level 2 Cozy Night — Convenience Haul",
        items: [
          "Sunset hits at 4PM — retreat to Nakajima Koen as the snow glows.",
          "Seicomart konbini run: Hokkaido milk, soft-serve & hot oden.",
          "Snow-window room night, warm drinks, plan tomorrow's market list.",
        ],
      },
    },
  },
  {
    id: "seoul",
    emoji: "🧸",
    name: "Seoul",
    region: "South Korea",
    tagline: "Crisp winds & character flagships",
    accent: ACCENTS.blush,
    cozyScore: 4,
    coords: { lat: 37.5665, lon: 126.978 },
    recommendation: { rank: 1, badge: "Top Pick", note: "Best balance — cold, on-budget, food + IP, latest usable daylight." },
    flight: { price: "S$768", per: "per pax", carrier: "Korean Air (full-service)", budget: "target", note: "Full-service comfort right on the budget line." },
    weather: { range: "-2°C to 7°C", label: "Biting Cold", snow: "Crisp clear winds, potential early flurries", snowIcon: true },
    sunset: "5:15 PM",
    sunsetNote: "Golden-hour over the Han River",
    basecamp: { station: "Hapjeong Station", logic: "1 stop on Line 2 from the main Hongdae chaos", vibe: "Calm neighborhood, easy late-night returns", price: "S$80–S$100 / night" },
    food: ["Noryangjin Fish Market — live moving octopus & sashimi", "Ganjang Gejang — raw soy-marinated crab"],
    cuteIP: ["Hongdae indie illustration studios", "Flagship Kakao Friends & Line Friends Square"],
    deepDive: {
      level4: {
        title: "Level 4 Purpose — Daytime Power Run",
        items: [
          "Noryangjin Fish Market: pick a live octopus & sashimi platter cooked upstairs.",
          "Line 2 into Hongdae — Kakao Friends + Line Friends Square flagship sweep.",
          "Hongdae indie illustration studios for original character art prints.",
        ],
      },
      level2: {
        title: "Level 2 Cozy Night — Convenience Haul",
        items: [
          "Ride one stop back to calm Hapjeong before the wind bites.",
          "CU / GS25 run: hotteok, banana milk, instant tteokbokki cups.",
          "Ganjang gejang takeaway feast — buttery raw crab on warm rice.",
        ],
      },
    },
  },
  {
    id: "tokyo",
    emoji: "✨",
    name: "Tokyo",
    region: "Japan",
    tagline: "Winter illuminations & IP mecca",
    accent: ACCENTS.blush,
    cozyScore: 4,
    coords: { lat: 35.6762, lon: 139.6503 },
    recommendation: { rank: 3, badge: "Cute-IP King", note: "Unbeatable character shopping, but no snow this season." },
    flight: { price: "S$948", per: "per pax", carrier: "ZIPAIR + baggage bundle", budget: "slightly", note: "Low-cost base fare, nudged up by the baggage bundle." },
    weather: { range: "6°C to 13°C", label: "Brisk Winter Jacket", snow: "Zero snow chance", snowIcon: false },
    sunset: "4:30 PM",
    sunsetNote: "City flips into winter illuminations early",
    basecamp: { station: "Koenji Station", logic: "2 stops on JR Chuo Line from Shinjuku", vibe: "Retro indoor izakaya shotengai alleys", price: "S$100–S$120 / night" },
    food: ["Shinjuku & Koenji bistros — Basashi raw horse sashimi & yakiniku", "Premium beef tartare counters"],
    cuteIP: ["Tokyo Character Street — Chiikawa Land & Mofusand Mofumofu", "Shibuya Mega Pokémon Center · Nintendo Tokyo"],
    deepDive: {
      level4: {
        title: "Level 4 Purpose — Daytime Power Run",
        items: [
          "Tokyo Character Street blitz: flagship Chiikawa Land + Mofusand Mofumofu.",
          "Shibuya Mega Pokémon Center → Nintendo Tokyo combo at Parco.",
          "Catch winter illuminations switching on by the 4:30PM dusk.",
        ],
      },
      level2: {
        title: "Level 2 Cozy Night — Convenience Haul",
        items: [
          "JR Chuo back to Koenji's retro shotengai alley warmth.",
          "Tiny izakaya: Basashi, premium beef tartare, hot sake.",
          "Lawson / 7-Eleven nightcap haul — karaage-kun & hot canned coffee.",
        ],
      },
    },
  },
  {
    id: "taipei",
    emoji: "🦦",
    name: "Taipei",
    region: "Taiwan",
    tagline: "Budget king & night-market feasts",
    accent: ACCENTS.mint,
    cozyScore: 3,
    coords: { lat: 25.033, lon: 121.5654 },
    recommendation: { rank: 4, badge: "Budget King", note: "A steal — but too mild for the cold-trip brief without a mountain day." },
    flight: { price: "S$500", per: "per pax", carrier: "STARLUX / China Airlines", budget: "under", note: "The clear financial win of the shortlist." },
    weather: { range: "15°C to 20°C", label: "Cool & mild", snow: "Needs a Cingjing / Alishan mountain day for sub-10°C cold", snowIcon: false },
    sunset: "5:05 PM",
    sunsetNote: "Soft warm evenings, lightest jacket of the lot",
    basecamp: { station: "Shuanglian Station", logic: "1 stop on Red Line to Taipei Main", vibe: "Right next to Ningxia Night Market food rows", price: "S$70–S$90 / night" },
    food: ["Ningxia Night Market — hotpot & rich braised pork platters", "Raohe Night Market — full street-food run"],
    cuteIP: ["Huashan 1914 Creative Park — animation pop-ups", "Indie character merchandise stalls"],
    deepDive: {
      level4: {
        title: "Level 4 Purpose — Daytime Power Run",
        items: [
          "Optional Cingjing Farm / Alishan day trip to trigger real sub-10°C cold.",
          "Huashan 1914 Creative Park for rotating animation pop-ups & indie merch.",
          "Red Line hop to Taipei Main for department-store character corners.",
        ],
      },
      level2: {
        title: "Level 2 Cozy Night — Convenience Haul",
        items: [
          "Step out of Shuanglian straight into Ningxia Night Market rows.",
          "Braised pork rice, oyster omelette & bubbling hotpot for two.",
          "7-Eleven / FamilyMart tea-egg & milk-tea nightcap haul.",
        ],
      },
    },
  },
  {
    id: "fukuoka",
    emoji: "🍱",
    name: "Fukuoka",
    region: "Kyushu, Japan",
    tagline: "Yatai stalls & coastal calm",
    accent: ACCENTS.mint,
    cozyScore: 3,
    coords: { lat: 33.5904, lon: 130.4017 },
    recommendation: { rank: 5, badge: "Layover Caveat", note: "Lovely & cheap, but 8–15h layovers bruise a 7-day romantic trip." },
    flight: { price: "S$530–S$630", per: "per pax", carrier: "Budget via Hanoi / Manila", budget: "onbudget", note: "Cheap fare, but high-friction 8–15h layovers." },
    weather: { range: "7°C to 14°C", label: "Chilly & coastal", snow: "Clear brisk walking skies, no snow", snowIcon: false },
    sunset: "5:00 PM",
    sunsetNote: "Riverside lights along the Naka River",
    basecamp: { station: "Gion Station", logic: "1 stop to Hakata Main Station", vibe: "Local neighborhood feel, walkable to Canal City", price: "S$80–S$100 / night" },
    food: ["Hakata Motsunabe — savory beef offal hotpot", "Nakasu Yatai — open-air riverside street stalls"],
    cuteIP: ["Canal City Hakata — capsule halls & official Sanrio", "Fukuoka PARCO — Mofusand Store"],
    deepDive: {
      level4: {
        title: "Level 4 Purpose — Daytime Power Run",
        items: [
          "Canal City Hakata: massive capsule-toy halls + official Sanrio networks.",
          "Fukuoka PARCO Mofusand Store before the riverside lights warm up.",
          "Gachapon grinding session — Kyushu-exclusive blind-box hunting.",
        ],
      },
      level2: {
        title: "Level 2 Cozy Night — Convenience Haul",
        items: [
          "Nakasu Yatai riverside stalls: ramen, oden & yakitori under lanterns.",
          "Hakata Motsunabe pot for two — garlic-chive beef-offal warmth.",
          "Gion-side konbini run: Hakata mentaiko onigiri & hot tea.",
        ],
      },
    },
  },
];

const WMO = {
  0: { t: "Clear", e: "☀️" },
  1: { t: "Mostly clear", e: "🌤️" },
  2: { t: "Partly cloudy", e: "⛅" },
  3: { t: "Overcast", e: "☁️" },
  45: { t: "Fog", e: "🌫️" },
  48: { t: "Rime fog", e: "🌫️" },
  51: { t: "Light drizzle", e: "🌦️" },
  53: { t: "Drizzle", e: "🌦️" },
  55: { t: "Dense drizzle", e: "🌧️" },
  61: { t: "Light rain", e: "🌧️" },
  63: { t: "Rain", e: "🌧️" },
  65: { t: "Heavy rain", e: "🌧️" },
  71: { t: "Light snow", e: "🌨️" },
  73: { t: "Snow", e: "❄️" },
  75: { t: "Heavy snow", e: "❄️" },
  77: { t: "Snow grains", e: "🌨️" },
  80: { t: "Rain showers", e: "🌦️" },
  85: { t: "Snow showers", e: "🌨️" },
  86: { t: "Snow showers", e: "❄️" },
  95: { t: "Thunderstorm", e: "⛈️" },
};

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------
function Pill({ children, accent, soft = true }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold leading-none"
      style={{ backgroundColor: soft ? accent.soft : accent.hex, color: accent.text, border: `1.5px solid ${accent.border}` }}
    >
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

// Live "right now" weather peek
function LiveWeather({ coords, accent }) {
  const [state, setState] = useState({ status: "loading", data: null });

  const load = useCallback(() => {
    setState({ status: "loading", data: null });
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&timezone=auto`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        const c = j.current;
        setState({ status: "ok", data: { temp: Math.round(c.temperature_2m), code: c.weather_code } });
      })
      .catch(() => setState({ status: "error", data: null }));
  }, [coords.lat, coords.lon]);

  useEffect(() => {
    load();
  }, [load]);

  const w = state.data ? WMO[state.data.code] || { t: "—", e: "🌡️" } : null;

  return (
    <div className="flex items-center justify-between rounded-2xl px-4 py-2.5" style={{ backgroundColor: accent.soft, border: `1.5px solid ${accent.border}` }}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Live there now</span>
        {state.status === "loading" && <span className="text-sm font-semibold text-stone-400">fetching…</span>}
        {state.status === "error" && <span className="text-sm font-semibold text-stone-400">offline — see planning range</span>}
        {state.status === "ok" && (
          <span className="text-sm font-extrabold" style={{ color: accent.text }}>
            {w.e} {state.data.temp}°C · {w.t}
          </span>
        )}
      </div>
      <button onClick={load} className="rounded-full p-1.5 transition-transform hover:rotate-90 active:scale-90" style={{ color: accent.text }} aria-label="Refresh live weather">
        <RefreshCw size={14} strokeWidth={2.6} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passport card
// ---------------------------------------------------------------------------
function PassportCard({ dest, votes, onVote, isOpen, onToggle }) {
  const accent = dest.accent;
  const budget = BUDGET_TONE[dest.flight.budget];
  const total = votes.max + votes.partner;
  const isTopPick = dest.recommendation.rank === 1;

  return (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white/90 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ border: `2px solid ${accent.border}` }}
    >
      {isTopPick && (
        <div className="absolute right-4 top-12 z-10 flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-600 shadow-sm">
          <Crown size={12} strokeWidth={3} fill="#FCD34D" /> Top Pick
        </div>
      )}

      <div className="flex items-center justify-between px-5 pt-4" style={{ color: accent.text }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">✦ Travel Passport</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">No. {String(DESTINATIONS.indexOf(dest) + 1).padStart(2, "0")}</span>
      </div>

      <div className="px-5 pb-4 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-3xl leading-none">{dest.emoji}</span>
              <h3 className="truncate text-2xl font-extrabold tracking-tight text-stone-800">{dest.name}</h3>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-stone-400">
              <MapPin size={12} strokeWidth={2.6} />
              {dest.region}
            </p>
            <p className="mt-1 text-sm font-medium italic text-stone-500">"{dest.tagline}"</p>
          </div>

          <div className="flex flex-col items-center gap-1 rounded-2xl px-3 py-2" style={{ backgroundColor: accent.soft, border: `1.5px solid ${accent.border}` }}>
            <Heart size={22} strokeWidth={2.4} style={{ color: accent.text, fill: total > 0 ? accent.hex : "transparent" }} />
            <span className="text-sm font-extrabold tabular-nums" style={{ color: accent.text }}>{total}</span>
          </div>
        </div>

        {/* Two-person heart tracker */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {["max", "partner"].map((who) => (
            <button
              key={who}
              onClick={(e) => { e.stopPropagation(); onVote(dest.id, who); }}
              className="flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 transition-all duration-200 hover:scale-[1.03] active:scale-95"
              style={{ backgroundColor: "#fff", border: `1.5px solid ${accent.border}` }}
            >
              <span className="text-xs font-extrabold capitalize text-stone-500">{who}</span>
              <Heart size={16} strokeWidth={2.6} style={{ color: accent.text, fill: votes[who] > 0 ? accent.hex : "transparent" }} className={votes[who] > 0 ? "animate-pop" : ""} key={votes[who]} />
              <span className="text-sm font-extrabold tabular-nums" style={{ color: accent.text }}>{votes[who]}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill accent={budget.chip} soft={false}>
            <Plane size={12} strokeWidth={2.6} />
            {dest.flight.price} {dest.flight.per}
          </Pill>
          <Pill accent={budget.chip}>{budget.emoji} {budget.label}</Pill>
        </div>
        <p className="mt-2 pl-1 text-xs text-stone-400">{dest.flight.carrier} · {dest.flight.note}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 px-5 py-4" style={{ backgroundColor: accent.soft + "80" }}>
        <StatRow icon={dest.weather.snowIcon ? CloudSnow : Thermometer} label="Weather" value={dest.weather.range} accent={accent} />
        <StatRow icon={Sunset} label="Sunset" value={dest.sunset} accent={accent} />
        <StatRow icon={Train} label="Basecamp" value={dest.basecamp.station} accent={accent} />
        <StatRow icon={Wallet} label="Stay / night" value={dest.basecamp.price} accent={accent} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-xs">
        <span className="flex items-center gap-1 font-semibold text-stone-500">
          <Snowflake size={12} strokeWidth={2.6} style={{ color: accent.text }} />
          {dest.weather.label} — {dest.weather.snow}
        </span>
        <span className="flex items-center gap-1 font-semibold text-stone-500">
          <Moon size={12} strokeWidth={2.6} style={{ color: accent.text }} />
          {dest.sunsetNote}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 px-5 pb-5 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Cozy night</span>
          <CozyMeter score={dest.cozyScore} accent={accent} />
        </div>
        <button
          onClick={() => onToggle(dest.id)}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition-all duration-200 hover:scale-[1.03] active:scale-95"
          style={{ backgroundColor: accent.hex, color: accent.text, border: `1.5px solid ${accent.border}` }}
        >
          {isOpen ? "Hide itinerary" : "Open deep-dive"}
          <ChevronDown size={15} strokeWidth={3} className="transition-transform duration-300" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
        </button>
      </div>

      {/* Sliding deep-dive drawer */}
      <div className="grid transition-all duration-500 ease-out" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="space-y-4 px-5 pb-6 pt-1" style={{ borderTop: `2px dashed ${accent.border}` }}>
            <LiveWeather coords={dest.coords} accent={accent} />

            <div className="rounded-2xl p-4" style={{ backgroundColor: accent.soft, border: `1.5px solid ${accent.border}` }}>
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ color: accent.text }}>
                <Train size={14} strokeWidth={2.8} /> The "Temma-Station" Basecamp
              </p>
              <p className="mt-1 text-sm font-bold text-stone-700">{dest.basecamp.station}</p>
              <p className="text-xs text-stone-500">{dest.basecamp.logic}</p>
              <p className="mt-1 text-xs italic text-stone-500">{dest.basecamp.vibe}</p>
            </div>

            <div className="rounded-2xl bg-white p-4" style={{ border: `1.5px solid ${ACCENTS.blush.border}` }}>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold" style={{ backgroundColor: ACCENTS.blush.hex, color: ACCENTS.blush.text }}>
                  <Sun size={12} strokeWidth={3} /> LV.4
                </span>
                <h4 className="text-sm font-extrabold text-stone-700">{dest.deepDive.level4.title}</h4>
              </div>
              <ul className="mt-3 space-y-2">
                {dest.deepDive.level4.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-600"><span className="mt-0.5">✨</span><span>{it}</span></li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-white p-4" style={{ border: `1.5px solid ${ACCENTS.winter.border}` }}>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold" style={{ backgroundColor: ACCENTS.winter.hex, color: ACCENTS.winter.text }}>
                  <Moon size={12} strokeWidth={3} /> LV.2
                </span>
                <h4 className="text-sm font-extrabold text-stone-700">{dest.deepDive.level2.title}</h4>
              </div>
              <ul className="mt-3 space-y-2">
                {dest.deepDive.level2.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-600"><span className="mt-0.5">🧸</span><span>{it}</span></li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl p-4" style={{ backgroundColor: ACCENTS.mint.soft, border: `1.5px solid ${ACCENTS.mint.border}` }}>
                <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ color: ACCENTS.mint.text }}>
                  <Utensils size={13} strokeWidth={2.8} /> Food Targets
                </p>
                <ul className="mt-2 space-y-1.5">
                  {dest.food.map((f, i) => (<li key={i} className="flex gap-1.5 text-xs text-stone-600"><span>🍱</span><span>{f}</span></li>))}
                </ul>
              </div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: ACCENTS.blush.soft, border: `1.5px solid ${ACCENTS.blush.border}` }}>
                <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ color: ACCENTS.blush.text }}>
                  <Sparkles size={13} strokeWidth={2.8} /> Cute IP Radius
                </p>
                <ul className="mt-2 space-y-1.5">
                  {dest.cuteIP.map((c, i) => (<li key={i} className="flex gap-1.5 text-xs text-stone-600"><span>🦦</span><span>{c}</span></li>))}
                </ul>
              </div>
            </div>
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

export default function App() {
  const [votes, setVotes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // merge to guard against added/removed destinations
        const base = emptyVotes();
        for (const id of Object.keys(base)) {
          if (parsed[id]) base[id] = { max: parsed[id].max || 0, partner: parsed[id].partner || 0 };
        }
        return base;
      }
    } catch (e) {
      /* ignore corrupt storage */
    }
    return emptyVotes();
  });
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
    } catch (e) {
      /* storage unavailable — fine */
    }
  }, [votes]);

  const handleVote = (id, who) =>
    setVotes((v) => ({ ...v, [id]: { ...v[id], [who]: v[id][who] + 1 } }));

  const handleToggle = (id) => setOpenId((cur) => (cur === id ? null : id));

  const resetVotes = () => setVotes(emptyVotes());

  const totals = useMemo(() => {
    const out = {};
    let sum = 0;
    for (const d of DESTINATIONS) {
      const t = votes[d.id].max + votes[d.id].partner;
      out[d.id] = t;
      sum += t;
    }
    return { out, sum };
  }, [votes]);

  const leader = useMemo(() => {
    if (totals.sum === 0) return null;
    const topId = Object.entries(totals.out).sort((a, b) => b[1] - a[1])[0][0];
    return DESTINATIONS.find((d) => d.id === topId);
  }, [totals]);

  // both partners agree = both have this as their personal max
  const consensus = useMemo(() => {
    if (totals.sum === 0) return null;
    const topFor = (who) =>
      [...DESTINATIONS].sort((a, b) => votes[b.id][who] - votes[a.id][who])[0];
    const maxTop = topFor("max");
    const partnerTop = topFor("partner");
    if (votes[maxTop.id].max > 0 && maxTop.id === partnerTop.id) return maxTop;
    return null;
  }, [votes, totals]);

  return (
    <div
      className="min-h-screen w-full font-sans text-stone-800"
      style={{
        backgroundColor: "#FFFDF9",
        backgroundImage:
          "radial-gradient(circle at 12% 18%, #FFEFE8 0, transparent 38%), radial-gradient(circle at 88% 12%, #E6F4FA 0, transparent 36%), radial-gradient(circle at 78% 82%, #E9F8EF 0, transparent 40%), radial-gradient(circle at 22% 88%, #FFF4DA 0, transparent 38%)",
      }}
    >
      <div className="pointer-events-none fixed inset-0 opacity-[0.5]" style={{ backgroundImage: "radial-gradient(#EFE7DA 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        {/* Header */}
        <header className="animate-float-in text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border-2 border-rose-100 bg-white/80 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-rose-400 shadow-sm backdrop-blur">
            <Calendar size={13} strokeWidth={3} />
            Nov 27 – Dec 4
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-stone-800 sm:text-6xl">
            Max <span className="text-rose-300">♥</span> Partner
          </h1>
          <p className="mt-2 text-lg font-bold text-stone-500 sm:text-xl">Year-End Trip Planning Hub <span className="align-middle">🧳✨</span></p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-stone-400">
            Five cozy-winter contenders, tailored to early sunsets, raw-seafood runs and cute-character hauls. Each of you hearts your favorites — votes save automatically.
          </p>
        </header>

        {/* Recommendation banner */}
        <div className="mx-auto mt-8 max-w-3xl animate-float-in rounded-3xl border-2 border-amber-100 bg-white/85 p-5 shadow-sm backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-500">
              <Trophy size={20} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-black text-stone-700">Claude's recommendation</p>
              <p className="mt-1 text-sm text-stone-500">
                <span className="font-extrabold text-stone-700">🧸 Seoul</span> is the best all-rounder — biting cold with possible flurries, on-budget on full-service Korean Air, elite raw seafood + character flagships, and the latest usable daylight (5:15 PM). If budget can stretch and falling snow is the whole point,{" "}
                <span className="font-extrabold text-stone-700">❄️ Sapporo</span> is the more unforgettable snow-globe trip.
              </p>
            </div>
          </div>
        </div>

        {/* Live tally bar */}
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border-2 border-rose-100 bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur">
            <Heart size={18} strokeWidth={2.6} className="text-rose-300" fill="#FFDFD3" />
            <span className="text-sm font-extrabold text-stone-600">{totals.sum} total hearts</span>
          </div>
          <div
            className="flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 shadow-sm backdrop-blur"
            style={{ borderColor: leader ? leader.accent.border : "#E7E1D8", backgroundColor: leader ? leader.accent.soft : "rgba(255,255,255,0.85)" }}
          >
            <Trophy size={18} strokeWidth={2.6} style={{ color: leader ? leader.accent.text : "#B8AE9E" }} />
            <span className="text-sm font-extrabold text-stone-600">
              {leader ? <>Leader: {leader.emoji} {leader.name}</> : "Tap a heart to start voting"}
            </span>
          </div>
          {consensus && (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-2.5 shadow-sm backdrop-blur">
              <span className="text-base">💞</span>
              <span className="text-sm font-extrabold text-rose-500">You both agree: {consensus.emoji} {consensus.name}</span>
            </div>
          )}
          {totals.sum > 0 && (
            <button onClick={resetVotes} className="flex items-center gap-1.5 rounded-2xl border-2 border-stone-200 bg-white/85 px-4 py-2.5 text-sm font-extrabold text-stone-400 shadow-sm backdrop-blur transition-colors hover:text-stone-600">
              <RotateCcw size={15} strokeWidth={2.6} /> Reset
            </button>
          )}
        </div>

        {/* Accent legend */}
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-2">
          {[
            { a: ACCENTS.winter, t: "Freezing · snow · early dark" },
            { a: ACCENTS.blush, t: "Cute IP · character shops · photo spots" },
            { a: ACCENTS.mint, t: "Budget wins · flight savings" },
          ].map((l) => (
            <span key={l.a.name} className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-stone-500 backdrop-blur" style={{ border: `1.5px solid ${l.a.border}` }}>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: l.a.hex, border: `1px solid ${l.a.border}` }} />
              {l.t}
            </span>
          ))}
        </div>

        {/* Cards grid */}
        <main className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {DESTINATIONS.map((dest) => (
            <div key={dest.id} className={openId === dest.id ? "lg:col-span-2" : ""}>
              <PassportCard dest={dest} votes={votes[dest.id]} onVote={handleVote} isOpen={openId === dest.id} onToggle={handleToggle} />
            </div>
          ))}
        </main>

        {/* Comparison snapshot */}
        <section className="mt-12">
          <h2 className="flex items-center justify-center gap-2 text-center text-xl font-black text-stone-700">
            <Star size={18} strokeWidth={2.8} className="text-amber-300" fill="#FFE9B0" />
            Quick Comparison Snapshot
          </h2>
          <div className="mt-5 overflow-x-auto rounded-3xl border-2 border-stone-100 bg-white/85 shadow-sm backdrop-blur">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-stone-400">
                  <th className="px-5 py-4 font-extrabold">Destination</th>
                  <th className="px-4 py-4 font-extrabold">Flight</th>
                  <th className="px-4 py-4 font-extrabold">Weather</th>
                  <th className="px-4 py-4 font-extrabold">Sunset</th>
                  <th className="px-4 py-4 font-extrabold">Stay</th>
                  <th className="px-4 py-4 font-extrabold">Max</th>
                  <th className="px-4 py-4 font-extrabold">Partner</th>
                </tr>
              </thead>
              <tbody>
                {DESTINATIONS.map((d) => (
                  <tr key={d.id} className="border-t border-stone-100 transition-colors hover:bg-stone-50/60">
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2 font-extrabold text-stone-700"><span className="text-lg">{d.emoji}</span> {d.name}</span>
                      <span className="text-xs text-stone-400">{d.region}</span>
                    </td>
                    <td className="px-4 py-4"><Pill accent={BUDGET_TONE[d.flight.budget].chip} soft={false}>{d.flight.price}</Pill></td>
                    <td className="px-4 py-4 font-semibold text-stone-600">{d.weather.range}</td>
                    <td className="px-4 py-4 font-semibold text-stone-600">{d.sunset}</td>
                    <td className="px-4 py-4 font-semibold text-stone-600">{d.basecamp.price}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ backgroundColor: d.accent.soft, color: d.accent.text }}>
                        <Heart size={11} strokeWidth={3} fill={d.accent.hex} /> {votes[d.id].max}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ backgroundColor: d.accent.soft, color: d.accent.text }}>
                        <Heart size={11} strokeWidth={3} fill={d.accent.hex} /> {votes[d.id].partner}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-12 text-center text-xs text-stone-400">
          <p className="font-semibold">Made with ❄️ 🍱 🦦 🧸 ✨ for a very specific kind of cozy winter trip.</p>
          <p className="mt-1">Prices in SGD per pax · planning weather &amp; sunset for late Nov / early Dec · live temps via Open-Meteo.</p>
        </footer>
      </div>
    </div>
  );
}
