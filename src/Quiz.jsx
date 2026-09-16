import React, { useState } from "react";

/**
 * "What kind of Seoul day are you?" — a cozy get-well personality quiz.
 * Pure client-side (instant, no network) so it's smooth for a resting patient.
 * The result maps to an activity archetype, gives tappable "go hunt for these"
 * Naver searches (+ a search-your-own box), and can save the vibe to the
 * concierge's tastes. Built for Ants, recovering from wisdom-tooth surgery. 🦷💛
 */

const naver = (q) => `https://map.naver.com/p/search/${encodeURIComponent(q + " Seoul")}`;

const RESULTS = {
  food: { emoji: "🍜", name: "Food Demolisher", blurb: "you did NOT fly to Seoul to look at scenery. you came to EAT. every meal is a mission and the snacks between meals are also meals.", add: "food alleys, markets, must-eat spots", vibe: "food-first — we're here to eat everything", searches: ["korean bbq jongno", "michelin bib gourmand", "24hr gukbap", "hotteok street food"] },
  cafe: { emoji: "☕", name: "Café Goblin", blurb: "slow mornings, aesthetic corners, 4 cafés a day and zero regrets. you'd trade a whole landmark for one really good latte.", add: "cozy cafés, dessert spots, hanok teahouses", vibe: "cozy aesthetic cafés + slow mornings", searches: ["dessert cafe ikseondong", "hanok teahouse bukchon", "rooftop cafe", "vinyl listening cafe"] },
  hanok: { emoji: "🏯", name: "Hanok Romantic", blurb: "you want the pretty, the traditional, the golden-hour hanbok photo. it's a date, not a tour.", add: "hanok villages, palaces, teahouses, viewpoints", vibe: "romantic hanok + pretty traditional spots", searches: ["hanbok rental gyeongbokgung", "hanok stay bukchon", "palace night tour", "traditional teahouse insadong"] },
  nature: { emoji: "🌳", name: "Nature Softie", blurb: "you need to touch grass. calm walks, quiet valleys, cold air, no crowds — just vibes.", add: "parks, forest walks, valleys, viewpoints", vibe: "calm nature walks, quiet + uncrowded", searches: ["seoul forest", "bukhansan easy trail", "naksan park sunset", "quiet valley walk"] },
  market: { emoji: "🛍️", name: "Market Gremlin", blurb: "flea markets, hidden treasures, street snacks eaten standing up. you hunt for the good stuff.", add: "markets, flea markets, shopping streets, street food", vibe: "markets + treasure-hunting + street food", searches: ["dongdaemun vintage clothing", "seoul folk flea market", "hongdae thrift shop", "record shops"] },
  chaos: { emoji: "🎢", name: "Chaos Explorer", blurb: "no plan IS the plan. animal cafés, weird museums, whatever's cursed and random. knnccb let's just go.", add: "animal cafés, quirky spots, random adventures", vibe: "chaos — quirky + random adventures", searches: ["animal cafe", "weird museum seoul", "themed cafe hongdae", "meerkat cafe"] },
};

const QUESTIONS = [
  { q: "you're stuck on soft foods rn 🦷 — which one you actually WANT?", opts: [
    { t: "죽 (warm rice porridge), cozy n gentle", k: "nature" },
    { t: "계란찜 steamed egg, pure comfort", k: "hanok" },
    { t: "ice cream. i earned it. i had SURGERY.", k: "chaos" },
    { t: "soup dumpling smuggled through the gap", k: "food" },
  ] },
  { q: "ideal Seoul morning looks like…", opts: [
    { t: "sleep till noon then brunch café ☕", k: "cafe" },
    { t: "up early, hanok alley walk before the crowds", k: "hanok" },
    { t: "market for breakfast, eating standing up", k: "market" },
    { t: "surprise me, i made no plan", k: "chaos" },
  ] },
  { q: "free afternoon. you pick:", opts: [
    { t: "forest / valley walk, touch grass", k: "nature" },
    { t: "4 cafés in a row for the aesthetic", k: "cafe" },
    { t: "eat our way down a food alley", k: "food" },
    { t: "animal café + something weird", k: "chaos" },
  ] },
  { q: "the photo you MUST come home with:", opts: [
    { t: "us dressed up at a hanok 🏯", k: "hanok" },
    { t: "the latte art / perfect café corner", k: "cafe" },
    { t: "a MOUNTAIN of food", k: "food" },
    { t: "vintage treasure i found at a market", k: "market" },
  ] },
  { q: "money mood for this trip:", opts: [
    { t: "treat ourselves, it's worth it", k: "food" },
    { t: "cheap n cheerful, street snacks", k: "market" },
    { t: "free stuff — walks, views, parks", k: "nature" },
    { t: "knnccb who's counting", k: "chaos" },
  ] },
  { q: "energy level you're bringing:", opts: [
    { t: "gentle n cozy, no rushing", k: "cafe" },
    { t: "packed, see EVERYTHING", k: "food" },
    { t: "romantic n slow, just us two", k: "hanok" },
    { t: "chaos, wherever the wind blows", k: "chaos" },
  ] },
];

