"use client";
// The gym, drawn: bumper plates, barbells, the laminated ID card, rubber stamps,
// chalk strokes and magnets. All SVG/CSS; nothing here is a stock image.
import { motion, type Transition } from "motion/react";
import { useId, type CSSProperties, type ReactNode } from "react";
import { initials } from "@/lib/core/money";
import type { PlateKey } from "@/lib/core/types";

export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 32, mass: 1 };
export const PLATE_SPRING: Transition = { type: "spring", stiffness: 420, damping: 30, mass: 1.4 };
export const EASE_DOOR = [0.65, 0, 0.35, 1] as const;

export const PLATE: Record<PlateKey, { fill: string; ink: string; kg: string; frac: number; en: string; hi: string }> = {
  p25: { fill: "var(--plate-25)", ink: "var(--chalk)", kg: "25", frac: 1, en: "LAPSED", hi: "ख़त्म" },
  p20: { fill: "var(--plate-20)", ink: "var(--chalk)", kg: "20", frac: 1, en: "DUE", hi: "बाकी" },
  p15: { fill: "var(--plate-15)", ink: "var(--iron-rim)", kg: "15", frac: 0.75, en: "ENDS SOON", hi: "जल्द" },
  p10: { fill: "var(--plate-10)", ink: "var(--iron-rim)", kg: "10", frac: 0.5, en: "THIS WEEK", hi: "इस हफ़्ते" },
  p5: { fill: "var(--plate-5)", ink: "var(--iron-rim)", kg: "5", frac: 0.25, en: "NEXT WEEK", hi: "अगले हफ़्ते" },
  iron: { fill: "var(--plate-iron)", ink: "var(--chalk)", kg: "", frac: 0, en: "ACTIVE", hi: "चालू" },
};

/** Stable angle per event id, so the same stamp always lands the same way. */
export function seededAngle(seed: string, lo = -6, hi = 3) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return lo + ((h >>> 0) % 1000) / 1000 * (hi - lo);
}

function arc(cx: number, cy: number, r0: number, r1: number, frac: number) {
  if (frac >= 0.999) return `M${cx - r1},${cy} a${r1},${r1} 0 1,0 ${r1 * 2},0 a${r1},${r1} 0 1,0 ${-r1 * 2},0 M${cx - r0},${cy} a${r0},${r0} 0 1,1 ${r0 * 2},0 a${r0},${r0} 0 1,1 ${-r0 * 2},0`;
  const a = frac * Math.PI * 2;
  const s = -Math.PI / 2;
  const p = (r: number, t: number) => `${cx + r * Math.cos(t)},${cy + r * Math.sin(t)}`;
  const large = frac > 0.5 ? 1 : 0;
  return `M${p(r1, s)} A${r1},${r1} 0 ${large},1 ${p(r1, s + a)} L${p(r0, s + a)} A${r0},${r0} 0 ${large},0 ${p(r0, s)} Z`;
}

/** A bumper plate seen face on. The coloured rubber covers a share of the ring
 *  (full, three-quarter, half, quarter, none) so the state never relies on colour alone. */
