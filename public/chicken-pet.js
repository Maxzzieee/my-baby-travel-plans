/* ============================================================================
   Rogue-lite Chicken Life Simulator — "Piu"
   Standalone sidebar widget. No framework, no dependencies.
   - 0–100 core stats: Vitality ❤️, Cluck 🎵, Swagger 😎, Peck ⚡, Seeds 🌰
   - 5 multi-tier careers: Corporate, Mystic, Underground, Celeb, Athlete
   - Rogue-lite generations: on death, the next chick hatches with an
     inherited perk; ancestors are recorded forever.
   - Fate engine: every 20 cycles a strict-JSON branching event fires,
     with choices locked behind stat requirements.
   - Canvas renderer: pixel Piu-Piu-style chick with per-state outfits.
   State persists in localStorage across refreshes and navigation.
============================================================================ */
(function () {
  "use strict";

  var SAVE_KEY = "cpet.save.v1";
  var CYCLE_MS = 6000; // one life "day" every 6s while the page is open
  var FATE_EVERY = 20; // cycles between fate events

  // --------------------------------------------------------------------
  // Careers — 4 tiers each; promotion needs XP + the path's core stat
  // --------------------------------------------------------------------
  var CAREERS = {
    corporate: { label: "Corporate", emoji: "💼", stat: "peck",
      tiers: ["Mailroom Chick", "Junior Pecker", "Middle Manager", "Chief Egg Officer"],
      xp: [0, 25, 60, 110], gate: [15, 30, 50, 70], perk: "Severance Package" },
    mystic: { label: "Mystic", emoji: "🔮", stat: "cluck",
      tiers: ["Novice Cluck", "Seer of Seeds", "Feathered Oracle", "Ascended Hen"],
      xp: [0, 25, 60, 110], gate: [15, 30, 50, 70], perk: "Third Eye" },
    underground: { label: "Underground", emoji: "🕶️", stat: "swagger",
      tiers: ["Lookout", "Coop Runner", "Yard Boss", "Kingpin of the Coop"],
      xp: [0, 25, 60, 110], gate: [15, 30, 50, 70], perk: "Street Smarts" },
    celeb: { label: "Celeb", emoji: "🌟", stat: "cluck",
      tiers: ["Open-Mic Chick", "Local Star", "Coopfluencer", "Megastar"],
      xp: [0, 30, 70, 120], gate: [20, 35, 55, 75], perk: "Stage Presence" },
    athlete: { label: "Athlete", emoji: "🏅", stat: "peck",
      tiers: ["Yard Jogger", "Sprint Chick", "Pro Pecker", "Golden Wing Champion"],
      xp: [0, 30, 70, 120], gate: [20, 35, 55, 75], perk: "Iron Beak" }
  };

  var PERKS = {
    "Severance Package": "hatch with +25 seeds",
    "Third Eye": "+1 to all training",
    "Street Smarts": "+2 swagger training",
    "Stage Presence": "+2 cluck training",
    "Iron Beak": "+2 peck training",
    "Hearty Yolk": "hatch with +20 vitality"
  };

  var NAMES = ["Piu", "Pio", "Nugget", "Mochi", "Cluckles", "Eggbert", "Pipi", "Butter", "Yolko", "Waddles"];

  // --------------------------------------------------------------------
  // Fate engine — strict JSON framework (parsed + validated at boot)
  // --------------------------------------------------------------------
  var FATE_EVENTS_JSON = JSON.stringify([
    { "id": "magic-seeds", "title": "A Stranger Offers Magic Seeds", "text": "A trench-coated pigeon opens one wing. \"Psst. Premium seeds. Top shelf.\"",
      "choices": [
        { "label": "Accept the seeds", "req": null, "fx": { "seeds": 15, "vitality": -4 }, "out": "Delicious… slightly expired. +15 seeds, tummy ache." },
        { "label": "Refuse coolly", "req": null, "fx": { "swagger": 3 }, "out": "You strut away. The pigeon respects it. +3 swagger." },
        { "label": "Peck the stranger", "req": { "peck": 30 }, "fx": { "seeds": 22, "swagger": 3 }, "out": "You shake down the pigeon. +22 seeds, +3 swagger." } ] },
    { "id": "recruiter", "title": "A Corporate Recruiter Visits", "text": "A crow in a tiny suit slides a business card across the dirt.",
      "choices": [
        { "label": "Join the fast-track", "req": { "cluck": 20 }, "fx": { "career": "corporate", "xp": 10 }, "out": "Welcome to the flock, associate. Corporate career started (+10 xp)." },
        { "label": "Politely decline", "req": null, "fx": { "cluck": 2 }, "out": "Networking is still networking. +2 cluck." },
        { "label": "Demand a signing bonus", "req": { "swagger": 35 }, "fx": { "seeds": 30 }, "out": "The crow blinks… and pays. +30 seeds." } ] },
    { "id": "rave", "title": "Midnight Rave at the Coop", "text": "The hens found a glowstick. The bass is just somebody kicking a bucket.",
      "choices": [
        { "label": "Dance all night", "req": null, "fx": { "swagger": 8, "vitality": -10 }, "out": "Legendary moves. +8 swagger, exhausted." },
        { "label": "Sleep instead", "req": null, "fx": { "vitality": 6 }, "out": "Self-care queen. +6 vitality." },
        { "label": "DJ the set", "req": { "cluck": 40 }, "fx": { "swagger": 10, "seeds": 10 }, "out": "Cluck drop of the century. +10 swagger, +10 seeds." } ] },
    { "id": "glow-egg", "title": "A Glowing Egg Appears", "text": "It hums softly in the straw. It is definitely looking at you.",
      "choices": [
        { "label": "Meditate beside it", "req": { "cluck": 25 }, "fx": { "cluck": 8 }, "out": "The egg shares a secret frequency. +8 cluck." },
        { "label": "Sit on it (warm!)", "req": null, "fx": { "vitality": 5 }, "out": "Cozy. Possibly radioactive. +5 vitality." },
        { "label": "Sell it, no questions", "req": null, "fx": { "seeds": 20, "swagger": -4 }, "out": "+20 seeds. You feel watched forever." } ] },
    { "id": "audit", "title": "The Farmer's Audit", "text": "Clipboard. Boots. The vibe is bureaucratic.",
      "choices": [
        { "label": "Hide the seed stash", "req": { "swagger": 25 }, "fx": { "swagger": 2 }, "out": "\"Nothing to declare.\" Stash safe. +2 swagger." },
        { "label": "Pay the seed tax", "req": null, "fx": { "seeds": -12 }, "out": "-12 seeds. Lawful. Boring. Safe." },
        { "label": "Sweet-talk the farmer", "req": { "cluck": 35 }, "fx": { "seeds": 6, "cluck": 2 }, "out": "Charmed! A bonus handful. +6 seeds, +2 cluck." } ] },
    { "id": "worms", "title": "Wild Worm Stampede", "text": "The ground ripples. Hundreds of them. It's beautiful.",
      "choices": [
        { "label": "FEAST", "req": null, "fx": { "vitality": 14, "seeds": 4 }, "out": "Protein overload. +14 vitality, +4 seeds." },
        { "label": "Herd them for profit", "req": { "peck": 35 }, "fx": { "seeds": 25 }, "out": "Worm futures pay off. +25 seeds." },
        { "label": "Watch respectfully", "req": null, "fx": { "cluck": 3 }, "out": "Nature is majestic. +3 cluck." } ] },
    { "id": "molt", "title": "Mysterious Molting", "text": "Feathers everywhere. A new you is emerging, ready or not.",
      "choices": [
        { "label": "Embrace the new look", "req": null, "fx": { "swagger": 6, "vitality": -3 }, "out": "Glow-up complete. +6 swagger." },
        { "label": "Panic flap", "req": null, "fx": { "vitality": -5, "cluck": 2 }, "out": "Screaming is cardio. +2 cluck." },
        { "label": "Impromptu fashion show", "req": { "swagger": 45 }, "fx": { "seeds": 20, "swagger": 5 }, "out": "The yard goes wild. +20 seeds, +5 swagger." } ] }
  ]);

  var STAT_KEYS = ["vitality", "cluck", "swagger", "peck", "seeds"];
  function validateFateEvent(ev) {
    if (!ev || typeof ev.id !== "string" || typeof ev.title !== "string" || typeof ev.text !== "string") return false;
    if (!Array.isArray(ev.choices) || ev.choices.length < 2 || ev.choices.length > 3) return false;
    return ev.choices.every(function (c) {
      if (typeof c.label !== "string" || typeof c.out !== "string") return false;
      if (c.req !== null && typeof c.req !== "object") return false;
      if (c.req) { for (var k in c.req) { if (STAT_KEYS.indexOf(k) < 0 || typeof c.req[k] !== "number") return false; } }
      if (typeof c.fx !== "object") return false;
      for (var f in c.fx) { if (STAT_KEYS.indexOf(f) < 0 && f !== "career" && f !== "xp") return false; }
      return true;
    });
  }
  var FATE_EVENTS = [];
  try {
    FATE_EVENTS = JSON.parse(FATE_EVENTS_JSON).filter(validateFateEvent);
  } catch (e) { console.error("[chicken-pet] fate JSON invalid:", e); }

  // --------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------
  function freshStats(perks) {
    return {
      vitality: Math.min(100, 70 + (perks.indexOf("Hearty Yolk") >= 0 ? 20 : 0)),
      cluck: 10, swagger: 10, peck: 10,
      seeds: Math.min(100, 20 + (perks.indexOf("Severance Package") >= 0 ? 25 : 0))
    };
  }
  function defaultState() {
    return {
      v: 1, gen: 1, name: NAMES[0], alive: true, asleep: false, collapsed: false,
      stats: freshStats([]), age: 0, cycle: 0,
      career: null, // { path, tier, xp }
      perks: [], ancestors: [], pendingFate: null, deathCause: "",
      log: ["🐣 " + NAMES[0] + " hatched! Gen 1 of the dynasty."]
    };
  }
  var S = defaultState();
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw) { var parsed = JSON.parse(raw); if (parsed && parsed.v === 1 && parsed.stats) S = Object.assign(defaultState(), parsed); }
  } catch (e) { /* corrupt save → fresh chick */ }

  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }
  function hasPerk(p) { return S.perks.indexOf(p) >= 0; }
  function trainBonus(stat) {
    var b = hasPerk("Third Eye") ? 1 : 0;
    if (stat === "peck" && hasPerk("Iron Beak")) b += 2;
    if (stat === "cluck" && hasPerk("Stage Presence")) b += 2;
    if (stat === "swagger" && hasPerk("Street Smarts")) b += 2;
    return b;
  }
  function log(msg) { S.log.push(msg); if (S.log.length > 5) S.log.shift(); }

  // --------------------------------------------------------------------
  // Engine
  // --------------------------------------------------------------------
  var startleUntil = 0;
  function startle() { startleUntil = performance.now() / 1000 + 0.9; }

  function applyFx(fx) {
    for (var k in fx) {
      if (k === "career") { if (!S.career) { S.career = { path: fx[k], tier: 0, xp: 0 }; } continue; }
      if (k === "xp") { if (S.career) S.career.xp += fx[k]; continue; }
      S.stats[k] = clamp(S.stats[k] + fx[k]);
    }
  }

  function meetsReq(req) {
    if (!req) return true;
    for (var k in req) { if (S.stats[k] < req[k]) return false; }
    return true;
  }

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
    S.alive = false;
    S.deathCause = cause;
    log("💀 " + S.name + " has passed. (" + cause + ")");
    save(); renderUI();
  }

  function earnedPerk() {
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
    S.age = 0; S.cycle = 0; S.career = null; S.alive = true; S.asleep = false;
    S.pendingFate = null; S.deathCause = "";
    log("🐣 Gen " + S.gen + ": " + S.name + " hatched! Inherited perk: " + perk + ".");
    save(); renderUI();
  }

  function tick() {
    if (!S.alive || S.pendingFate) { save(); renderUI(); return; }
    S.cycle += 1; S.age += 1;
    if (S.asleep) {
      S.stats.vitality = clamp(S.stats.vitality + 4);
      if (S.stats.vitality >= 100) { S.asleep = false; log("🌅 " + S.name + " woke up fully rested."); }
    } else {
      S.stats.vitality = clamp(S.stats.vitality - 1 - (S.age > 100 ? 1 : 0));
      if (S.cycle % 2 === 0) S.stats.seeds = clamp(S.stats.seeds - 1);
      if (S.stats.seeds <= 0) S.stats.vitality = clamp(S.stats.vitality - 2);
      if (S.career) {
        S.career.xp += 1;
        S.stats.seeds = clamp(S.stats.seeds + 1 + S.career.tier);
        checkPromotion();
      }
    }
    if (S.stats.vitality <= 0) { die(S.stats.seeds <= 0 ? "starved at " + S.age + " days" : "faded at " + S.age + " days"); return; }
    if (!S.asleep && S.cycle > 0 && S.cycle % FATE_EVERY === 0 && FATE_EVENTS.length) {
      S.pendingFate = FATE_EVENTS[Math.floor(Math.random() * FATE_EVENTS.length)].id;
      startle();
    }
    save(); renderUI();
  }

  // Player actions ------------------------------------------------------
  var ACTIONS = {
    feed: function () {
      if (S.stats.seeds < 5) return log("🌰 Not enough seeds to feed!");
      S.stats.seeds = clamp(S.stats.seeds - 5); S.stats.vitality = clamp(S.stats.vitality + 12);
      startle(); log("🌰 Nom nom. +12 vitality.");
    },
    peck: function () { train("peck", "⚡ Peck practice!"); },
    cluck: function () { train("cluck", "🎵 Vocal warmups!"); },
    strut: function () { train("swagger", "😎 Strut rehearsal!"); },
    work: function () {
      if (!S.career) return log("💼 No career yet — choose one first.");
      if (S.stats.vitality < 6) return log("😵 Too tired to work.");
      var c = CAREERS[S.career.path];
      S.stats.vitality = clamp(S.stats.vitality - 5);
      S.career.xp += 4; S.stats.seeds = clamp(S.stats.seeds + 2 + S.career.tier);
      checkPromotion(); log(c.emoji + " Overtime! +xp, +seeds.");
    },
    sleep: function () {
      S.asleep = !S.asleep;
      log(S.asleep ? "😴 " + S.name + " curls into a puddle…" : "🌅 " + S.name + " is up!");
    }
  };
  function train(stat, msg) {
    if (S.asleep) return log("😴 Shhh… " + S.name + " is sleeping.");
    if (S.stats.vitality < 6) return log("😵 Too tired to train.");
    S.stats.vitality = clamp(S.stats.vitality - 4);
    S.stats[stat] = clamp(S.stats[stat] + 4 + trainBonus(stat));
    startle(); log(msg + " +" + (4 + trainBonus(stat)) + " " + stat + ".");
  }
  function doAction(name) { if (!S.alive || S.pendingFate) return; ACTIONS[name](); save(); renderUI(); }

  function chooseCareer(path) {
    var c = CAREERS[path];
    if (S.stats[c.stat] < c.gate[0]) return;
    S.career = { path: path, tier: 0, xp: 0 };
    log(c.emoji + " Career started: " + c.tiers[0] + "!");
    careerOpen = false; save(); renderUI();
  }

  function resolveFate(idx) {
    var ev = FATE_EVENTS.filter(function (e) { return e.id === S.pendingFate; })[0];
    if (!ev) { S.pendingFate = null; renderUI(); return; }
    var ch = ev.choices[idx];
    if (!ch || !meetsReq(ch.req)) return;
    applyFx(ch.fx);
    log("🔮 " + ch.out);
    S.pendingFate = null;
    checkPromotion(); save(); renderUI();
  }

  // --------------------------------------------------------------------
  // Renderer — pixel Piu Piu (crisp cells on a 32×24 grid, CSS-scaled)
  // --------------------------------------------------------------------
  var C = 3, GW = 32, GH = 24; // cell size (px) and grid dims → 96×72 canvas
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

  function drawFace(cxPx, fy, t, opts) {
    opts = opts || {};
    var startled = performance.now() / 1000 < startleUntil;
    var blink = !startled && (t % 4) < 0.14;
    var eyeDX = 12; // wide apart
    if (opts.closed || blink) {
      pxr(cxPx - eyeDX - 1, fy + 1, 3, 1, INK); pxr(cxPx + eyeDX - 1, fy + 1, 3, 1, INK);
    } else if (startled) {
      pxr(cxPx - eyeDX - 1, fy - 1, 3, 3, INK); pxr(cxPx + eyeDX - 1, fy - 1, 3, 3, INK);
      pxr(cxPx - 1, fy - 12, 2, 5, "#E5484D"); pxr(cxPx - 1, fy - 6, 2, 2, "#E5484D"); // !
    } else {
      pxr(cxPx - eyeDX - 1, fy, 2, 2, INK); pxr(cxPx + eyeDX - 1, fy, 2, 2, INK);
    }
    // sharp tiny orange triangle beak, centered
    pxr(cxPx - 2, fy + 3, 4, 2, BEAK);
    pxr(cxPx - 1, fy + 5, 2, 2, BEAK);
    // bright pink blush under the eyes
    pxr(cxPx - eyeDX - 2, fy + 4, 4, 2, BLUSH);
    pxr(cxPx + eyeDX - 2, fy + 4, 4, 2, BLUSH);
  }

  function draw() {
    var t = performance.now() / 1000;
    ctx.clearRect(0, 0, GW * C, GH * C);
    var mode = !S.alive ? "dead" : S.asleep ? "sleep" : (S.career ? S.career.path : "idle");
    var cx = mode === "corporate" ? 11 : 16, cy = 13, rx = 9, ry = 7;

    if (mode === "dead") { // cracked shell
      blob(16, 18, 7, 4, "#F1ECE2");
      for (var zz = 0; zz < 7; zz++) cell(10 + zz * 2, 14 - (zz % 2), 1, 1, "#F1ECE2");
      return;
    }

    if (mode === "sleep") { // flattened yellow puddle
      blob(16, 20, 12, 3, YELLOW);
      drawFace(16 * C, 18 * C - 2, t, { closed: true });
      ctx.font = "8px monospace"; // zzZ drifting up
      for (var i = 0; i < 3; i++) {
        var prog = ((t * 9 + i * 13) % 34);
        ctx.globalAlpha = Math.max(0, 1 - prog / 34);
        ctx.fillStyle = "#8FA3AD";
        ctx.fillText(i === 2 ? "Z" : "z", 16 * C + 16 + i * 5, 15 * C - prog);
      }
      ctx.globalAlpha = 1;
      return;
    }

    // squish bounce (bottom stays planted)
    var ph = Math.sin(t * 2.2);
    var ryE = ry + (ph > 0.35 ? 1 : ph < -0.35 ? -1 : 0);
    var rxE = rx - (ryE - ry);
    var cyE = cy + (ry - ryE);
    if (mode === "mystic") cyE -= 2 + Math.round(Math.sin(t * 1.1) * 1.5); // levitate

    if (mode === "mystic") { // glowing pixel particles orbiting
      var cols = ["#B9DAE7", "#C5EBD5", "#FFDFD3", "#FFF3B0"];
      for (var p = 0; p < 7; p++) {
        var ang = t * 0.8 + p * (Math.PI * 2 / 7);
        ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 3 + p);
        pxr(cx * C + Math.cos(ang) * (30 + (p % 2) * 8), cyE * C + Math.sin(ang) * 20, 3, 3, cols[p % 4]);
      }
      ctx.globalAlpha = 1;
    }

    if (mode === "corporate") { // massive grey computer block
      cell(22, 6, 9, 12, "#9AA0A6"); cell(23, 7, 7, 7, "#D7E7F7");
      cell(24, 8, 5, 1, "#8FB4D9"); cell(24, 10, 4, 1, "#8FB4D9"); cell(24, 12, 5, 1, "#8FB4D9");
      cell(21, 18, 10, 2, "#B7BCC2");
    }

    // plump marshmallow body
    blob(cx, cyE, rxE, ryE, YELLOW);
    ctx.globalAlpha = 0.55; pxr((cx - 4) * C, (cyE - 5) * C, 5, 3, "#FFF6CE"); ctx.globalAlpha = 1; // soft glint
    // tiny feet
    if (mode !== "mystic") { cell(cx - 3, cyE + ryE + 1, 2, 1, BEAK); cell(cx + 2, cyE + ryE + 1, 2, 1, BEAK); }

    if (mode === "underground") { // backward cap + oversized gold chain
      cell(cx - 4, cyE - ryE - 1, 9, 2, "#B23A48");
      cell(cx + 4, cyE - ryE, 3, 1, "#B23A48");
      var chain = [[-5, 2], [-4, 3], [-3, 4], [-2, 5], [-1, 5], [0, 5], [1, 5], [2, 5], [3, 4], [4, 3], [5, 2]];
      chain.forEach(function (s) { cell(cx + s[0], cyE + s[1], 1, 1, "#FFD24C"); });
      cell(cx, cyE + 6, 1, 1, "#E8B429"); // pendant
    }
    if (mode === "celeb") { // blinking pink star
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
      pxr(cx * C - 1, (cyE - ry - 3) * C, 2, 8, "#FF9EBB"); pxr(cx * C - 4, (cyE - ry - 3) * C + 3, 8, 2, "#FF9EBB");
      ctx.globalAlpha = 1;
    }
    if (mode === "athlete") { // sweatband
      var hw6 = Math.round(rxE * Math.sqrt(Math.max(0, 1 - 36 / (ryE * ryE || 1))));
      cell(cx - hw6, cyE - 6, hw6 * 2 + 1, 1, "#E5484D");
    }

    drawFace(cx * C + 1, (cyE - 2) * C, t, {});
    if (mode === "corporate") { // tiny boxy tie
      pxr(cx * C - 2, (cyE - 2) * C + 9, 6, 2, "#3A5A98");
      pxr(cx * C - 1, (cyE - 2) * C + 11, 4, 5, "#3A5A98");
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
  var STAT_META = [
    ["vitality", "❤️"], ["cluck", "🎵"], ["swagger", "😎"], ["peck", "⚡"], ["seeds", "🌰"]
  ];

  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  function build() {
    root = document.getElementById("chicken-pet");
    if (!root) { root = document.createElement("div"); root.id = "chicken-pet"; document.body.appendChild(root); }
    root.innerHTML = "";

    var card = el('<div class="cpet-card"></div>');
    card.appendChild(el('<div class="cpet-head"><span class="cpet-title">🐣 <b class="cpet-name"></b> <span class="cpet-gen"></span></span><button class="cpet-collapse" title="Shrink to egg">🥚</button></div>'));
    canvas = el('<canvas class="cpet-canvas" width="' + GW * C + '" height="' + GH * C + '"></canvas>');
    card.appendChild(canvas);
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    var stats = el('<div class="cpet-stats"></div>');
    STAT_META.forEach(function (m) {
      stats.appendChild(el('<div class="cpet-stat" title="' + m[0] + '"><span>' + m[1] + '</span><div class="cpet-bar"><i data-stat="' + m[0] + '"></i></div><em data-val="' + m[0] + '"></em></div>'));
    });
    card.appendChild(stats);

    var actions = el('<div class="cpet-actions"></div>');
    [["feed", "🌰 Feed"], ["peck", "⚡ Peck"], ["cluck", "🎵 Cluck"], ["strut", "😎 Strut"], ["work", "💼 Work"], ["sleep", "😴"]].forEach(function (a) {
      var b = el('<button data-act="' + a[0] + '">' + a[1] + "</button>");
      b.addEventListener("click", function () { doAction(a[0]); });
      actions.appendChild(b);
    });
    card.appendChild(actions);
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
      career: card.querySelector(".cpet-career"), log: card.querySelector(".cpet-log"),
      overlay: card.querySelector(".cpet-overlay"), actions: actions
    };
    card.querySelector(".cpet-collapse").addEventListener("click", function () { S.collapsed = true; save(); renderUI(); });
    egg.addEventListener("click", function () { S.collapsed = false; save(); renderUI(); });
  }

  function overlayHTML() {
    if (!S.alive) {
      var rows = S.ancestors.slice(-5).reverse().map(function (a) {
        return '<div class="cpet-ancestor">🪦 Gen ' + a.gen + " <b>" + a.name + "</b> — " + a.career + ", " + a.cause + "</div>";
      }).join("");
      return '<div class="cpet-ov-title">💀 ' + S.name + " has passed</div>" +
        '<div class="cpet-ov-text">Gen ' + S.gen + " · " + S.age + " days · " + S.deathCause + "<br/>The dynasty inherits: <b>" + earnedPerk() + "</b> (" + PERKS[earnedPerk()] + ")</div>" +
        rows +
        '<button class="cpet-choice" data-hatch="1">🥚 Hatch Gen ' + (S.gen + 1) + "</button>";
    }
    if (S.pendingFate) {
      var ev = FATE_EVENTS.filter(function (e) { return e.id === S.pendingFate; })[0];
      if (!ev) return "";
      return '<div class="cpet-ov-title">🔮 ' + ev.title + "</div>" +
        '<div class="cpet-ov-text">' + ev.text + "</div>" +
        ev.choices.map(function (c, i) {
          var ok = meetsReq(c.req);
          var lock = c.req ? Object.keys(c.req).map(function (k) { return k + " " + c.req[k]; }).join(", ") : "";
          return '<button class="cpet-choice" data-fate="' + i + '"' + (ok ? "" : " disabled") + ">" + c.label + (ok ? "" : " · 🔒 needs " + lock) + "</button>";
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
    if (S.collapsed) return;

    refs.name.textContent = S.name;
    refs.gen.textContent = "· Gen " + S.gen + " · " + S.age + "d";
    STAT_META.forEach(function (m) {
      var v = S.stats[m[0]];
      var bar = refs.card.querySelector('[data-stat="' + m[0] + '"]');
      bar.style.width = v + "%";
      bar.style.background = v < 20 ? "#E5484D" : m[0] === "vitality" ? "#7FC8A9" : m[0] === "seeds" ? "#D9A441" : "#9CCBDD";
      refs.card.querySelector('[data-val="' + m[0] + '"]').textContent = v;
    });

    if (S.career) {
      var c = CAREERS[S.career.path];
      var next = S.career.tier + 1 < c.tiers.length ? " · next @ " + c.xp[S.career.tier + 1] + "xp + " + c.stat + " " + c.gate[S.career.tier + 1] : " · MAX";
      refs.career.innerHTML = c.emoji + " <b>" + c.tiers[S.career.tier] + "</b> <small>(" + S.career.xp + "xp" + next + ")</small>";
    } else {
      refs.career.innerHTML = '<button class="cpet-choosecareer">✨ Choose a career…</button>';
      var btn = refs.career.querySelector(".cpet-choosecareer");
      if (btn) btn.addEventListener("click", function () { careerOpen = true; renderUI(); });
    }

    refs.log.textContent = S.log[S.log.length - 1] || "";

    var html = overlayHTML();
    refs.overlay.hidden = !html;
    refs.overlay.innerHTML = html;
    if (html) {
      refs.overlay.querySelectorAll("[data-fate]").forEach(function (b) { b.addEventListener("click", function () { resolveFate(Number(b.getAttribute("data-fate"))); }); });
      refs.overlay.querySelectorAll("[data-career]").forEach(function (b) { b.addEventListener("click", function () { chooseCareer(b.getAttribute("data-career")); }); });
      var h = refs.overlay.querySelector("[data-hatch]"); if (h) h.addEventListener("click", hatchNext);
      var cc = refs.overlay.querySelector("[data-closecareer]"); if (cc) cc.addEventListener("click", function () { careerOpen = false; renderUI(); });
    }

    refs.actions.querySelectorAll("button").forEach(function (b) {
      var act = b.getAttribute("data-act");
      b.disabled = !S.alive || !!S.pendingFate || (S.asleep && act !== "sleep");
      if (act === "sleep") b.textContent = S.asleep ? "🌅" : "😴";
    });
  }

  // --------------------------------------------------------------------
  // Boot
  // --------------------------------------------------------------------
  function loop() { if (ctx && !S.collapsed) draw(); requestAnimationFrame(loop); }
  function init() {
    build();
    renderUI();
    setInterval(tick, CYCLE_MS);
    requestAnimationFrame(loop);
    window.ChickenPet = { state: S, save: save, reset: function () { localStorage.removeItem(SAVE_KEY); location.reload(); } };
    console.log("[chicken-pet] initialized — Gen " + S.gen + " " + S.name);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
