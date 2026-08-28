import React, { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";

/**
 * Flappy Bun — a pixel-art tap-to-flap side game. 🐰
 *
 * Deliberately gentler than real Flappy Bird: soft gravity, a floaty flap,
 * wide hedge gaps that only narrow slowly, no ceiling death, and a hitbox that
 * ignores the ears, tail and feet. All the feel lives in TUNE — raise
 * `gravity` / lower `gap` if it ever gets too easy.
 */

const PX = 4;              // one world pixel = 4 screen px
const W = 80, H = 110;     // world size in pixels  => 320 x 440 canvas
const GY = 98;             // y of the ground's top edge
const BX = 18;             // bunny's fixed x

const TUNE = {
  gravity: 178,            // px/s²  (classic flappy feels ~2x this)
  flap: -58,               // upward kick
  maxFall: 92,             // terminal velocity, keeps dives readable
  speed: 25,               // scroll px/s
  speedPer: 0.32,          // +speed per point
  speedMax: 40,
  gap: 40,                 // hedge gap — bunny's body is only 6px tall
  gapMin: 33,
  gapPer: 0.22,            // gap shrink per point
  spacing: 48,             // px between hedges
  grace: 34,               // extra runway before hedge #1
  carrotBonus: 2,          // points per carrot eaten
};

// ---- pixel sprites --------------------------------------------------------
// W cream · P pink · K eye · N nose · T tail · S foot
const BUNNY = [
  "...WW..WW....",
  "...WP..PW....",
  "...WP..PW....",
  "...WW..WW....",
  "..WWWWWWWW...",
  ".WWWWWWWWWW..",
  "WWWWWWWKWWWW.",
  "TWWWWWWWWWWN.",
  "TWWWWWWWWWWW.",
  ".WWWWWWWWWW..",
  "..WWWWWWWW...",
  "..SS...SS....",
];
const BUNNY_PAL = { W: "#FFF8F3", P: "#FF9EBB", K: "#3A322C", N: "#FF7FA5", T: "#FFFFFF", S: "#FFD1DE" };

const CLOUD = [
  "..CCC...",
  ".CCCCC..",
  "CCCCCCC.",
  ".CCCCCCC",
];
const CLOUD_PAL = { C: "#FFFFFF" };

// 3x5 digits, drawn at 2x
const DIGITS = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "001", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
};

// ---- draw helpers ---------------------------------------------------------
function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x) * PX, Math.round(y) * PX, Math.round(w) * PX, Math.round(h) * PX);
}
function sprite(ctx, map, pal, x, y) {
  x = Math.round(x); y = Math.round(y);
  for (var r = 0; r < map.length; r++) {
    var row = map[r];
    for (var c = 0; c < row.length; c++) {
      var ch = row[c];
      if (ch === "." || !pal[ch]) continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect((x + c) * PX, (y + r) * PX, PX, PX);
    }
  }
}
function digits(ctx, n, cx, y, color, scale) {
  var str = String(n), s = scale || 2;
  var total = str.length * (3 * s + s) - s;
  var x = Math.round(cx - total / 2);
  ctx.fillStyle = color;
  for (var i = 0; i < str.length; i++) {
    var d = DIGITS[str[i]];
    for (var r = 0; r < 5; r++) for (var c = 0; c < 3; c++) {
      if (d[r][c] === "1") ctx.fillRect((x + c * s) * PX, (y + r * s) * PX, s * PX, s * PX);
    }
    x += 3 * s + s;
  }
}

// bunny's forgiving hitbox — ears, tail and feet are free
function body(y) { return { x: BX + 2, y: y + 5, w: 9, h: 6 }; }

// a hedge plus the carrot tucked inside its gap
function mkPipe(x, gy, gap) {
  const spread = Math.max(0, gap / 2 - 6);   // keep the carrot clear of both hedges
  return { x, gy, gap, scored: false, carrot: true, cy: gy + (Math.random() * 2 - 1) * spread };
}

