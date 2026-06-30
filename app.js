import React, { useState, useMemo } from "react";
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
} from "lucide-react";

/**
 * Max & Partner — Year-End Trip Planning Hub
 * Nov 27 – Dec 4
 *
 * Single-file, production-ready interactive React component.
 * Soft-Kawaii "Travel Passport" aesthetic with a live Heart Tracker
 * voting engine and a sliding deep-dive itinerary drawer per destination.
 */

// ---------------------------------------------------------------------------
// Pastel accent system
// ---------------------------------------------------------------------------
const ACCENTS = {
  winter: {
    name: "Powder Winter Blue",
    hex: "#B9DAE7",
    soft: "#EAF5FA",
    border: "#9CCBDD",
    text: "#3D6B7D",
  },
  blush: {
    name: "Soft Blush Pink",
    hex: "#FFDFD3",
    soft: "#FFF3EE",
    border: "#F6C3B2",
    text: "#A65A45",
  },
  mint: {
    name: "Minty Pastel Green",
    hex: "#C5EBD5",
    soft: "#EDFAF2",
    border: "#A2DCBA",
    text: "#3F7C5C",
  },
};

// Budget verdict styling
const BUDGET_TONE = {
  under: { label: "Well Under Budget", emoji: "🌿", chip: ACCENTS.mint },
  target: { label: "On Budget Target", emoji: "✅", chip: ACCENTS.mint },
  onbudget: { label: "On Budget", emoji: "🟢", chip: ACCENTS.mint },
  slightly: { label: "Slightly Over", emoji: "🟡", chip: ACCENTS.blush },
  over: { label: "Over Budget", emoji: "🔴", chip: ACCENTS.blush },
};

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
    flight: {
      price: "S$1,000+",
      per: "per pax",
      carrier: "Various",
      budget: "over",
      note: "Premium for peak deep-winter Hokkaido demand.",
    },
    weather: {
      range: "-1°C to 6°C",
      label: "Freezing",
      snow: "High snow accumulation probability",
      snowIcon: true,
    },
    sunset: "4:00 PM",
    sunsetNote: "Elite early dark cozy-night vibe",
    basecamp: {
      station: "Nakajima Koen Station",
      logic: "1 stop on Namboku Subway Line to Odori Park",
      vibe: "Local food lanes, quiet park-side calm",
      price: "S$90–S$110 / night",
    },
    food: [
      "Nijo Market — massive raw uni & giant botan shrimp",
      "Sankaku Market — fresh ikura kaisendon bowls",
    ],
    cuteIP: [
      "Sapporo PARCO — Mofusand Store",
      "JR Stellar Place — Pokémon Center",
    ],
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
    flight: {
      price: "S$768",
      per: "per pax",
      carrier: "Korean Air (full-service)",
      budget: "target",
      note: "Full-service comfort right on the budget line.",
    },
    weather: {
      range: "-2°C to 7°C",
      label: "Biting Cold",
      snow: "Crisp clear winds, potential early flurries",
      snowIcon: true,
    },
    sunset: "5:15 PM",
    sunsetNote: "Golden-hour over the Han River",
    basecamp: {
      station: "Hapjeong Station",
      logic: "1 stop on Line 2 from the main Hongdae chaos",
      vibe: "Calm neighborhood, easy late-night returns",
      price: "S$80–S$100 / night",
    },
    food: [
      "Noryangjin Fish Market — live moving octopus & sashimi",
      "Ganjang Gejang — raw soy-marinated crab",
    ],
    cuteIP: [
      "Hongdae indie illustration studios",
      "Flagship Kakao Friends & Line Friends Square",
    ],
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
    flight: {
      price: "S$948",
      per: "per pax",
      carrier: "ZIPAIR + baggage bundle",
      budget: "slightly",
      note: "Low-cost base fare, nudged up by the baggage bundle.",
    },
    weather: {
      range: "6°C to 13°C",
      label: "Brisk Winter Jacket",
      snow: "Zero snow chance",
      snowIcon: false,
    },
    sunset: "4:30 PM",
    sunsetNote: "City flips into winter illuminations early",
    basecamp: {
      station: "Koenji Station",
      logic: "2 stops on JR Chuo Line from Shinjuku",
      vibe: "Retro indoor izakaya shotengai alleys",
      price: "S$100–S$120 / night",
    },
    food: [
      "Shinjuku & Koenji bistros — Basashi raw horse sashimi & yakiniku",
      "Premium beef tartare counters",
    ],
    cuteIP: [
      "Tokyo Character Street — Chiikawa Land & Mofusand Mofumofu",
      "Shibuya Mega Pokémon Center · Nintendo Tokyo",
    ],
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
    flight: {
      price: "S$500",
      per: "per pax",
      carrier: "STARLUX / China Airlines",
      budget: "under",
      note: "The clear financial win of the shortlist.",
    },
    weather: {
      range: "15°C to 20°C",
      label: "Cool & mild",
      snow: "Needs a Cingjing / Alishan mountain day for sub-10°C cold",
      snowIcon: false,
    },
    sunset: "5:05 PM",
    sunsetNote: "Soft warm evenings, lightest jacket of the lot",
    basecamp: {
      station: "Shuanglian Station",
      logic: "1 stop on Red Line to Taipei Main",
      vibe: "Right next to Ningxia Night Market food rows",
      price: "S$70–S$90 / night",
    },
    food: [
      "Ningxia Night Market — hotpot & rich braised pork platters",
      "Raohe Night Market — full street-food run",
    ],
    cuteIP: [
      "Huashan 1914 Creative Park — animation pop-ups",
      "Indie character merchandise stalls",
    ],
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
    flight: {
      price: "S$530–S$630",
      per: "per pax",
      carrier: "Budget via Hanoi / Manila",
      budget: "onbudget",
      note: "Cheap fare, but high-friction 8–15h layovers.",
    },
    weather: {
      range: "7°C to 14°C",
      label: "Chilly & coastal",
      snow: "Clear brisk walking skies, no snow",
      snowIcon: false,
    },
    sunset: "5:00 PM",
    sunsetNote: "Riverside lights along the Naka River",
    basecamp: {
      station: "Gion Station",
      logic: "1 stop to Hakata Main Station",
      vibe: "Local neighborhood feel, walkable to Canal City",
      price: "S$80–S$100 / night",
    },
    food: [
      "Hakata Motsunabe — savory beef offal hotpot",
      "Nakasu Yatai — open-air riverside street stalls",
    ],
    cuteIP: [
      "Canal City Hakata — capsule halls & official Sanrio",
      "Fukuoka PARCO — Mofusand Store",
    ],
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

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------
function Pill({ children, accent, soft = true }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold leading-none"
      style={{
        backgroundColor: soft ? accent.soft : accent.hex,
        color: accent.text,
        border: `1.5px solid ${accent.border}`,
      }}
    >
      {children}
    </span>
  );
}