export default function SeoulQuiz({ onClose, onSaveVibe }) {
  const [i, setI] = useState(-1); // -1 intro · 0..n-1 questions · n result
  const [tally, setTally] = useState({});
  const [saved, setSaved] = useState(false);
  const [custom, setCustom] = useState("");

  const pick = (k) => { setTally((t) => ({ ...t, [k]: (t[k] || 0) + 1 })); setI((x) => x + 1); };
  const restart = () => { setTally({}); setI(-1); setSaved(false); setCustom(""); };

  const result = (() => {
    const keys = Object.keys(RESULTS);
    let best = keys[0], bestN = -1;
    for (const k of keys) { const n = tally[k] || 0; if (n > bestN) { bestN = n; best = k; } }
    return RESULTS[best];
  })();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border-2 border-violet-100 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {i === -1 && (
          <div className="text-center">
            <div className="text-5xl">🦷💛</div>
            <h2 className="mt-3 text-xl font-black text-stone-700">feel better, Ants</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">wisdom teeth gone, ouchie. while you rest, take this dumb little quiz — it figures out <b>what kind of Seoul day you are</b> so we know what to plan (and gives you stuff to browse in bed). 6 taps, no thinking required. 💛</p>
            <button onClick={() => setI(0)} className="mt-5 w-full rounded-2xl px-5 py-3 text-sm font-black text-white transition-transform hover:scale-[1.02] active:scale-95" style={{ background: "linear-gradient(135deg,#f472b6,#a78bfa)" }}>start the quiz →</button>
            <button onClick={onClose} className="mt-2 text-xs font-bold text-stone-400 hover:text-stone-600">maybe later</button>
          </div>
        )}

        {i >= 0 && i < QUESTIONS.length && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${((i + 1) / QUESTIONS.length) * 100}%`, background: "linear-gradient(135deg,#f472b6,#a78bfa)" }} />
              </div>
              <span className="text-xs font-extrabold text-stone-400">{i + 1}/{QUESTIONS.length}</span>
            </div>
            <p className="text-base font-black leading-snug text-stone-700">{QUESTIONS[i].q}</p>
            <div className="mt-4 space-y-2">
              {QUESTIONS[i].opts.map((o, j) => (
                <button key={j} onClick={() => pick(o.k)} className="flex w-full items-center rounded-2xl border-2 border-stone-200 bg-white px-4 py-3 text-left text-sm font-bold text-stone-700 transition-colors hover:border-violet-300 hover:bg-violet-50">{o.t}</button>
              ))}
            </div>
            {i > 0 && <button onClick={() => setI(i - 1)} className="mt-3 text-xs font-bold text-stone-400 hover:text-stone-600">← back</button>}
          </div>
        )}

        {i >= QUESTIONS.length && (
          <div className="text-center">
            <div className="text-xs font-black uppercase tracking-wide text-violet-400">you are a…</div>
            <div className="mt-2 text-5xl">{result.emoji}</div>
            <h2 className="mt-2 text-2xl font-black text-stone-800">{result.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">{result.blurb}</p>

            <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/60 p-3 text-left">
              <p className="text-xs font-black text-violet-700">🔎 go hunt for these (opens Naver):</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.searches.map((s, k) => (
                  <a key={k} href={naver(s)} target="_blank" rel="noreferrer" className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 transition-colors hover:border-emerald-300 hover:text-emerald-600">{s} ↗</a>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); if (custom.trim()) window.open(naver(custom.trim()), "_blank"); }} className="mt-2.5 flex gap-1.5">
                <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="or search your own thing…" className="min-w-0 flex-1 rounded-lg border-2 border-stone-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-violet-300" />
                <button type="submit" disabled={!custom.trim()} className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#f472b6,#a78bfa)" }}>🔎</button>
              </form>
            </div>

            {onSaveVibe && (
              <button onClick={() => { onSaveVibe(result.vibe); setSaved(true); }} disabled={saved} className="mt-4 w-full rounded-2xl px-5 py-3 text-sm font-black text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-70" style={{ background: saved ? "#34C759" : "linear-gradient(135deg,#f472b6,#a78bfa)" }}>
                {saved ? "✓ saved — the concierge plans around it now" : "💾 save this vibe (concierge will use it)"}
              </button>
            )}
            <div className="mt-3 flex justify-center gap-4">
              <button onClick={restart} className="text-xs font-bold text-stone-400 hover:text-stone-600">🔁 retake</button>
              <button onClick={onClose} className="text-xs font-bold text-stone-400 hover:text-stone-600">done 💛</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