function draw(ctx, s) {
  // sky — flat retro bands
  rect(ctx, 0, 0, W, 38, "#BFE7F5");
  rect(ctx, 0, 38, W, 22, "#D5EFF9");
  rect(ctx, 0, 60, W, GY - 60, "#E6F6FB");

  // parallax clouds
  for (var i = 0; i < s.clouds.length; i++) sprite(ctx, CLOUD, CLOUD_PAL, s.clouds[i].x, s.clouds[i].y);

  // blocky hills behind the hedges
  var hx = -((s.dist * 0.35) % 40);
  for (var k = 0; k < 4; k++) {
    var bx = hx + k * 40;
    rect(ctx, bx + 4, GY - 14, 16, 14, "#C9EBD8");
    rect(ctx, bx + 8, GY - 18, 8, 6, "#C9EBD8");
    rect(ctx, bx + 24, GY - 10, 12, 10, "#DCF2E6");
  }

  // hedges
  for (var p = 0; p < s.pipes.length; p++) {
    var pi = s.pipes[p], top = pi.gy - pi.gap / 2, bot = pi.gy + pi.gap / 2;
    // upper
    rect(ctx, pi.x, 0, 14, top - 4, "#7FC8A9");
    rect(ctx, pi.x + 1, 0, 3, top - 4, "#A2DCBA");
    rect(ctx, pi.x - 1, top - 4, 16, 4, "#5FA98B");
    rect(ctx, pi.x, top - 4, 14, 1, "#A2DCBA");
    // lower
    rect(ctx, pi.x - 1, bot, 16, 4, "#5FA98B");
    rect(ctx, pi.x, bot, 14, 1, "#A2DCBA");
    rect(ctx, pi.x, bot + 4, 14, GY - bot - 4, "#7FC8A9");
    rect(ctx, pi.x + 1, bot + 4, 3, GY - bot - 4, "#A2DCBA");
    // a carrot to snack on — disappears once the bunny gets it
    if (pi.carrot) {
      rect(ctx, pi.x + 6, pi.cy - 1, 2, 4, "#FFB067");
      rect(ctx, pi.x + 6, pi.cy + 3, 1, 1, "#E8934A");
      rect(ctx, pi.x + 6, pi.cy - 3, 2, 2, "#7FC8A9");
    }
  }

  // ground
  rect(ctx, 0, GY, W, 3, "#A2DCBA");
  rect(ctx, 0, GY + 3, W, H - GY - 3, "#EFE0C4");
  var gx = -((s.dist * 1) % 8);
  for (var t = 0; t < 12; t++) rect(ctx, gx + t * 8, GY + 5, 3, 1, "#DCC9A4");

  // bunny — tilts by leaning the sprite one pixel (kept crisp, no rotation)
  var lean = s.vy < -18 ? -1 : s.vy > 42 ? 1 : 0;
  sprite(ctx, BUNNY, BUNNY_PAL, BX, s.y + lean);

  // score
  if (s.phase !== "ready") digits(ctx, s.score, W / 2, 10, "#FFFFFF", 2);
}