export function Plate({ state, size = 40, label, frozen, ring, rim, className, title }: { state: PlateKey; size?: number; label?: string; frozen?: boolean; ring?: number; rim?: string; className?: string; title?: string }) {
  const c = PLATE[state];
  const uid = useId().replace(/:/g, "");
  const big = size >= 90;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={title ?? `${c.en}${label ? ` ${label}` : ""}`}>
      <circle cx="50" cy="50" r="48" fill="var(--plate-iron)" stroke="var(--iron-rim)" strokeWidth="2" />
      {c.frac > 0 && <path d={arc(50, 50, 22, 47, c.frac)} fill={c.fill} fillRule="evenodd" />}
      <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1" strokeDasharray="1 3" />
      {state === "p25" && (
        <g>
          <rect x="44" y="0" width="12" height="11" fill={`url(#hz-${uid})`} />
          <pattern id={`hz-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="6" fill="var(--hazard)" />
            <rect x="3" width="3" height="6" fill="var(--iron-rim)" />
          </pattern>
        </g>
      )}
      {frozen && (
        <>
          <pattern id={`fz-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
            <rect width="5" height="5" fill="var(--stamp-freeze)" opacity=".55" />
            <rect width="1.5" height="5" fill="#dfe9f1" opacity=".8" />
          </pattern>
          <circle cx="50" cy="50" r="47" fill={`url(#fz-${uid})`} />
        </>
      )}
      {ring != null && (
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--brass-hi)" strokeWidth="4" strokeDasharray={`${Math.max(0, Math.min(1, ring)) * 276.5} 400`} transform="rotate(-90 50 50)" strokeLinecap="butt" />
      )}
      {big && rim && (
        <>
          <path id={`rim-${uid}`} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" fill="none" />
          <text fontSize="7.5" letterSpacing="1.4" fill="var(--chalk)" opacity=".75" className="t-mono">
            <textPath href={`#rim-${uid}`} startOffset="0">
              {rim}
            </textPath>
          </text>
        </>
      )}
      <circle cx="50" cy="50" r="20" fill="var(--iron)" stroke="var(--iron-rim)" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="7" fill="var(--steel-lo)" stroke="var(--steel-hi)" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="3.5" fill="var(--iron-rim)" />
      {(label ?? c.kg) && (
        <text x="50" y={big ? 33 : 34} textAnchor="middle" fontSize={big ? 11 : 15} fill={c.frac >= 0.75 ? c.ink : "var(--chalk)"} className="t-stencil" style={{ fontWeight: 800 }}>
          {label ?? c.kg}
        </text>
      )}
    </svg>
  );
}

/** Side view of a plate on a sleeve. */
export function PlateSide({ state, h = 60, w = 12, frozen }: { state: PlateKey | "brass"; h?: number; w?: number; frozen?: boolean }) {
  const fill = state === "brass" ? "var(--brass)" : PLATE[state].fill;
  return (
    <span
      className="relative inline-block shrink-0"
      style={{
        width: w,
        height: h,
        background: fill,
        borderRadius: 2,
        boxShadow: "inset 2px 0 0 rgba(255,255,255,.18), inset -2px 0 0 rgba(0,0,0,.35)",
        border: "1px solid var(--iron-rim)",
      }}
    >
      {frozen && <span className="absolute inset-0" style={{ background: "repeating-linear-gradient(-35deg, rgba(60,110,145,.75) 0 3px, rgba(223,233,241,.7) 3px 4.5px)" }} />}
    </span>
  );
}

export function Collar({ h = 26 }: { h?: number }) {
  return (
    <span
      className="inline-block shrink-0"
      style={{ width: 10, height: h, background: "repeating-linear-gradient(to right, #7b5e33 0 1px, var(--brass-hi) 1px 4px)", border: "1px solid #6d5430", borderRadius: 1 }}
    />
  );
}

/** A loaded barbell. plates: outermost last. bend in degrees, ends droop under load. */
export function Barbell({ left, right, bend = 0, sleeve, children, height = 120, label }: { left: ReactNode; right?: ReactNode; bend?: number; sleeve?: ReactNode; children?: ReactNode; height?: number; label?: string }) {
  return (
    <div className="relative flex w-full items-center justify-center" style={{ height }} aria-label={label}>
      <motion.div className="flex flex-1 items-center justify-end" style={{ transformOrigin: "100% 50%" }} animate={{ rotate: -bend }} transition={PLATE_SPRING}>
        {sleeve}
        <span className="block h-[10px] w-6 shrink-0" style={{ background: "linear-gradient(var(--steel-hi), var(--steel-lo))" }} />
        <span className="flex items-center gap-[2px]">{left}</span>
        <Collar />
        <span className="block h-[8px] flex-1 knurl" style={{ minWidth: 20 }} />
      </motion.div>
      <span className="block h-[8px] w-10 shrink-0" style={{ background: "linear-gradient(var(--steel-hi), var(--steel-lo))" }} />
      <motion.div className="flex flex-1 items-center justify-start" style={{ transformOrigin: "0% 50%" }} animate={{ rotate: bend }} transition={PLATE_SPRING}>
        <span className="block h-[8px] flex-1 knurl" style={{ minWidth: 20 }} />
        <Collar />
        <span className="flex flex-row-reverse items-center gap-[2px]">{right ?? left}</span>
        <span className="block h-[10px] w-6 shrink-0" style={{ background: "linear-gradient(var(--steel-hi), var(--steel-lo))" }} />
      </motion.div>
      {children}
    </div>
  );
}

