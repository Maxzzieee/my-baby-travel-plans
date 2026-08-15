import React from "react";

// Pixel-art botanicals that match the 8-bit sky (pixel sun/moon/stars). Rendered
// as crisp SVG rects — no image files, transparent, theme-friendly. Sprites are
// row-strings; each char maps to a palette colour (space = empty).
const PALETTE = {
  D: "#146aa8", M: "#2f9ad8", L: "#78d0f2", K: "#33303a", // butterfly (blue morpho)
  W: "#ffffff", P: "#f6b8cb", Y: "#ffd45e",               // blossom
  G: "#4f8f3e", g: "#79bd60", C: "#e6f0d2", S: "#4e7d3e", // ivy (variegated)
};

export const DECOR_SPRITES = {
  BUTTERFLY: ["    KK KK    ", " DMMDKKKDMMD ", "DMLLMDKDMLLMD", "DLLLLMKMLLLLD", "DMLLLDKDLLLMD", " MMMM K MMMM ", "  DDMMKMMDD  ", " DLLLMKMLLLD ", " DMLLMKMLLMD ", "  DMMD DMMD  "],
  BLOSSOM: ["   PWP   ", "   WWW   ", " WWPWPWW ", "PWWWYWWWP", "PWWYYYWWP", " PWWYWPP ", " WWWWWWW ", "  WWPWW  "],
  IVY: ["       S       ", "        S   C  ", "        S  CgC ", "         SCgGgC", "         S CgC ", "         S  C  ", "          S    ", "       C  S    ", "      CgC S    ", "     CgGgCS    ", "      CgC S    ", "       C  S    ", "         S     ", "         S C   ", "         SCgC  ", "        SCgGgC ", "        S CgC  ", "       S   C   ", "       S       ", "  C   S        ", " CgC  S        ", "CgGgCS         ", " CgC S         ", "  C S          ", "    S          ", "    S  C       ", "    S CgC      ", "    SCgGgC     ", "    S CgC      ", "    S  C       ", "     S         ", "   C S         ", "  CgC S        ", " CgGgCS        ", "  CgC  S       ", "   C   S       ", "        S      ", "        S      ", "         S     ", "         S     "],
  LEAF: ["  C  ", " CgC ", "CgGgC", " CgC ", "  C  "],
};

function PixelSprite({ rows, className, style }) {
  const w = rows[0].length, h = rows.length;
  const rects = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const fill = PALETTE[rows[y][x]];
      if (fill) rects.push(<rect key={x + "," + y} x={x} y={y} width="1.02" height="1.02" fill={fill} />);
    }
  }
  return (
    <svg className={className} style={style} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {rects}
    </svg>
  );
}

// Hidden easter egg: a burst of butterflies / leaves / blossoms flying out from
// a point (triggered by rapid-clicking). Auto-removes via onDone.
export function Bloom({ x, y, onDone }) {
  const parts = React.useMemo(() => {
    const kinds = ["BUTTERFLY", "BLOSSOM", "LEAF", "BLOSSOM", "LEAF"];
    return Array.from({ length: 14 }, (_, i) => {
      const ang = Math.random() * Math.PI * 2;
      const dist = 55 + Math.random() * 95;
      return {
        id: i,
        kind: kinds[Math.floor(Math.random() * kinds.length)],
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist - 35, // bias upward
        rot: Math.random() * 130 - 65,
        scale: 0.55 + Math.random() * 0.7,
        delay: Math.random() * 0.12,
        size: 20 + Math.random() * 22,
      };
    });
  }, []);
  React.useEffect(() => { const t = setTimeout(onDone, 1700); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="bloom" style={{ left: x, top: y }} aria-hidden="true">
      {parts.map((p) => (
        <PixelSprite
          key={p.id}
          rows={DECOR_SPRITES[p.kind]}
          className="bloom-part"
          style={{ width: p.size, "--dx": p.dx + "px", "--dy": p.dy + "px", "--rot": p.rot + "deg", "--scale": p.scale, animationDelay: p.delay + "s" }}
        />
      ))}
    </div>
  );
}

// Decorative layer framing the page edges (behind content, pointer-events off).
export function SiteDecor() {
  return (
    <div className="site-decor" aria-hidden="true">
      <PixelSprite rows={DECOR_SPRITES.IVY} className="decor decor-ivy decor-ivy-l" />
      <PixelSprite rows={DECOR_SPRITES.IVY} className="decor decor-ivy decor-ivy-r" />
      <PixelSprite rows={DECOR_SPRITES.BLOSSOM} className="decor decor-blossom decor-blossom-bl" />
      <PixelSprite rows={DECOR_SPRITES.BLOSSOM} className="decor decor-blossom decor-blossom-br" />
      <PixelSprite rows={DECOR_SPRITES.BLOSSOM} className="decor decor-blossom decor-blossom-tr" />
      <PixelSprite rows={DECOR_SPRITES.BLOSSOM} className="decor decor-blossom decor-blossom-tl" />
      <PixelSprite rows={DECOR_SPRITES.BLOSSOM} className="decor decor-blossom decor-blossom-bl2" />
      <PixelSprite rows={DECOR_SPRITES.BUTTERFLY} className="decor decor-butterfly decor-butterfly-1" />
    </div>
  );
}

// Butterflies that flit across the whole screen (above content) on wandering
// paths with beating wings, like they're loose in a vivarium. `rainbow` cycles
// the hue for a rainbow morpho.
export function FlyingButterfly({ variant = 1, rainbow = false }) {
  return (
    <div className={`flyer flyer-p${variant}`} aria-hidden="true">
      <PixelSprite rows={DECOR_SPRITES.BUTTERFLY} className={"flyer-wings" + (rainbow ? " flyer-rainbow" : "")} />
    </div>
  );
}