export default function FlappyBun({ high, onHigh, who, sound }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [carrots, setCarrots] = useState(0);
  const [phase, setPhase] = useState("ready"); // ready | play | over
  const cvRef = useRef(null);
  const g = useRef({ y: 44, vy: 0, pipes: [], clouds: [], dist: 0, score: 0, carrots: 0, passed: 0, phase: "ready", last: 0, raf: 0, t: 0, deadAt: 0 });
  const highRef = useRef(high); highRef.current = high;
  const onHighRef = useRef(onHigh); onHighRef.current = onHigh;
  const whoRef = useRef(who); whoRef.current = who;

  const die = useCallback(() => {
    const s = g.current;
    if (s.phase === "over") return;
    s.phase = "over"; s.deadAt = performance.now();
    setPhase("over");
    sound && sound.blip(150, 0.26, "sawtooth");
    if (s.score > (highRef.current?.score || 0)) onHighRef.current({ score: s.score, who: whoRef.current, at: Date.now(), carrots: s.carrots });
  }, [sound]);

  const loop = useCallback((now) => {
    const s = g.current, cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 0.016;
    s.last = now; s.t += dt;

    if (s.phase === "ready") {
      s.y = 44 + Math.sin(s.t * 3) * 2;          // idle bob
    } else if (s.phase === "play") {
      s.vy = Math.min(TUNE.maxFall, s.vy + TUNE.gravity * dt);
      s.y += s.vy * dt;
      if (s.y < -2) { s.y = -2; s.vy = 0; }       // soft ceiling, never fatal

      const speed = Math.min(TUNE.speedMax, TUNE.speed + s.passed * TUNE.speedPer);
      const gap = Math.max(TUNE.gapMin, TUNE.gap - s.passed * TUNE.gapPer);
      s.dist += speed * dt;

      for (let i = s.pipes.length - 1; i >= 0; i--) {
        const p = s.pipes[i];
        p.x -= speed * dt;
        if (!p.scored && p.x + 14 < BX) { p.scored = true; s.passed++; s.score++; setScore(s.score); sound && sound.pop(); }
        if (p.x < -18) s.pipes.splice(i, 1);
      }
      const lastX = s.pipes.length ? s.pipes[s.pipes.length - 1].x : -999;
      if (lastX < W - TUNE.spacing) {
        const lo = gap / 2 + 10, hi = GY - gap / 2 - 10;
        s.pipes.push(mkPipe(W + 2, lo + Math.random() * (hi - lo), gap));
      }

      // collisions
      const b = body(s.y);
      if (b.y + b.h >= GY) { s.y = GY - 11; draw(ctx, s); die(); s.raf = requestAnimationFrame(loop); return; }
      for (let i = 0; i < s.pipes.length; i++) {
        const p = s.pipes[i];
        if (p.carrot && b.x + b.w > p.x + 5 && b.x < p.x + 9 && b.y + b.h > p.cy - 3 && b.y < p.cy + 4) {
          p.carrot = false;
          s.carrots++; setCarrots(s.carrots);
          s.score += TUNE.carrotBonus; setScore(s.score);
          sound && sound.blip(990, 0.07, "square");
        }
        if (b.x + b.w > p.x && b.x < p.x + 14) {
          if (b.y < p.gy - p.gap / 2 || b.y + b.h > p.gy + p.gap / 2) { draw(ctx, s); die(); s.raf = requestAnimationFrame(loop); return; }
        }
      }
    } else {
      // over — let the bunny tumble to the ground
      s.vy = Math.min(TUNE.maxFall, s.vy + TUNE.gravity * dt);
      s.y = Math.min(GY - 11, s.y + s.vy * dt);
    }

    for (let i = 0; i < s.clouds.length; i++) {
      const c = s.clouds[i];
      c.x -= c.v * dt;
      if (c.x < -10) { c.x = W + 2; c.y = 6 + Math.random() * 28; }
    }

    draw(ctx, s);
    s.raf = requestAnimationFrame(loop);
  }, [sound, die]);

  const reset = useCallback(() => {
    const s = g.current;
    s.y = 44; s.vy = 0; s.pipes = []; s.dist = 0; s.score = 0; s.carrots = 0; s.passed = 0; s.phase = "ready"; s.last = 0; s.t = 0;
    s.clouds = [{ x: 12, y: 10, v: 4 }, { x: 44, y: 24, v: 3 }, { x: 68, y: 14, v: 5 }];
    setScore(0); setCarrots(0); setPhase("ready");
    cancelAnimationFrame(s.raf);
    s.raf = requestAnimationFrame(loop);
  }, [loop]);

  const flap = useCallback(() => {
    const s = g.current;
    if (s.phase === "ready") {
      s.phase = "play"; setPhase("play");
      s.pipes = [mkPipe(W + TUNE.grace, 40, TUNE.gap)];
    }
    if (s.phase === "play") {
      s.vy = TUNE.flap;
      sound && sound.blip(520, 0.05, "square");
    } else if (s.phase === "over" && performance.now() - s.deadAt > 600) {
      reset();
    }
  }, [sound, reset]);

  const begin = () => { setOpen(true); reset(); };
  const close = () => { cancelAnimationFrame(g.current.raf); g.current.raf = 0; setOpen(false); };
  useEffect(() => () => cancelAnimationFrame(g.current.raf), []);

  // space / arrow-up to flap while the game is open
  useEffect(() => {
    if (!open) return;
    const k = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.key === "w") { e.preventDefault(); flap(); }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, flap]);

  const quip = score >= 15 ? "certified bun 🥕" : score >= 8 ? "ok pro ah" : score >= 3 ? "not bad leh" : "the hedge won 😭";

  return (
    <>
      <div className="mx-auto mt-3 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-4 py-2 backdrop-blur">
        <span className="text-base">🐰</span>
        <span className="text-xs font-extrabold uppercase tracking-wide text-stone-500">Flappy Bun</span>
        <span className="text-sm font-extrabold text-stone-600">
          {high?.score ? <>🏆 {high.score}{high.who ? " · " + (high.who === "ants" ? "Ants" : "Me") : ""}</> : "no high score yet"}
        </span>
        <button onClick={begin} className="ml-1 rounded-full px-3 py-1 text-xs font-extrabold transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: "#FFDFD3", color: "#C4623F", border: "1.5px solid #FFC7B2" }}>Play</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-sm" onClick={() => { if (g.current.phase !== "play") close(); }}>
          <div className="rounded-3xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-sm font-extrabold text-stone-600">🐰 {score} · 🥕 {carrots}{high?.score ? " · 🏆 " + high.score : ""}</span>
              <button onClick={close} className="text-stone-400 transition-colors hover:text-rose-400" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="relative">
              <canvas
                ref={cvRef} width={W * PX} height={H * PX}
                onPointerDown={(e) => { e.preventDefault(); flap(); }}
                className="rounded-2xl"
                style={{ width: "min(86vw, 320px)", height: "auto", touchAction: "none", imageRendering: "pixelated", cursor: "pointer" }}
              />
              {phase === "ready" && (
                <div className="pointer-events-none absolute inset-x-0 bottom-14 text-center">
                  <p className="inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-stone-600">tap / space to flap 🐰</p>
                </div>
              )}
              {phase === "over" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/92">
                  <p className="text-2xl font-black text-stone-700">🐰 {score}</p>
                  <p className="text-xs font-bold text-stone-500">{quip}</p>
                  <p className="text-xs font-bold text-stone-500">🥕 {carrots} eaten</p>
                  {score > 0 && score >= (high?.score || 0) && <p className="text-xs font-extrabold text-emerald-500">new high score! 🎉</p>}
                  <button onClick={reset} className="mt-1 rounded-full px-4 py-2 text-sm font-extrabold transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: "#FFDFD3", color: "#C4623F", border: "1.5px solid #FFC7B2" }}>Play again</button>
                </div>
              )}
            </div>
            <p className="mt-2 text-center text-[11px] text-stone-500">Flap through the hedges · grab the 🥕 for +2 · ears &amp; tail don't count</p>
          </div>
        </div>
      )}
    </>
  );
}