const STAMP_COLOR = { paid: "var(--stamp-paid)", due: "var(--stamp-due)", freeze: "var(--stamp-freeze)", pending: "var(--stamp-pending)", lapsed: "var(--stamp-due)", closed: "var(--stamp-paid)" };
export type StampKind = keyof typeof STAMP_COLOR;

/** A rubber stamp: double rounded border, rough ink edge, seeded angle. */
export function Stamp({ kind, word, sub, seed, size = 1, drop = true, className, style }: { kind: StampKind; word: string; sub?: string; seed: string; size?: number; drop?: boolean; className?: string; style?: CSSProperties }) {
  const color = STAMP_COLOR[kind];
  const angle = seededAngle(seed);
  const w = Math.max(88, word.length * 17 + 30) * size;
  const h = (sub ? 58 : 46) * size;
  return (
    <motion.span
      className={`pointer-events-none inline-block ${className ?? ""}`}
      style={{ rotate: angle, ...style }}
      initial={drop ? { scale: 1.3, opacity: 0, y: -24 } : false}
      animate={{ scale: 1, scaleY: [1, 0.98, 1], opacity: 1, y: [-24, 2, 0] }}
      transition={{ default: { duration: 0.12, ease: [0.2, 0, 0, 1] }, scaleY: { delay: 0.12, duration: 0.08 }, y: { duration: 0.2, times: [0, 0.6, 1] } }}
      aria-label={sub ? `${word} ${sub}` : word}
      role="img"
    >
      <svg width={w} height={h} viewBox={`0 0 ${w / size} ${h / size}`} className="fx-filter" style={{ filter: "url(#stamp-ink)" }}>
        <rect x="2" y="2" width={w / size - 4} height={h / size - 4} rx="7" fill="none" stroke={color} strokeWidth="3" />
        <rect x="6.5" y="6.5" width={w / size - 13} height={h / size - 13} rx="4" fill="none" stroke={color} strokeWidth="1.4" />
        <text x={w / size / 2} y={sub ? 30 : 31} textAnchor="middle" fontSize="24" fill={color} className="t-stencil" style={{ fontWeight: 800, letterSpacing: 1 }}>
          {word}
        </text>
        {sub && (
          <text x={w / size / 2} y="47" textAnchor="middle" fontSize="12" fill={color} className="t-mono">
            {sub}
          </text>
        )}
      </svg>
    </motion.span>
  );
}

/** A chalk line that writes itself on. */
export function ChalkPath({ d, delay = 0, width = 2.4, color = "var(--chalk)", duration = 0.45 }: { d: string; delay?: number; width?: number; color?: string; duration?: number }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      className="fx-filter"
      style={{ filter: "url(#chalk)" }}
      initial={{ pathLength: 0, opacity: 0.2 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration, delay, ease: [0.4, 0, 0.2, 1] }}
    />
  );
}

export function InkTick({ size = 18, color = "var(--ink)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <motion.path d="M3 11 L8 16 L17 4" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.18 }} />
    </svg>
  );
}

/** Tally marks in groups of five, drawn stroke by stroke. */
export function Tally({ n, smudged, hatched, delay = 0, color = "var(--chalk)" }: { n: number; smudged?: boolean; hatched?: boolean; delay?: number; color?: string }) {
  const groups = Math.ceil(n / 5);
  const w = Math.max(1, groups) * 26;
  return (
    <svg width={w} height="24" viewBox={`0 0 ${w} 24`} style={{ opacity: smudged ? 0.35 : 1 }} aria-label={`${n} visits`}>
      {hatched && <rect width={w} height="24" fill="url(#frost)" opacity=".7" />}
      {Array.from({ length: n }, (_, i) => {
        const g = Math.floor(i / 5);
        const k = i % 5;
        const x = g * 26 + 3 + k * 4.5;
        const d = k === 4 ? `M${g * 26 + 1},18 L${g * 26 + 21},5` : `M${x},4 L${x + 0.8},20`;
        return <ChalkPath key={i} d={d} delay={delay + i * 0.04} width={2} color={color} duration={0.12} />;
      })}
      {smudged && <path d={`M0,14 C${w / 3},10 ${w / 2},18 ${w},12`} stroke={color} strokeWidth="7" opacity=".18" fill="none" />}
    </svg>
  );
}