function StatRow({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: accent.soft, color: accent.text }}
      >
        <Icon size={16} strokeWidth={2.4} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
          {label}
        </p>
        <p className="text-sm font-semibold text-stone-700">{value}</p>
      </div>
    </div>
  );
}

function CozyMeter({ score, accent }) {
  return (
    <div className="flex items-center gap-1" title={`Cozy-night score: ${score}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Moon
          key={n}
          size={14}
          strokeWidth={2.4}
          style={{
            color: n <= score ? accent.text : "#E7E1D8",
            fill: n <= score ? accent.hex : "transparent",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Destination "Passport" card
// ---------------------------------------------------------------------------
function PassportCard({ dest, votes, onVote, isOpen, onToggle }) {
  const accent = dest.accent;
  const budget = BUDGET_TONE[dest.flight.budget];
  const [bump, setBump] = useState(false);

  const handleVote = (e) => {
    e.stopPropagation();
    setBump(true);
    setTimeout(() => setBump(false), 280);
    onVote(dest.id);
  };

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white/90 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ border: `2px solid ${accent.border}` }}
    >
      {/* Passport top stripe */}
      <div
        className="flex items-center justify-between px-5 pt-4"
        style={{ color: accent.text }}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
          ✦ Travel Passport
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
          No. {String(DESTINATIONS.indexOf(dest) + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Header */}
      <div className="px-5 pb-4 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-3xl leading-none">{dest.emoji}</span>
              <h3 className="truncate text-2xl font-extrabold tracking-tight text-stone-800">
                {dest.name}
              </h3>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-stone-400">
              <MapPin size={12} strokeWidth={2.6} />
              {dest.region}
            </p>
            <p className="mt-1 text-sm font-medium italic text-stone-500">
              "{dest.tagline}"
            </p>
          </div>

          {/* Heart tracker */}
          <button
            onClick={handleVote}
            className="flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ backgroundColor: accent.soft, border: `1.5px solid ${accent.border}` }}
            aria-label={`Heart ${dest.name}`}
          >
            <Heart
              size={22}
              strokeWidth={2.4}
              className={bump ? "scale-125" : "scale-100"}
              style={{
                color: accent.text,
                fill: votes > 0 ? accent.hex : "transparent",
                transition: "transform 0.28s cubic-bezier(.34,1.56,.64,1)",
              }}
            />
            <span className="text-sm font-extrabold tabular-nums" style={{ color: accent.text }}>
              {votes}
            </span>
          </button>
        </div>

        {/* Flight status pill */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill accent={budget.chip} soft={false}>
            <Plane size={12} strokeWidth={2.6} />
            {dest.flight.price} {dest.flight.per}
          </Pill>
          <Pill accent={budget.chip}>
            {budget.emoji} {budget.label}
          </Pill>
        </div>
        <p className="mt-2 pl-1 text-xs text-stone-400">
          {dest.flight.carrier} · {dest.flight.note}
        </p>
      </div>

      {/* Quick stats grid */}
      <div
        className="grid grid-cols-2 gap-4 px-5 py-4"
        style={{ backgroundColor: accent.soft + "80" }}
      >
        <StatRow
          icon={dest.weather.snowIcon ? CloudSnow : Thermometer}
          label="Weather"
          value={`${dest.weather.range}`}
          accent={accent}
        />
        <StatRow icon={Sunset} label="Sunset" value={dest.sunset} accent={accent} />
        <StatRow
          icon={Train}
          label="Basecamp"
          value={dest.basecamp.station}
          accent={accent}
        />
        <StatRow
          icon={Wallet}
          label="Stay / night"
          value={dest.basecamp.price}
          accent={accent}
        />
      </div>

      {/* Weather + sunset detail line */}
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

      {/* Cozy meter + expand */}
      <div className="mt-auto flex items-center justify-between gap-3 px-5 pb-5 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
            Cozy night
          </span>
          <CozyMeter score={dest.cozyScore} accent={accent} />
        </div>
        <button
          onClick={() => onToggle(dest.id)}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition-all duration-200 hover:scale-[1.03] active:scale-95"
          style={{
            backgroundColor: accent.hex,
            color: accent.text,
            border: `1.5px solid ${accent.border}`,
          }}
        >
          {isOpen ? "Hide itinerary" : "Open deep-dive"}
          <ChevronDown
            size={15}
            strokeWidth={3}
            className="transition-transform duration-300"
            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      </div>

      {/* ----- Sliding deep-dive drawer ----- */}
      <div
        className="grid transition-all duration-500 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div
            className="space-y-4 px-5 pb-6 pt-1"
            style={{ borderTop: `2px dashed ${accent.border}` }}
          >
            {/* Basecamp logic */}
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: accent.soft, border: `1.5px solid ${accent.border}` }}
            >
              <p
                className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide"
                style={{ color: accent.text }}
              >
                <Train size={14} strokeWidth={2.8} /> The "Temma-Station" Basecamp
              </p>
              <p className="mt-1 text-sm font-bold text-stone-700">
                {dest.basecamp.station}
              </p>
              <p className="text-xs text-stone-500">{dest.basecamp.logic}</p>
              <p className="mt-1 text-xs italic text-stone-500">{dest.basecamp.vibe}</p>
            </div>

            {/* Level 4 */}
            <div className="rounded-2xl bg-white p-4" style={{ border: `1.5px solid ${ACCENTS.blush.border}` }}>
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold"
                  style={{ backgroundColor: ACCENTS.blush.hex, color: ACCENTS.blush.text }}
                >
                  <Sun size={12} strokeWidth={3} /> LV.4
                </span>
                <h4 className="text-sm font-extrabold text-stone-700">
                  {dest.deepDive.level4.title}
                </h4>
              </div>
              <ul className="mt-3 space-y-2">
                {dest.deepDive.level4.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-600">
                    <span className="mt-0.5">✨</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Level 2 */}
            <div className="rounded-2xl bg-white p-4" style={{ border: `1.5px solid ${ACCENTS.winter.border}` }}>
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold"
                  style={{ backgroundColor: ACCENTS.winter.hex, color: ACCENTS.winter.text }}
                >
                  <Moon size={12} strokeWidth={3} /> LV.2
                </span>
                <h4 className="text-sm font-extrabold text-stone-700">
                  {dest.deepDive.level2.title}
                </h4>
              </div>
              <ul className="mt-3 space-y-2">
                {dest.deepDive.level2.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-600">
                    <span className="mt-0.5">🧸</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Food + IP */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl p-4" style={{ backgroundColor: ACCENTS.mint.soft, border: `1.5px solid ${ACCENTS.mint.border}` }}>
                <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ color: ACCENTS.mint.text }}>
                  <Utensils size={13} strokeWidth={2.8} /> Food Targets
                </p>
                <ul className="mt-2 space-y-1.5">
                  {dest.food.map((f, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-stone-600">
                      <span>🍱</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl p-4" style={{ backgroundColor: ACCENTS.blush.soft, border: `1.5px solid ${ACCENTS.blush.border}` }}>
                <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ color: ACCENTS.blush.text }}>
                  <Sparkles size={13} strokeWidth={2.8} /> Cute IP Radius
                </p>
                <ul className="mt-2 space-y-1.5">
                  {dest.cuteIP.map((c, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-stone-600">
                      <span>🦦</span>
                      <span>{c}</span>
                    </li>
                  ))}
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
export default function App() {
  const [votes, setVotes] = useState(
    DESTINATIONS.reduce((acc, d) => ({ ...acc, [d.id]: 0 }), {})
  );
  const [openId, setOpenId] = useState(null);

  const handleVote = (id) =>
    setVotes((v) => ({ ...v, [id]: v[id] + 1 }));

  const handleToggle = (id) => setOpenId((cur) => (cur === id ? null : id));

  const totalHearts = useMemo(
    () => Object.values(votes).reduce((a, b) => a + b, 0),
    [votes]
  );

  const leader = useMemo(() => {
    if (totalHearts === 0) return null;
    const topId = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    return DESTINATIONS.find((d) => d.id === topId);
  }, [votes, totalHearts]);

  return (
    <div
      className="min-h-screen w-full font-sans text-stone-800"
      style={{
        backgroundColor: "#FFFDF9",
        backgroundImage:
          "radial-gradient(circle at 12% 18%, #FFEFE8 0, transparent 38%), radial-gradient(circle at 88% 12%, #E6F4FA 0, transparent 36%), radial-gradient(circle at 78% 82%, #E9F8EF 0, transparent 40%), radial-gradient(circle at 22% 88%, #FFF4DA 0, transparent 38%)",
      }}
    >
      {/* soft dotted texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(#EFE7DA 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        {/* Header */}
        <header className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border-2 border-rose-100 bg-white/80 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-rose-400 shadow-sm backdrop-blur">
            <Calendar size={13} strokeWidth={3} />
            Nov 27 – Dec 4
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-stone-800 sm:text-6xl">
            Max <span className="text-rose-300">♥</span> Partner
          </h1>
          <p className="mt-2 text-lg font-bold text-stone-500 sm:text-xl">
            Year-End Trip Planning Hub <span className="align-middle">🧳✨</span>
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-stone-400">
            Five cozy-winter contenders, tailored to early sunsets, raw-seafood
            runs and cute-character hauls. Heart your favorites — the leader
            board updates live.
          </p>
        </header>

        {/* Live tally bar */}
        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border-2 border-rose-100 bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur">
            <Heart size={18} strokeWidth={2.6} className="text-rose-300" fill="#FFDFD3" />
            <span className="text-sm font-extrabold text-stone-600">
              {totalHearts} total hearts
            </span>
          </div>
          <div
            className="flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 shadow-sm backdrop-blur"
            style={{
              borderColor: leader ? leader.accent.border : "#E7E1D8",
              backgroundColor: leader ? leader.accent.soft : "rgba(255,255,255,0.85)",
            }}
          >
            <Trophy
              size={18}
              strokeWidth={2.6}
              style={{ color: leader ? leader.accent.text : "#B8AE9E" }}
            />
            <span className="text-sm font-extrabold text-stone-600">
              {leader ? (
                <>
                  Current leader: {leader.emoji} {leader.name}
                </>
              ) : (
                "Tap a heart to start voting"
              )}
            </span>
          </div>
        </div>

        {/* Accent legend */}
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-2">
          {[
            { a: ACCENTS.winter, t: "Freezing · snow · early dark" },
            { a: ACCENTS.blush, t: "Cute IP · character shops · photo spots" },
            { a: ACCENTS.mint, t: "Budget wins · flight savings" },
          ].map((l) => (
            <span
              key={l.a.name}
              className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-stone-500 backdrop-blur"
              style={{ border: `1.5px solid ${l.a.border}` }}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: l.a.hex, border: `1px solid ${l.a.border}` }}
              />
              {l.t}
            </span>
          ))}
        </div>

        {/* Cards grid */}
        <main className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {DESTINATIONS.map((dest) => (
            <div key={dest.id} className={openId === dest.id ? "lg:col-span-2" : ""}>
              <PassportCard
                dest={dest}
                votes={votes[dest.id]}
                onVote={handleVote}
                isOpen={openId === dest.id}
                onToggle={handleToggle}
              />
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
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-stone-400">
                  <th className="px-5 py-4 font-extrabold">Destination</th>
                  <th className="px-4 py-4 font-extrabold">Flight</th>
                  <th className="px-4 py-4 font-extrabold">Weather</th>
                  <th className="px-4 py-4 font-extrabold">Sunset</th>
                  <th className="px-4 py-4 font-extrabold">Stay</th>
                  <th className="px-4 py-4 font-extrabold">♥</th>
                </tr>
              </thead>
              <tbody>
                {DESTINATIONS.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t border-stone-100 transition-colors hover:bg-stone-50/60"
                  >
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2 font-extrabold text-stone-700">
                        <span className="text-lg">{d.emoji}</span> {d.name}
                      </span>
                      <span className="text-xs text-stone-400">{d.region}</span>
                    </td>
                    <td className="px-4 py-4">
                      <Pill accent={BUDGET_TONE[d.flight.budget].chip} soft={false}>
                        {d.flight.price}
                      </Pill>
                    </td>
                    <td className="px-4 py-4 font-semibold text-stone-600">
                      {d.weather.range}
                    </td>
                    <td className="px-4 py-4 font-semibold text-stone-600">{d.sunset}</td>
                    <td className="px-4 py-4 font-semibold text-stone-600">
                      {d.basecamp.price}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold"
                        style={{ backgroundColor: d.accent.soft, color: d.accent.text }}
                      >
                        <Heart size={11} strokeWidth={3} fill={d.accent.hex} /> {votes[d.id]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-stone-400">
          <p className="font-semibold">
            Made with ❄️ 🍱 🦦 🧸 ✨ for a very specific kind of cozy winter trip.
          </p>
          <p className="mt-1">
            Prices in SGD per pax · weather &amp; sunset for late Nov / early Dec.
          </p>
        </footer>
      </div>
    </div>
  );
}
