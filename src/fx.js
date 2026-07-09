/* Tiny delight utilities: confetti burst + sound effects (no deps). */

// ---- Confetti -------------------------------------------------------------
export function burstConfetti(x, y) {
  if (typeof document === "undefined") return;
  x = x == null ? window.innerWidth / 2 : x;
  y = y == null ? window.innerHeight / 3 : y;
  var cv = document.createElement("canvas");
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  cv.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9998;";
  document.body.appendChild(cv);
  var ctx = cv.getContext("2d");
  var colors = ["#B9DAE7", "#FFDFD3", "#C5EBD5", "#FFE9B0", "#FF9EBB", "#7FC8A9"];
  var parts = [];
  for (var i = 0; i < 110; i++) {
    parts.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 11,
      vy: -Math.random() * 13 - 4,
      g: 0.32 + Math.random() * 0.22,
      r: 3 + Math.random() * 4,
      c: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.45,
    });
  }
  var start = performance.now(), raf;
  function frame(t) {
    var el = t - start;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - el / 2300);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
      ctx.restore();
    }
    if (el < 2400) raf = requestAnimationFrame(frame);
    else { cancelAnimationFrame(raf); cv.remove(); }
  }
  raf = requestAnimationFrame(frame);
}

// ---- Sound ----------------------------------------------------------------
var SND_KEY = "site.sound.muted";
var ac = null;
export var sound = {
  muted: (function () { try { return localStorage.getItem(SND_KEY) === "1"; } catch (e) { return false; } })(),
  toggle: function () {
    this.muted = !this.muted;
    try { localStorage.setItem(SND_KEY, this.muted ? "1" : "0"); } catch (e) {}
    return this.muted;
  },
  blip: function (freq, dur, type) {
    if (this.muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || "sine";
      o.frequency.value = freq || 660;
      var d = dur || 0.08;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.14, ac.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + d);
    } catch (e) {}
  },
  pop: function () { this.blip(720, 0.07); },
  yay: function () {
    var self = this;
    [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { self.blip(f, 0.13); }, i * 80); });
  },
};
