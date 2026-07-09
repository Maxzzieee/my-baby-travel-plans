import React, { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";

/**
 * Seed Rush — a cozy falling-catch arcade side game.
 * Move the chick to catch 🌰 seeds, dodge 🌶️ chilis. 3 lives, speed ramps.
 * Shared high score via props (stored in the synced copy blob upstream).
 */
const W = 320, H = 440;

function draw(ctx, s) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#EAF5FA"; ctx.fillRect(0, 0, W, H);
  // ground
  ctx.fillStyle = "#E3EFD8"; ctx.fillRect(0, H - 16, W, 16);
  // falling items
  for (var i = 0; i < s.items.length; i++) {
    var it = s.items[i];
    if (it.type === "seed") {
      ctx.fillStyle = "#D9A441";
      ctx.beginPath(); ctx.ellipse(it.x, it.y, 6, 8, 0.2, 0, 7); ctx.fill();
      ctx.fillStyle = "#B8862E"; ctx.fillRect(it.x - 1, it.y - 1, 2, 3);
    } else {
      ctx.fillStyle = "#E5484D";
      ctx.beginPath(); ctx.ellipse(it.x, it.y + 1, 5, 9, 0.35, 0, 7); ctx.fill();
      ctx.fillStyle = "#3F7C5C"; ctx.fillRect(it.x - 1, it.y - 11, 2, 4);
    }
  }
  // basket = little chick face
  var by = H - 44;
  ctx.fillStyle = "#FFE066"; ctx.beginPath(); ctx.arc(s.basket, by, 22, 0, 7); ctx.fill();
  ctx.fillStyle = "#FFF6CE"; ctx.globalAlpha = 0.5; ctx.fillRect(s.basket - 12, by - 12, 8, 5); ctx.globalAlpha = 1;
  ctx.fillStyle = "#2B2620"; ctx.fillRect(s.basket - 9, by - 4, 3, 3); ctx.fillRect(s.basket + 6, by - 4, 3, 3);
  ctx.fillStyle = "#FF9210"; ctx.beginPath(); ctx.moveTo(s.basket - 3, by + 2); ctx.lineTo(s.basket + 3, by + 2); ctx.lineTo(s.basket, by + 8); ctx.fill();
  ctx.fillStyle = "#FF9EBB"; ctx.fillRect(s.basket - 15, by + 1, 5, 3); ctx.fillRect(s.basket + 10, by + 1, 5, 3);
}

export default function SeedRush({ high, onHigh, sound }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);
  const cvRef = useRef(null);
  const g = useRef({ items: [], basket: W / 2, spawn: 0, last: 0, raf: 0, running: false, score: 0, lives: 3 });
  const highRef = useRef(high); highRef.current = high;
  const onHighRef = useRef(onHigh); onHighRef.current = onHigh;

  const finish = useCallback(() => {
    const s = g.current;
    s.running = false; cancelAnimationFrame(s.raf);
    setOver(true);
    if (s.score > 0 && s.score > (highRef.current?.score || 0)) onHighRef.current({ score: s.score });
  }, []);

  const loop = useCallback((now) => {
    const s = g.current, cv = cvRef.current;
    if (!s.running || !cv) return;
    const ctx = cv.getContext("2d");
    const dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 0.016;
    s.last = now; s.spawn -= dt;
    const speed = 130 + s.score * 6;
    const rate = Math.max(0.32, 0.85 - s.score * 0.012);
    if (s.spawn <= 0) {
      s.spawn = rate;
      const chili = Math.random() < Math.min(0.34, 0.1 + s.score * 0.007);
      s.items.push({ x: 22 + Math.random() * (W - 44), y: -16, type: chili ? "chili" : "seed" });
    }
    const by = H - 44;
    for (let i = s.items.length - 1; i >= 0; i--) {
      const it = s.items[i];
      it.y += speed * dt;
      if (it.y > by - 16 && it.y < by + 16 && Math.abs(it.x - s.basket) < 26) {
        s.items.splice(i, 1);
        if (it.type === "seed") { s.score++; setScore(s.score); sound && sound.pop(); }
        else { s.lives--; setLives(s.lives); sound && sound.blip(170, 0.14, "sawtooth"); if (s.lives <= 0) { draw(ctx, s); finish(); return; } }
      } else if (it.y > H + 20) { s.items.splice(i, 1); }
    }
    draw(ctx, s);
    s.raf = requestAnimationFrame(loop);
  }, [sound, finish]);

  const begin = useCallback(() => {
    const s = g.current;
    s.items = []; s.basket = W / 2; s.spawn = 0; s.last = 0; s.score = 0; s.lives = 3; s.running = true;
    setScore(0); setLives(3); setOver(false); setOpen(true);
    cancelAnimationFrame(s.raf);
    s.raf = requestAnimationFrame(loop);
  }, [loop]);

  const close = () => { g.current.running = false; cancelAnimationFrame(g.current.raf); setOpen(false); };
  useEffect(() => () => cancelAnimationFrame(g.current.raf), []);

  const move = (clientX) => {
    const cv = cvRef.current; if (!cv) return;
    const r = cv.getBoundingClientRect();
    g.current.basket = Math.max(24, Math.min(W - 24, ((clientX - r.left) / r.width) * W));
  };

  return (
    <>
      <div className="mx-auto mt-3 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white/70 px-4 py-2 backdrop-blur">
        <span className="text-base">🌰</span>
        <span className="text-xs font-extrabold uppercase tracking-wide text-stone-400">Seed Rush</span>
        <span className="text-sm font-extrabold text-stone-600">{high?.score ? "🏆 " + high.score : "no high score yet"}</span>
        <button onClick={begin} className="ml-1 rounded-full px-3 py-1 text-xs font-extrabold transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: "#C5EBD5", color: "#3F7C5C", border: "1.5px solid #A2DCBA" }}>Play</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-sm" onClick={close}>
          <div className="rounded-3xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-extrabold text-stone-600">🌰 {score} · {"❤️".repeat(Math.max(0, lives)) || "💀"}</span>
              <button onClick={close} className="text-stone-400 transition-colors hover:text-rose-400" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="relative">
              <canvas
                ref={cvRef} width={W} height={H}
                onMouseMove={(e) => move(e.clientX)}
                onTouchMove={(e) => { move(e.touches[0].clientX); }}
                className="rounded-2xl"
                style={{ width: "min(80vw, 320px)", height: "auto", cursor: "none", touchAction: "none", imageRendering: "auto" }}
              />
              {over && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/92">
                  <p className="text-2xl font-black text-stone-700">🌰 {score}</p>
                  <p className="text-xs font-bold text-stone-400">seeds caught</p>
                  {score > 0 && score >= (high?.score || 0) && <p className="text-xs font-extrabold text-emerald-500">new high score! 🎉</p>}
                  <button onClick={begin} className="mt-1 rounded-full px-4 py-2 text-sm font-extrabold transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: "#C5EBD5", color: "#3F7C5C", border: "1.5px solid #A2DCBA" }}>Play again</button>
                </div>
              )}
            </div>
            <p className="mt-2 text-center text-[11px] text-stone-400">Move to catch 🌰 · dodge 🌶️ · 3 lives</p>
          </div>
        </div>
      )}
    </>
  );
}