/** Round whiteboard magnet in a bumper colour, highlight at 30%/30%. */
export function Magnet({ state, size = 28, text, pin }: { state: PlateKey; size?: number; text: string; pin?: boolean }) {
  const c = PLATE[state];
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center rounded-full t-teko"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,.55), transparent 38%), ${c.fill}`,
        color: c.frac >= 0.75 || state === "iron" ? c.ink : "var(--iron-rim)",
        fontSize: size * 0.42,
        boxShadow: "0 2px 0 rgba(0,0,0,.35), inset 0 -2px 0 rgba(0,0,0,.2)",
        border: "1px solid rgba(0,0,0,.35)",
      }}
    >
      {text}
      {pin && <span className="absolute -right-1 -top-1 block size-3 rounded-full border border-black/40" style={{ background: "var(--brass-hi)" }} />}
    </span>
  );
}

/** Halftone photo, or initials when there is none. */
export function Portrait({ name, photo, size = 64 }: { name: string; photo: string | null; size?: number }) {
  if (photo)
    return (
      <span className="relative block overflow-hidden" style={{ width: size, height: size * 1.2, background: "#cfcabd" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" className="h-full w-full object-cover" style={{ filter: "grayscale(1) contrast(1.4)" }} />
        <span className="absolute inset-0" style={{ background: "radial-gradient(circle, transparent 0.9px, rgba(237,234,226,.35) 1.2px) 0 0 / 3px 3px" }} />
      </span>
    );
  return (
    <span className="grid place-items-center t-stencil" style={{ width: size, height: size * 1.2, background: "repeating-linear-gradient(135deg, #d9d4c6 0 2px, #e4e0d3 2px 5px)", color: "#5a564c", fontSize: size * 0.42 }}>
      {initials(name)}
    </span>
  );
}

export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id="chalk" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
        <filter id="stamp-ink" x="-5%" y="-5%" width="110%" height="110%">
          <feMorphology operator="erode" radius="0.6" in="SourceGraphic" result="e" />
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="7" result="n" />
          <feDisplacementMap in="e" in2="n" scale="1.6" result="d" />
          <feComponentTransfer in="n" result="holes">
            <feFuncA type="discrete" tableValues="1 1 1 0.25 1 1" />
          </feComponentTransfer>
          <feComposite in="d" in2="holes" operator="in" />
        </filter>
        <pattern id="frost" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <rect width="1.6" height="5" fill="var(--stamp-freeze)" />
        </pattern>
      </defs>
    </svg>
  );
}

// ---------- icons: hand-drawn, one 1.75 px stroke ----------
type IconName = "plate" | "card" | "stamp" | "magnet" | "shutter" | "rupee" | "qr" | "bubble" | "eraser" | "scanner";
const PATHS: Record<IconName, string> = {
  plate: "M10 2.5a7.5 7.5 0 1 0 .01 0M10 7a3 3 0 1 0 .01 0",
  card: "M2.5 5.5h15v10h-15zM8 5.5V4h4v1.5M5 9.5h4M5 12h6M13 9a1.5 1.5 0 1 0 .01 0",
  stamp: "M7 3h6v5l3 3H4l3-3zM3.5 14h13v2.5h-13z",
  magnet: "M10 3.5a6 6 0 1 0 .01 0M7.5 7.3a2 2 0 0 1 2-1.3",
  shutter: "M3 3h14v14H3zM3 6.5h14M3 10h14M3 13.5h14M9 17v-2h2v2",
  rupee: "M5 4h10M5 7.5h10M8 4c4 0 4 7 0 7H6l7 6",
  qr: "M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h2v2M15 15h2v2M12 16h1M16 12h1",
  bubble: "M3.5 4.5h13v9h-7l-4 3v-3h-2z",
  eraser: "M3 13l7-7 6 6-4 4H6zM8 16h9",
  scanner: "M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4M5 10h10",
};
export function Icon({ name, size = 20, className, title }: { name: IconName; size?: 16 | 20 | 28; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden={!title} role={title ? "img" : undefined} aria-label={title}>
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
