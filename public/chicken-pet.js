/* ============================================================================
   Rogue-lite Chicken Life Simulator — "Piu" (BitLife edition)
   Standalone sidebar widget. No framework, no dependencies.

   Life is ACTION-driven, not timed: every care action ages the chick 1 unit.
   - Growth: egg (hatch @5) → baby → little chicken → teen → adult (@20)
   - Every 10 actions: a narrative choice event (AI via /api/fate, local pool
     fallback). Choices can grant permanent TRAITS that change the sprite
     (face tat, gold tooth, mohawk) and how money flows in.
   - Every 20 actions as an adult: KFC CHASE minigame — mash RUN to escape.
     Caught → deep-fryer cutscene → next generation inherits a perk.
   - Reach age 100 → retirement → the cycle restarts with the dynasty ledger.
   - Click the chicken: reactions depend on age/job (young+jobless = happy,
     older = angrier… or derpier if its cluck is low).
   State persists in localStorage across refreshes and navigation.
============================================================================ */
(function () {
  "use strict";

  var SAVE_KEY = "cpet.save.v2";
  var MAX_AGE = 100;
  var EVENT_EVERY = 10;  // narrative choices
  var CHASE_EVERY = 20;  // KFC chase (adults only)

  // --------------------------------------------------------------------
  // Growth stages
  // --------------------------------------------------------------------
  function stageOf(age) {
    if (age < 5) return "egg";
    if (age < 10) return "baby";
    if (age < 15) return "chick";
    if (age < 20) return "teen";
    return "adult";
  }
  var STAGE_LABEL = { egg: "🥚 Egg", baby: "🐤 Baby", chick: "🐥 Little chicken", teen: "🐔 Teen", adult: "🐓 Adult" };

  // --------------------------------------------------------------------
  // Careers (teen+) — 4 tiers, XP + stat-gated promotions
  // --------------------------------------------------------------------
  var CAREERS = {
    corporate: { label: "Corporate", emoji: "💼", stat: "peck",
      tiers: ["Mailroom Chick", "Junior Pecker", "Middle Manager", "Chief Egg Officer"],
      xp: [0, 12, 30, 55], gate: [15, 30, 50, 70], perk: "Severance Package" },
    mystic: { label: "Mystic", emoji: "🔮", stat: "cluck",
      tiers: ["Novice Cluck", "Seer of Seeds", "Feathered Oracle", "Ascended Hen"],
      xp: [0, 12, 30, 55], gate: [15, 30, 50, 70], perk: "Third Eye" },
    underground: { label: "Underground", emoji: "🕶️", stat: "swagger",
      tiers: ["Lookout", "Coop Runner", "Yard Boss", "Kingpin of the Coop"],
      xp: [0, 12, 30, 55], gate: [15, 30, 50, 70], perk: "Street Smarts" },
    celeb: { label: "Celeb", emoji: "🌟", stat: "cluck",
      tiers: ["Open-Mic Chick", "Local Star", "Coopfluencer", "Megastar"],
      xp: [0, 15, 35, 60], gate: [20, 35, 55, 75], perk: "Stage Presence" },
    athlete: { label: "Athlete", emoji: "🏅", stat: "peck",
      tiers: ["Yard Jogger", "Sprint Chick", "Pro Pecker", "Golden Wing Champion"],
      xp: [0, 15, 35, 60], gate: [20, 35, 55, 75], perk: "Iron Beak" }
  };

  var PERKS = {
    "Severance Package": "hatch with +25 seeds",
    "Third Eye": "+1 to all training",
    "Street Smarts": "+2 swagger training",
    "Stage Presence": "+2 cluck training",
    "Iron Beak": "+2 peck training",
    "Hearty Yolk": "hatch with +20 vitality",
    "Fry-Proof Feathers": "KFC workers chase slower"
  };

  // Traits: permanent looks + money modifiers, granted by narrative choices
  var TRAITS = {
    facetat: { label: "Face Tat 💧", desc: "underground work pays +3, corporate pays -1" },
    goldtooth: { label: "Gold Tooth 🦷", desc: "+1 seed on every action" },
    mohawk: { label: "Pink Mohawk 🎸", desc: "strut training +2, celeb work pays +2" }
  };

  var NAMES = ["Piu", "Pio", "Nugget", "Mochi", "Cluckles", "Eggbert", "Pipi", "Butter", "Yolko", "Waddles"];
  var STAT_KEYS = ["vitality", "cluck", "swagger", "peck", "seeds"];

  // --------------------------------------------------------------------
  // Narrative events — strict JSON pool (AI endpoint mixes in fresh ones)
  // --------------------------------------------------------------------
  var EVENTS_JSON = JSON.stringify([
    { "id": "tattoo", "title": "Back-Alley Tattoo Pigeon", "text": "A pigeon with an ink-dipped feather sizes you up. \"Free canvas, huh.\"",
      "choices": [
        { "label": "Get the face tat", "req": { "swagger": 20 }, "fx": { "swagger": 8, "seeds": -5 }, "trait": "facetat", "out": "A tiny teardrop. Corporate recruiters wince; the yard nods." },
        { "label": "Gold tooth instead", "req": { "seeds": 15 }, "fx": { "seeds": -10, "swagger": 4 }, "trait": "goldtooth", "out": "Blinding smile. It literally attracts loose seeds." },
        { "label": "Walk away", "req": null, "fx": { "cluck": 2 }, "out": "You politely decline. Growth." } ] },
    { "id": "molt-salon", "title": "The Molt Salon", "text": "A hen with scissors for feathers offers a \"transformative look\".",
      "choices": [
        { "label": "PINK MOHAWK", "req": null, "fx": { "swagger": 6, "vitality": -2 }, "trait": "mohawk", "out": "Iconic. The yard will never recover." },
        { "label": "Just a trim", "req": null, "fx": { "vitality": 3 }, "out": "Fresh and aerodynamic. +3 vitality." } ] },
    { "id": "seed-scheme", "title": "A Seed Pyramid Scheme", "text": "\"Invest 10 seeds, get 30 back. Trust me,\" says a rooster in sunglasses.",
      "choices": [
        { "label": "Invest", "req": { "seeds": 10 }, "fx": { "seeds": -10, "cluck": 3 }, "out": "The rooster vanishes. Expensive lesson: +3 cluck." },
        { "label": "Report him", "req": null, "fx": { "swagger": 3, "seeds": 4 }, "out": "The yard thanks you with snacks. +4 seeds." },
        { "label": "Out-scheme him", "req": { "swagger": 40 }, "fx": { "seeds": 18 }, "out": "You sold HIM a scheme. +18 seeds." } ] },
    { "id": "gym", "title": "Worm-Lifting Gym Opens", "text": "Protein worms. Tiny dumbbells. A poster says NO PAIN NO GRAIN.",
      "choices": [
        { "label": "Train hard", "req": null, "fx": { "peck": 6, "vitality": -4 }, "out": "Beak gains. +6 peck." },
        { "label": "Just use the sauna", "req": null, "fx": { "vitality": 6 }, "out": "Steamed and serene. +6 vitality." } ] },
    { "id": "talent", "title": "Coop's Got Talent", "text": "A judging panel of three unimpressed ducks awaits your act.",
      "choices": [
        { "label": "Sing your heart out", "req": { "cluck": 25 }, "fx": { "cluck": 6, "seeds": 8 }, "out": "Standing ovation. The ducks wept. +8 seeds." },
        { "label": "Stage dive", "req": { "swagger": 30 }, "fx": { "swagger": 8, "vitality": -5 }, "out": "They caught you. Legend status." },
        { "label": "Heckle from the back", "req": null, "fx": { "swagger": 2 }, "out": "Cheap thrills. +2 swagger." } ] },
    { "id": "elder", "title": "The Elder Hen's Wisdom", "text": "She has seen ten thousand sunrises. She beckons you closer.",
      "choices": [
        { "label": "Listen for hours", "req": null, "fx": { "cluck": 5, "vitality": -2 }, "out": "Ancient coop knowledge. +5 cluck." },
        { "label": "Bring her seeds", "req": { "seeds": 8 }, "fx": { "seeds": -8, "vitality": 8 }, "out": "She blesses your feathers. +8 vitality." } ] }
  ]);

  function validChoice(c) {
    if (typeof c.label !== "string" || typeof c.out !== "string") return false;
    if (c.req !== null && c.req !== undefined && typeof c.req !== "object") return false;
    if (c.req) { for (var k in c.req) { if (STAT_KEYS.indexOf(k) < 0 || typeof c.req[k] !== "number") return false; } }
    if (typeof c.fx !== "object") return false;
    for (var f in c.fx) { if (STAT_KEYS.indexOf(f) < 0) return false; }
    if (c.trait && !TRAITS[c.trait]) return false;
    return true;
  }
  function validateEvent(ev) {
    if (!ev || typeof ev.title !== "string" || typeof ev.text !== "string") return false;
    if (!Array.isArray(ev.choices) || ev.choices.length < 2 || ev.choices.length > 3) return false;
    return ev.choices.every(validChoice);
  }
  var LOCAL_EVENTS = [];
  try { LOCAL_EVENTS = JSON.parse(EVENTS_JSON).filter(validateEvent); } catch (e) { console.error("[chicken-pet] event JSON invalid:", e); }

  // --------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------
  function freshStats(perks) {
    return {
      vitality: Math.min(100, 75 + (perks.indexOf("Hearty Yolk") >= 0 ? 20 : 0)),
      cluck: 10, swagger: 10, peck: 10,
      seeds: Math.min(100, 25 + (perks.indexOf("Severance Package") >= 0 ? 25 : 0))
    };
  }
  function defaultState() {
    return {
      v: 2, gen: 1, name: NAMES[0], alive: true, retired: false, collapsed: false,
      stats: freshStats([]), age: 0,
      career: null, // { path, tier, xp }
      perks: [], traits: [], ancestors: [], pendingEvent: null, deathCause: "",
      log: ["🥚 A warm egg appears… keep it warm to hatch Gen 1!"]
    };
  }
  var S = defaultState();
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw) { var parsed = JSON.parse(raw); if (parsed && parsed.v === 2 && parsed.stats) S = Object.assign(defaultState(), parsed); }
  } catch (e) { /* corrupt save → fresh egg */ }
  // self-heal: a fetch that never finished (tab closed mid-load) leaves a stuck
  // {loading:true} placeholder that would freeze the widget forever. Drop it.
  if (S.pendingEvent && S.pendingEvent.loading) S.pendingEvent = null;
  var chase = null;      // { progress, escape } — not persisted; a refresh forfeits the chase… cheeky but fair
  var cutscene = null;   // { start, done }
  var eventInFlight = false;

  // --- Joint chicken: raise the SAME chick together, synced in realtime -----
  var clientId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  var joint = false;         // true once Supabase sync is attached
  var applyingRemote = false; // suppress re-push while adopting a partner's update
  var pushTimer = null;
  // fields that are ambient/local-only (per-device) and shouldn't sync
  var LOCAL_ONLY = { collapsed: 1, log: 1 };

  function pushRemote() {
    if (!joint || !window.ChickenSync) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      var snap = {};
      for (var k in S) if (!LOCAL_ONLY[k]) snap[k] = S[k];
      // never sync a transient loading placeholder — a partner who adopts it
      // (or reloads) would be stuck on the spinner with no way to resolve it.
      if (snap.pendingEvent && snap.pendingEvent.loading) snap.pendingEvent = null;
      window.ChickenSync.save(snap, clientId);
    }, 350);
  }
  function adoptRemote(data) {
    if (!data || typeof data !== "object" || !data.stats) return;
    applyingRemote = true;
    for (var k in data) if (!LOCAL_ONLY[k]) S[k] = data[k];
    applyingRemote = false;
    // guard against ever adopting a stuck loading placeholder from a partner
    if (S.pendingEvent && S.pendingEvent.loading) S.pendingEvent = null;
    // a partner-driven fate/chase resets local-only overlays
    if (!S.pendingEvent) { /* keep local chase/cutscene as-is */ }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
    careerOpen = false;
    renderUI();
  }
  function initJoint() {
    if (!window.ChickenSync || !window.ChickenSync.hasSupabase) return;
    joint = true;
    window.ChickenSync.load().then(function (remote) {
      if (remote && remote.stats) adoptRemote(remote);
      else pushRemote(); // seed the shared chick with our local one
      window.ChickenSync.subscribe(clientId, function (data) { adoptRemote(data); });
    }).catch(function () {});
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
    if (joint && !applyingRemote) pushRemote();
  }
  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }
  function hasPerk(p) { return S.perks.indexOf(p) >= 0; }
  function hasTrait(t) { return S.traits.indexOf(t) >= 0; }
  function trainBonus(stat) {
    var b = hasPerk("Third Eye") ? 1 : 0;
    if (stat === "peck" && hasPerk("Iron Beak")) b += 2;
    if (stat === "cluck" && hasPerk("Stage Presence")) b += 2;
    if (stat === "swagger" && hasPerk("Street Smarts")) b += 2;
    if (stat === "swagger" && hasTrait("mohawk")) b += 2;
    return b;
  }
  function log(msg) { S.log.push(msg); if (S.log.length > 5) S.log.shift(); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }

  // --------------------------------------------------------------------
  // Reactions (click the chicken)
  // --------------------------------------------------------------------
  var reactType = null, reactUntil = 0;
  function now() { return performance.now() / 1000; }
  function react() {
    var st = stageOf(S.age);
    if (st === "egg") reactType = "wobble";
    else if (S.age < 15 && !S.career) reactType = "love";        // young + jobless: doesn't mind at all
    else if (S.age < 20) reactType = "meh";                       // teen: whatever
    else if (S.age >= 60) reactType = S.stats.cluck >= 40 ? "angry" : "derp"; // old: angry… or dumb
    else reactType = S.career ? "annoyed" : "love";
    reactUntil = now() + 1.4;
  }

  // --------------------------------------------------------------------
  // Engine — every action ages the chick by 1
  // --------------------------------------------------------------------
  function applyFx(fx) { for (var k in fx) S.stats[k] = clamp(S.stats[k] + fx[k]); }
  function meetsReq(req) { if (!req) return true; for (var k in req) { if (S.stats[k] < req[k]) return false; } return true; }

  function checkPromotion() {
    if (!S.career) return;
    var c = CAREERS[S.career.path];
    var next = S.career.tier + 1;
    if (next < c.tiers.length && S.career.xp >= c.xp[next] && S.stats[c.stat] >= c.gate[next]) {
      S.career.tier = next;
      log((next === c.tiers.length - 1 ? "🎉 " : "📈 ") + S.name + " promoted: " + c.tiers[next] + "!");
    }
  }

  function die(cause) {
    S.alive = false; S.retired = false; S.deathCause = cause;
    chase = null;
    log("💀 " + S.name + ": " + cause);
    save(); renderUI();
  }
  function retire() {
    S.alive = false; S.retired = true; S.deathCause = "lived a full 100 — free bird forever";
    log("🎖️ " + S.name + " retired at 100. A full life!");
    save(); renderUI();
  }

  function earnedPerk() {
    if (S.retired) return "Fry-Proof Feathers";
    if (S.career && S.career.tier >= 2) return CAREERS[S.career.path].perk;
    var best = "peck", bestV = -1;
    ["peck", "cluck", "swagger"].forEach(function (k) { if (S.stats[k] > bestV) { bestV = S.stats[k]; best = k; } });
    return best === "peck" ? "Iron Beak" : best === "cluck" ? "Stage Presence" : "Street Smarts";
  }

  function hatchNext() {
    var c = S.career ? CAREERS[S.career.path] : null;
    var perk = earnedPerk();
    S.ancestors.push({
      gen: S.gen, name: S.name, age: S.age,
      career: c ? c.label + " · " + c.tiers[S.career.tier] : "Free spirit",
      cause: S.deathCause, perk: perk
    });
    if (S.perks.indexOf(perk) < 0) S.perks.push(perk);
    S.gen += 1;
    S.name = NAMES[(S.gen - 1) % NAMES.length];
    S.stats = freshStats(S.perks);
    S.age = 0; S.career = null; S.alive = true; S.retired = false;
    S.traits = []; S.pendingEvent = null; S.deathCause = "";
    chase = null; cutscene = null;
    log("🥚 Gen " + S.gen + "'s egg is laid! Inherited perk: " + perk + ". Keep it warm!");
    save(); renderUI();
  }

  // One life-step after every action
  function step() {
    S.age += 1;
    var st = stageOf(S.age), prev = stageOf(S.age - 1);
    if (st !== prev) {
      react(); reactType = "love"; reactUntil = now() + 1.6;
      log(st === "baby" ? "🐣 CRACK! " + S.name + " hatched!" :
          st === "chick" ? "🐥 " + S.name + " grew into a little chicken!" :
          st === "teen" ? "🐔 " + S.name + " is a teen now. Careers unlocked!" :
          "🐓 " + S.name + " is FULLY GROWN. …KFC has been notified.");
    }
    if (st !== "egg") {
      if (S.age % 2 === 0) S.stats.vitality = clamp(S.stats.vitality - 1);
      if (S.age % 3 === 0) S.stats.seeds = clamp(S.stats.seeds - 1);
      if (S.stats.seeds <= 0) S.stats.vitality = clamp(S.stats.vitality - 1);
      if (hasTrait("goldtooth")) S.stats.seeds = clamp(S.stats.seeds + 1);
    }
    if (S.stats.vitality <= 0) { die("ran out of steam at " + S.age); return; }
    if (S.age >= MAX_AGE) { retire(); return; }
    if (st === "adult" && S.age % CHASE_EVERY === 0) { startChase(); return; }
    if (S.age % EVENT_EVERY === 0 && st !== "egg") { triggerEvent(); return; }
  }

  // Player actions ------------------------------------------------------
  function workIncome() {
    var c = CAREERS[S.career.path];
    var inc = 3 + S.career.tier;
    if (hasTrait("facetat")) inc += S.career.path === "underground" ? 3 : -1;
    if (hasTrait("mohawk") && S.career.path === "celeb") inc += 2;
    return Math.max(1, inc);
  }
  var ACTIONS = {
    warm: function () { log(["🔥 You keep the egg toasty…", "🔥 A faint tapping inside!", "🔥 It wiggles a little!"][S.age % 3]); return true; },
    feed: function () {
      if (S.stats.seeds < 4) { log("🌰 Not enough seeds to feed!"); return false; }
      S.stats.seeds = clamp(S.stats.seeds - 4); S.stats.vitality = clamp(S.stats.vitality + 15);
      react(); log("🌰 Nom nom. +15 vitality."); return true;
    },
    peck: function () { return train("peck", "⚡ Peck practice!"); },
    cluck: function () { return train("cluck", "🎵 Vocal warmups!"); },
    strut: function () { return train("swagger", "😎 Strut rehearsal!"); },
    work: function () {
      if (!S.career) { log("💼 No career yet — choose one first."); return false; }
      if (S.stats.vitality < 5) { log("😵 Too tired to work."); return false; }
      S.stats.vitality = clamp(S.stats.vitality - 3);
      S.career.xp += 2; S.stats.seeds = clamp(S.stats.seeds + workIncome());
      checkPromotion(); log(CAREERS[S.career.path].emoji + " Shift done. +" + workIncome() + " seeds.");
      return true;
    },
    nap: function () { S.stats.vitality = clamp(S.stats.vitality + 10); reactType = "nap"; reactUntil = now() + 1.6; log("😴 Power nap. +10 vitality."); return true; }
  };
  function train(stat, msg) {
    if (S.stats.vitality < 5) { log("😵 Too tired to train."); return false; }
    S.stats.vitality = clamp(S.stats.vitality - 3);
    S.stats[stat] = clamp(S.stats[stat] + 4 + trainBonus(stat));
    react(); log(msg + " +" + (4 + trainBonus(stat)) + " " + stat + ".");
    return true;
  }
  function doAction(name) {
    if (!S.alive || S.pendingEvent || chase || cutscene) return;
    var acted = ACTIONS[name]();
    if (acted) step();
    save(); renderUI();
  }

  function chooseCareer(path) {
    var c = CAREERS[path];
    if (S.stats[c.stat] < c.gate[0]) return;
    S.career = { path: path, tier: 0, xp: 0 };
    log(c.emoji + " Career started: " + c.tiers[0] + "!");
    careerOpen = false; save(); renderUI();
  }

  // Narrative events — AI first, local pool as fallback ----------------
  function triggerEvent() {
    if (S.pendingEvent || eventInFlight) return;
    S.pendingEvent = { loading: true };
    eventInFlight = true;
    renderUI();
    var c = S.career ? CAREERS[S.career.path] : null;
    var payload = {
      name: S.name, gen: S.gen, age: S.age, stage: stageOf(S.age),
      career: c ? c.label + " (" + c.tiers[S.career.tier] + ")" : null,
      traits: S.traits, stats: S.stats
    };
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : null;
    fetch("/api/fate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (ev) { setEvent(validateEvent(ev) ? ev : pickLocal()); })
      .catch(function () { setEvent(pickLocal()); })
      .then(function () { if (to) clearTimeout(to); eventInFlight = false; });
  }
  function pickLocal() { return LOCAL_EVENTS[Math.floor(Math.random() * LOCAL_EVENTS.length)]; }
  function setEvent(ev) {
    if (!S.alive) { S.pendingEvent = null; return; }
    S.pendingEvent = ev; react(); save(); renderUI();
  }
  function resolveEvent(idx) {
    var ev = S.pendingEvent;
    if (!ev || ev.loading) return;
    var ch = ev.choices[idx];
    if (!ch || !meetsReq(ch.req)) return;
    applyFx(ch.fx || {});
    if (ch.trait && TRAITS[ch.trait] && !hasTrait(ch.trait)) {
      S.traits.push(ch.trait);
      log("✨ New trait: " + TRAITS[ch.trait].label + " — " + TRAITS[ch.trait].desc + ".");
    }
    log("🔮 " + ch.out);
    S.pendingEvent = null;
    checkPromotion();
    if (S.stats.vitality <= 0) { die("fate caught up at " + S.age); return; }
    save(); renderUI();
  }

  // KFC chase minigame --------------------------------------------------
  function startChase() {
    chase = { progress: 0, escape: 0, last: now() };
    log("🚨 A KFC WORKER SPOTTED " + S.name.toUpperCase() + "!! MASH RUN!!");
    react(); reactType = "angry"; reactUntil = now() + 1;
    renderUI();
  }
  function chaseTap() {
    if (!chase) return;
    var boost = 8;
    if (S.stats.peck >= 50) boost += 2;
    if (S.stats.vitality < 30) boost -= 2;
    chase.escape = Math.min(100, chase.escape + boost);
    if (chase.escape >= 100) {
      chase = null;
      S.stats.swagger = clamp(S.stats.swagger + 5);
      log("🏃💨 ESCAPED! The worker trips over the bucket. +5 swagger.");
      save(); renderUI();
    }
  }
  function chaseStep(t) { // called from the draw loop
    if (!chase) return;
    var dt = Math.min(0.1, t - chase.last);
    chase.last = t;
    var speed = hasPerk("Fry-Proof Feathers") ? 11 : 14; // %/sec
    chase.progress += speed * dt;
    if (chase.progress >= 100) {
      chase = null;
      cutscene = { start: t, done: false };
      renderUI();
    }
  }

  // --------------------------------------------------------------------
  // Renderer — pixel Piu Piu on a 32×24 cell grid, crisp CSS scaling
  // --------------------------------------------------------------------
  var C = 3, GW = 32, GH = 24;
  var YELLOW = "#FFE066", BEAK = "#FF9210", BLUSH = "#FF9EBB", INK = "#2B2620";
  var canvas, ctx;

  function cell(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x * C, y * C, w * C, h * C); }
  function pxr(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
  function blob(cx, cy, rx, ry, col) {
    for (var dy = -ry; dy <= ry; dy++) {
      var f = 1 - (dy * dy) / (ry * ry);
      var hw = Math.max(1, Math.round(rx * Math.sqrt(Math.max(0, f))));
      cell(cx - hw, cy + dy, hw * 2 + 1, 1, col);
    }
  }

  function sizeFor(stage) {
    if (stage === "baby") return { rx: 4, ry: 3 };
    if (stage === "chick") return { rx: 6, ry: 5 };
    if (stage === "teen") return { rx: 7, ry: 6 };
    return { rx: 9, ry: 7 }; // adult: the big chicken
  }

  function drawFace(cxPx, fy, t, opts) {
    opts = opts || {};
    var r = reactType && now() < reactUntil ? reactType : null;
    var blink = !r && (t % 4) < 0.14;
    var eyeDX = opts.eyeDX || 12;
    if (opts.closed || blink || r === "nap") {
      pxr(cxPx - eyeDX - 1, fy + 1, 3, 1, INK); pxr(cxPx + eyeDX - 1, fy + 1, 3, 1, INK);
    } else if (r === "angry") {
      pxr(cxPx - eyeDX - 2, fy - 2, 4, 1, "#B23A48"); pxr(cxPx + eyeDX - 2, fy - 2, 4, 1, "#B23A48"); // brows
      pxr(cxPx - eyeDX - 1, fy, 2, 2, INK); pxr(cxPx + eyeDX - 1, fy, 2, 2, INK);
      pxr(cxPx + eyeDX + 5, fy - 8, 2, 5, "#E5484D"); pxr(cxPx + eyeDX + 5, fy - 2, 2, 2, "#E5484D"); // !
    } else if (r === "derp") {
      pxr(cxPx - eyeDX - 1, fy - 1, 3, 3, INK); pxr(cxPx + eyeDX - 1, fy + 1, 2, 2, INK); // uneven
      ctx.font = "8px monospace"; ctx.fillStyle = "#8FA3AD"; ctx.fillText("?", cxPx + eyeDX + 5, fy - 2);
    } else if (r === "meh") {
      pxr(cxPx - eyeDX - 1, fy + 1, 3, 1, INK); pxr(cxPx + eyeDX - 1, fy + 1, 3, 1, INK);
      ctx.font = "7px monospace"; ctx.fillStyle = "#8FA3AD"; ctx.fillText("...", cxPx + eyeDX + 4, fy);
    } else if (r === "annoyed") {
      pxr(cxPx - eyeDX - 2, fy - 1, 4, 1, INK); pxr(cxPx + eyeDX - 2, fy - 1, 4, 1, INK);
      pxr(cxPx - eyeDX - 1, fy, 2, 1, INK); pxr(cxPx + eyeDX - 1, fy, 2, 1, INK);
    } else if (r === "love") {
      pxr(cxPx - eyeDX - 1, fy, 2, 2, INK); pxr(cxPx + eyeDX - 1, fy, 2, 2, INK);
      var hy = fy - 10 - ((t * 14) % 8);
      ctx.globalAlpha = 0.9;
      pxr(cxPx - eyeDX - 2, hy, 2, 2, "#FF6B9D"); pxr(cxPx - eyeDX + 1, hy, 2, 2, "#FF6B9D"); pxr(cxPx - eyeDX - 1, hy + 2, 3, 2, "#FF6B9D");
      ctx.globalAlpha = 1;
    } else {
      pxr(cxPx - eyeDX - 1, fy, 2, 2, INK); pxr(cxPx + eyeDX - 1, fy, 2, 2, INK);
    }
    // sharp tiny orange triangle beak
    pxr(cxPx - 2, fy + 3, 4, 2, BEAK);
    pxr(cxPx - 1, fy + 5, 2, 2, BEAK);
    if (hasTrait("goldtooth")) pxr(cxPx, fy + 5, 2, 2, "#FFD24C");
    // bright pink blush
    pxr(cxPx - eyeDX - 2, fy + 4, 4, 2, BLUSH);
    pxr(cxPx + eyeDX - 2, fy + 4, 4, 2, BLUSH);
    if (hasTrait("facetat")) pxr(cxPx - eyeDX - 1, fy + 7, 2, 3, "#4A6B8A"); // teardrop
  }

  function drawWorker(wx, wy) { // tiny KFC employee, cells
    cell(wx, wy - 8, 3, 2, "#F3C9A5");             // head
    cell(wx - 1, wy - 9, 5, 1, "#E5484D");         // cap
    cell(wx, wy - 6, 3, 4, "#E5484D");             // red uniform
    cell(wx, wy - 4, 3, 1, "#FFFFFF");             // stripe
    cell(wx, wy - 2, 1, 2, "#3A3A3A"); cell(wx + 2, wy - 2, 1, 2, "#3A3A3A"); // legs
    cell(wx + 3, wy - 5, 2, 2, "#F1ECE2"); cell(wx + 3, wy - 3, 2, 1, "#E5484D"); // bucket
  }

  function drawChicken(cx, cyE, rxE, ryE, t, stage) {
    blob(cx, cyE, rxE, ryE, YELLOW);
    ctx.globalAlpha = 0.55; pxr((cx - Math.min(4, rxE - 1)) * C, (cyE - ryE + 2) * C, 5, 3, "#FFF6CE"); ctx.globalAlpha = 1;
    cell(cx - Math.max(2, Math.round(rxE / 3)), cyE + ryE + 1, 2, 1, BEAK);
    cell(cx + Math.max(0, Math.round(rxE / 3) - 1), cyE + ryE + 1, 2, 1, BEAK);
    if (hasTrait("mohawk") && stage !== "baby") {
      for (var m = 0; m < 4; m++) cell(cx - 2 + m, cyE - ryE - 1 - (m % 2), 1, 1 + (m % 2), "#FF6B9D");
    }
    var eyeDX = rxE >= 9 ? 12 : rxE >= 7 ? 9 : rxE >= 6 ? 8 : 6;
    drawFace(cx * C + 1, (cyE - Math.round(ryE / 3)) * C, t, { eyeDX: eyeDX });
  }

  function draw() {
    var t = now();
    ctx.clearRect(0, 0, GW * C, GH * C);
    var stage = stageOf(S.age);

    // ---- deep-fryer cutscene ----
    if (cutscene) {
      var ph = t - cutscene.start;
      if (ph < 1.2) { // grabbed!
        var shake = Math.round(Math.sin(t * 30) * 1);
        drawWorker(20, 20);
        drawChicken(12 + shake, 13, 7, 6, t, "adult");
        ctx.font = "8px monospace"; ctx.fillStyle = "#B23A48"; ctx.fillText("GOTCHA!!", 30, 14);
      } else if (ph < 2.6) { // the fryer
        cell(10, 12, 12, 9, "#8A8F98"); cell(11, 13, 10, 7, "#FF9210"); // basket + oil
        for (var bb = 0; bb < 5; bb++) { var by = 19 - ((t * 8 + bb * 4) % 7); pxr((12 + bb * 2) * C, by * C, 2, 2, "#FFF6CE"); }
        var dropY = Math.min(13, 4 + (ph - 1.2) * 8);
        blob(16, Math.round(dropY), 5, 4, YELLOW);
        ctx.font = "7px monospace"; ctx.fillStyle = "#57534e"; ctx.fillText("no piu…", 8, 8);
      } else { // a drumstick is born
        blob(16, 13, 6, 5, "#B5722E");
        blob(14, 12, 4, 3, "#C9853B");
        cell(21, 10, 2, 2, "#FFF7E8"); cell(22, 9, 2, 2, "#FFF7E8"); // bone
        ctx.font = "8px monospace"; ctx.fillStyle = "#8FA3AD"; ctx.fillText("finger cluckin' done", 6, 66);
      }
      if (ph > 3.6 && !cutscene.done) {
        cutscene.done = true;
        setTimeout(function () { cutscene = null; die("caught — deep-fried into a 6-piece at " + S.age); }, 0);
      }
      return;
    }

    // ---- KFC chase ----
    if (chase) {
      chaseStep(t);
      if (!chase) return; // resolved into cutscene/escape this frame
      pxr(0, 2, Math.round(GW * C * chase.progress / 100), 3, "#E5484D");   // worker closing in
      pxr(0, 7, Math.round(GW * C * chase.escape / 100), 3, "#7FC8A9");     // escape meter
      cell(0, 21, GW, 1, "#D9CDBA"); // ground
      var run = Math.floor(t * 10) % 2;
      var chX = 7 + (run ? 1 : 0);
      drawChicken(chX, 15, 6, 5, t, "adult");
      cell(chX - 2, 21, 2, 1, run ? BEAK : "#D9CDBA");
      var wx = Math.round(27 - 13 * (chase.progress / 100));
      drawWorker(wx, 21);
      ctx.font = "bold 9px monospace"; ctx.fillStyle = "#B23A48";
      if (Math.floor(t * 3) % 2) ctx.fillText("RUN!!", 36, 40);
      return;
    }

    if (!S.alive) { // shell (or drumstick memorial for the fried)
      if (S.deathCause.indexOf("fried") >= 0) { blob(16, 14, 6, 5, "#B5722E"); cell(21, 11, 2, 2, "#FFF7E8"); }
      else { blob(16, 18, 7, 4, "#F1ECE2"); for (var zz = 0; zz < 7; zz++) cell(10 + zz * 2, 14 - (zz % 2), 1, 1, "#F1ECE2"); }
      return;
    }

    // ---- egg stage ----
    if (stage === "egg") {
      var wob = reactType === "wobble" && now() < reactUntil ? Math.round(Math.sin(t * 22)) : 0;
      var ecx = 16 + wob;
      blob(ecx, 14, 6, 7, "#FFF7E8");
      ctx.globalAlpha = 0.5; pxr((ecx - 3) * C, 9 * C, 5, 4, "#FFFFFF"); ctx.globalAlpha = 1;
      for (var cr = 0; cr < S.age; cr++) { // cracks appear as it warms
        cell(ecx - 3 + cr * 2, 11 + (cr % 2), 1, 1, "#D9CDBA");
        cell(ecx - 2 + cr * 2, 12 - (cr % 2), 1, 1, "#D9CDBA");
      }
      ctx.font = "7px monospace"; ctx.fillStyle = "#A8A29E";
      ctx.fillText("warmth " + S.age + "/5", 33, 68);
      return;
    }

    // ---- living chicken ----
    var sz = sizeFor(stage);
    var mode = S.career ? S.career.path : "idle";
    var cx = mode === "corporate" && stage === "adult" ? 11 : 16;
    var ph2 = Math.sin(t * 2.2);
    var ryE = sz.ry + (ph2 > 0.35 ? 1 : ph2 < -0.35 ? -1 : 0);
    var rxE = sz.rx - (ryE - sz.ry);
    var cyE = 13 + (sz.ry - ryE) + (7 - sz.ry); // small chicks sit lower on the same baseline
    if (mode === "mystic" && stage === "adult") cyE -= 2 + Math.round(Math.sin(t * 1.1) * 1.5);

    if (mode === "mystic" && stage === "adult") {
      var cols = ["#B9DAE7", "#C5EBD5", "#FFDFD3", "#FFF3B0"];
      for (var p = 0; p < 7; p++) {
        var ang = t * 0.8 + p * (Math.PI * 2 / 7);
        ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 3 + p);
        pxr(cx * C + Math.cos(ang) * (30 + (p % 2) * 8), cyE * C + Math.sin(ang) * 20, 3, 3, cols[p % 4]);
      }
      ctx.globalAlpha = 1;
    }
    if (mode === "corporate" && stage === "adult") {
      cell(22, 6, 9, 12, "#9AA0A6"); cell(23, 7, 7, 7, "#D7E7F7");
      cell(24, 8, 5, 1, "#8FB4D9"); cell(24, 10, 4, 1, "#8FB4D9"); cell(24, 12, 5, 1, "#8FB4D9");
      cell(21, 18, 10, 2, "#B7BCC2");
    }

    drawChicken(cx, cyE, rxE, ryE, t, stage);

    if (stage === "adult") {
      if (mode === "underground") {
        cell(cx - 4, cyE - ryE - 1, 9, 2, "#B23A48"); cell(cx + 4, cyE - ryE, 3, 1, "#B23A48");
        [[-5, 2], [-4, 3], [-3, 4], [-2, 5], [-1, 5], [0, 5], [1, 5], [2, 5], [3, 4], [4, 3], [5, 2]].forEach(function (s) { cell(cx + s[0], cyE + s[1], 1, 1, "#FFD24C"); });
        cell(cx, cyE + 6, 1, 1, "#E8B429");
      }
      if (mode === "celeb") {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
        pxr(cx * C - 1, (cyE - sz.ry - 3) * C, 2, 8, "#FF9EBB"); pxr(cx * C - 4, (cyE - sz.ry - 3) * C + 3, 8, 2, "#FF9EBB");
        ctx.globalAlpha = 1;
      }
      if (mode === "athlete") {
        var hw6 = Math.round(rxE * Math.sqrt(Math.max(0, 1 - 36 / (ryE * ryE || 1))));
        cell(cx - hw6, cyE - 6, hw6 * 2 + 1, 1, "#E5484D");
      }
      if (mode === "corporate") {
        pxr(cx * C - 2, (cyE - 2) * C + 9, 6, 2, "#3A5A98");
        pxr(cx * C - 1, (cyE - 2) * C + 11, 4, 5, "#3A5A98");
      }
    }
    if (reactType === "nap" && now() < reactUntil) {
      ctx.font = "8px monospace"; ctx.fillStyle = "#8FA3AD";
      ctx.fillText("z", cx * C + 20, (cyE - ryE) * C - 2 - ((t * 9) % 8));
    }
  }

  function drawEgg(eggCtx) {
    eggCtx.clearRect(0, 0, 16, 16);
    var rows = [[6, 4], [5, 6], [4, 8], [3, 10], [3, 10], [3, 10], [4, 8], [5, 6]];
    rows.forEach(function (r, i) { eggCtx.fillStyle = "#FFF7E8"; eggCtx.fillRect(r[0], 4 + i, r[1], 1); });
    eggCtx.fillStyle = "#F6C3B2"; eggCtx.fillRect(6, 7, 1, 1); eggCtx.fillRect(9, 9, 1, 1);
  }

  // --------------------------------------------------------------------
  // UI
  // --------------------------------------------------------------------
  var root, refs = {}, careerOpen = false;
  var STAT_META = [["vitality", "❤️"], ["cluck", "🎵"], ["swagger", "😎"], ["peck", "⚡"], ["seeds", "🌰"]];

  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  function build() {
    root = document.getElementById("chicken-pet");
    if (!root) { root = document.createElement("div"); root.id = "chicken-pet"; document.body.appendChild(root); }
    root.innerHTML = "";

    var card = el('<div class="cpet-card"></div>');
    card.appendChild(el('<div class="cpet-head"><span class="cpet-title">🐣 <b class="cpet-name" title="Tap to rename"></b> <span class="cpet-gen"></span> <span class="cpet-joint" hidden>🤝</span></span><button class="cpet-collapse" title="Shrink to egg">🥚</button></div>'));
    canvas = el('<canvas class="cpet-canvas" width="' + GW * C + '" height="' + GH * C + '"></canvas>');
    card.appendChild(canvas);
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    canvas.addEventListener("click", function () {
      if (cutscene) return;
      if (chase) { chaseTap(); return; }
      if (S.alive) { react(); }
    });

    var stats = el('<div class="cpet-stats"></div>');
    STAT_META.forEach(function (m) {
      stats.appendChild(el('<div class="cpet-stat" title="' + m[0] + '"><span>' + m[1] + '</span><div class="cpet-bar"><i data-stat="' + m[0] + '"></i></div><em data-val="' + m[0] + '"></em></div>'));
    });
    card.appendChild(stats);
    card.appendChild(el('<div class="cpet-actions"></div>'));
    card.appendChild(el('<div class="cpet-career"></div>'));
    card.appendChild(el('<div class="cpet-log"></div>'));
    card.appendChild(el('<div class="cpet-overlay" hidden></div>'));
    root.appendChild(card);

    var egg = el('<button class="cpet-egg" title="Your chicken!" hidden><canvas width="16" height="16"></canvas></button>');
    root.appendChild(egg);
    drawEgg(egg.querySelector("canvas").getContext("2d"));

    refs = {
      card: card, egg: egg,
      name: card.querySelector(".cpet-name"), gen: card.querySelector(".cpet-gen"),
      joint: card.querySelector(".cpet-joint"),
      actions: card.querySelector(".cpet-actions"),
      career: card.querySelector(".cpet-career"), log: card.querySelector(".cpet-log"),
      overlay: card.querySelector(".cpet-overlay")
    };
    card.querySelector(".cpet-collapse").addEventListener("click", function () { S.collapsed = true; save(); renderUI(); });
    egg.addEventListener("click", function () { S.collapsed = false; save(); renderUI(); });
    // tap the name to rename the chick (syncs when joint)
    refs.name.style.cursor = "pointer";
    refs.name.addEventListener("click", function () {
      var nm = window.prompt("Name your chick:", S.name);
      if (nm && nm.trim()) { S.name = nm.trim().slice(0, 16); log("✏️ Renamed to " + S.name + "."); save(); renderUI(); }
    });
  }

  function renderActions() {
    var stage = stageOf(S.age);
    var html = "";
    if (chase) {
      html = '<button class="cpet-run" data-act="run">🏃 RUN!! (mash me!)</button>';
    } else if (stage === "egg") {
      html = '<button data-act="warm" class="cpet-wide">🔥 Keep the egg warm (' + S.age + "/5)</button>";
    } else {
      [["feed", "🌰 Feed"], ["peck", "⚡ Peck"], ["cluck", "🎵 Cluck"], ["strut", "😎 Strut"], ["work", "💼 Work"], ["nap", "😴 Nap"]].forEach(function (a) {
        html += '<button data-act="' + a[0] + '">' + a[1] + "</button>";
      });
    }
    refs.actions.innerHTML = html;
    refs.actions.querySelectorAll("button").forEach(function (b) {
      var act = b.getAttribute("data-act");
      if (act === "run") b.addEventListener("click", chaseTap);
      else b.addEventListener("click", function () { doAction(act); });
      if (act !== "run") b.disabled = !S.alive || !!S.pendingEvent || !!cutscene;
    });
  }

  function fxChips(fx) {
    return Object.keys(fx || {}).map(function (k) {
      var v = fx[k];
      return '<span class="cpet-fx' + (v < 0 ? " cpet-fx-bad" : "") + '">' + (v > 0 ? "+" : "") + v + " " + k + "</span>";
    }).join(" ");
  }

  function overlayHTML() {
    if (!S.alive) {
      var fried = S.deathCause.indexOf("fried") >= 0;
      var rows = S.ancestors.slice(-5).reverse().map(function (a) {
        return '<div class="cpet-ancestor">🪦 Gen ' + a.gen + " <b>" + esc(a.name) + "</b> — " + esc(a.career) + ", " + esc(a.cause) + "</div>";
      }).join("");
      return '<div class="cpet-ov-title">' + (S.retired ? "🎖️ " : fried ? "🍗 " : "💀 ") + esc(S.name) + (S.retired ? " retired!" : " has passed") + "</div>" +
        '<div class="cpet-ov-text">Gen ' + S.gen + " · age " + S.age + " · " + esc(S.deathCause) + "<br/>The dynasty inherits: <b>" + earnedPerk() + "</b> (" + PERKS[earnedPerk()] + ")</div>" +
        rows +
        '<button class="cpet-choice" data-hatch="1">🥚 Lay Gen ' + (S.gen + 1) + "'s egg</button>";
    }
    if (S.pendingEvent) {
      if (S.pendingEvent.loading) {
        return '<div class="cpet-ov-title">🔮 Fate is thinking…</div><div class="cpet-ov-text">Something is about to happen to ' + esc(S.name) + "…</div>";
      }
      var ev = S.pendingEvent;
      return '<div class="cpet-ov-title">🔮 ' + esc(ev.title) + "</div>" +
        '<div class="cpet-ov-text">' + esc(ev.text) + "</div>" +
        ev.choices.map(function (c, i) {
          var ok = meetsReq(c.req);
          var lock = c.req ? Object.keys(c.req).map(function (k) { return k + " " + c.req[k]; }).join(", ") : "";
          return '<button class="cpet-choice" data-ev="' + i + '"' + (ok ? "" : " disabled") + ">" + esc(c.label) +
            (c.trait && TRAITS[c.trait] ? " <small>· gives " + TRAITS[c.trait].label + "</small>" : "") +
            (ok ? "" : " · 🔒 needs " + lock) +
            (c.fx && Object.keys(c.fx).length ? '<div class="cpet-fxrow">' + fxChips(c.fx) + "</div>" : "") +
            "</button>";
        }).join("");
    }
    if (careerOpen) {
      return '<div class="cpet-ov-title">Choose a career</div>' +
        Object.keys(CAREERS).map(function (p) {
          var c = CAREERS[p];
          var ok = S.stats[c.stat] >= c.gate[0];
          return '<button class="cpet-choice" data-career="' + p + '"' + (ok ? "" : " disabled") + ">" + c.emoji + " " + c.label + " <small>(" + c.stat + " " + c.gate[0] + "+)</small></button>";
        }).join("") +
        '<button class="cpet-choice cpet-cancel" data-closecareer="1">Not yet</button>';
    }
    return "";
  }

  function renderUI() {
    if (!refs.card) return;
    refs.card.hidden = S.collapsed;
    refs.egg.hidden = !S.collapsed;
    if (refs.joint) { refs.joint.hidden = !joint; refs.joint.title = joint ? "Joint chick — you're raising it together" : ""; }
    // pulse the collapsed egg when something needs attention
    var needs = !!(S.pendingEvent || !S.alive || chase);
    if (refs.egg) refs.egg.className = "cpet-egg" + (S.collapsed && needs ? " cpet-egg-alert" : "");
    if (S.collapsed) return;

    var stage = stageOf(S.age);
    refs.name.textContent = S.name;
    refs.gen.textContent = "· Gen " + S.gen + " · " + STAGE_LABEL[stage] + " · age " + S.age + "/" + MAX_AGE;

    STAT_META.forEach(function (m) {
      var v = S.stats[m[0]];
      var bar = refs.card.querySelector('[data-stat="' + m[0] + '"]');
      bar.style.width = v + "%";
      bar.style.background = v < 20 ? "#E5484D" : m[0] === "vitality" ? "#7FC8A9" : m[0] === "seeds" ? "#D9A441" : "#9CCBDD";
      refs.card.querySelector('[data-val="' + m[0] + '"]').textContent = v;
    });

    renderActions();

    if (S.career) {
      var c = CAREERS[S.career.path];
      var next = S.career.tier + 1 < c.tiers.length ? " · next @ " + c.xp[S.career.tier + 1] + "xp + " + c.stat + " " + c.gate[S.career.tier + 1] : " · MAX";
      refs.career.innerHTML = c.emoji + " <b>" + c.tiers[S.career.tier] + "</b> <small>(" + S.career.xp + "xp" + next + ")</small>" +
        (S.traits.length ? "<br/><small>" + S.traits.map(function (tr) { return TRAITS[tr].label; }).join(" · ") + "</small>" : "");
    } else if (stage === "teen" || stage === "adult") {
      refs.career.innerHTML = '<button class="cpet-choosecareer">✨ Choose a career…</button>' +
        (S.traits.length ? " <small>" + S.traits.map(function (tr) { return TRAITS[tr].label; }).join(" · ") + "</small>" : "");
      var btn = refs.career.querySelector(".cpet-choosecareer");
      if (btn) btn.addEventListener("click", function () { careerOpen = true; renderUI(); });
    } else {
      refs.career.innerHTML = '<small>' + (stage === "egg" ? "…" : "Careers unlock as a teen (age 15)") + "</small>";
    }

    refs.log.textContent = S.log[S.log.length - 1] || "";

    var html = overlayHTML();
    refs.overlay.hidden = !html;
    refs.overlay.innerHTML = html;
    if (html) {
      refs.overlay.querySelectorAll("[data-ev]").forEach(function (b) { b.addEventListener("click", function () { resolveEvent(Number(b.getAttribute("data-ev"))); }); });
      refs.overlay.querySelectorAll("[data-career]").forEach(function (b) { b.addEventListener("click", function () { chooseCareer(b.getAttribute("data-career")); }); });
      var h = refs.overlay.querySelector("[data-hatch]"); if (h) h.addEventListener("click", hatchNext);
      var cc = refs.overlay.querySelector("[data-closecareer]"); if (cc) cc.addEventListener("click", function () { careerOpen = false; renderUI(); });
    }
  }

  // --------------------------------------------------------------------
  // Boot
  // --------------------------------------------------------------------
  var chaseWasActive = false;
  function loop() {
    if (ctx && !S.collapsed) {
      draw();
      var active = !!chase;
      if (chaseWasActive !== active) { chaseWasActive = active; renderUI(); } // chase started/ended in the draw loop
    }
    requestAnimationFrame(loop);
  }
  function init() {
    build();
    renderUI();
    requestAnimationFrame(loop);
    // attach joint sync now, or as soon as the React bridge appears
    if (window.ChickenSync) initJoint();
    else { var tries = 0; var iv = setInterval(function () { if (window.ChickenSync || tries++ > 40) { clearInterval(iv); if (window.ChickenSync) initJoint(); } }, 150); }
    window.ChickenPet = { state: S, save: save, reset: function () { localStorage.removeItem(SAVE_KEY); location.reload(); } };
    console.log("[chicken-pet] initialized — Gen " + S.gen + " " + S.name + " (" + stageOf(S.age) + ")");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
