// The street's shared drawing kit. One hidden <svg> holds the patterns and the props every scene
// reuses through <use>. It is sized to zero, never display:none, because Firefox drops patterns
// that live in a display:none svg. Everything here is decoration and carries aria-hidden.
import type { CSSProperties, ReactNode } from "react";

export const INK = "#1B1A2E";

export function WorldDefs() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} focusable="false">
      <defs>
        <pattern id="kb-dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.1" fill={INK} />
        </pattern>
        <pattern id="kb-slats" width="40" height="24" patternUnits="userSpaceOnUse">
          <rect width="40" height="20" fill="#13A89E" />
          <rect y="20" width="40" height="2" fill="#0D7F77" />
          <rect y="22" width="40" height="2" fill="#6FD3C9" />
        </pattern>
        <pattern id="kb-bricks" width="60" height="24" patternUnits="userSpaceOnUse">
          <path d="M0 11h60M0 23h60M20 0v11M50 12v11" stroke="#8E3423" strokeWidth="2" fill="none" />
        </pattern>
        <pattern id="kb-tiles" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="#EED9B5" />
          <path d="M0 47.5h48M47.5 0v48" stroke="#D9C49E" strokeWidth="2" fill="none" />
        </pattern>

        <symbol id="register" overflow="visible">
          <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
            <rect width="140" height="36" rx="4" fill="var(--reg, #D11F5C)" />
            <path d="M126 4v28M131 4v28M136 4v28" stroke="#FFF4DE" strokeWidth="2" />
            <rect x="34" y="11" width="56" height="14" rx="2" fill="#FFF4DE" strokeWidth="2" />
          </g>
        </symbol>
        <symbol id="tiffin" overflow="visible">
          <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
            <path d="M8 2 C8 -14 38 -14 38 2" fill="none" />
            <rect y="2" width="46" height="20" rx="6" fill="#9AA6B2" />
            <rect y="22" width="46" height="20" rx="6" fill="#9AA6B2" />
            <rect y="42" width="46" height="20" rx="6" fill="#9AA6B2" />
            <rect x="-4" y="8" width="6" height="48" rx="2" fill={INK} />
            <rect x="44" y="8" width="6" height="48" rx="2" fill={INK} />
          </g>
        </symbol>
        <symbol id="kettle" overflow="visible">
          <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
            <path d="M58 26 L84 12 L86 18 L62 36 Z" fill="#9AA6B2" />
            <ellipse cx="32" cy="30" rx="32" ry="26" fill="#9AA6B2" />
            <path d="M12 10 C12 -8 52 -8 52 10" fill="none" strokeWidth="3" />
            <circle cx="32" cy="4" r="5" fill={INK} />
            <path d="M10 30 Q32 38 54 30" fill="none" stroke="#FFF4DE" strokeWidth="2" />
          </g>
        </symbol>
        <symbol id="glass" overflow="visible">
          <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
            <path d="M0 0 H16 L13 22 H3 Z" fill="#FFF4DE" />
            <path d="M1.4 9 H14.6 L13 22 H3 Z" fill="#C8792E" />
          </g>
        </symbol>
        <symbol id="peg" overflow="visible">
          <g stroke={INK} strokeWidth="2">
            <rect width="10" height="34" rx="2" fill="#8A4B2A" />
            <circle cx="5" cy="14" r="2.5" fill="#9AA6B2" />
          </g>
        </symbol>
        <symbol id="pot-plant" overflow="visible">
          <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
            <ellipse cx="30" cy="-6" rx="10" ry="26" fill="#2E8B57" transform="rotate(-30 30 -6)" />
            <ellipse cx="18" cy="2" rx="9" ry="22" fill="#2E8B57" transform="rotate(-62 18 2)" />
            <ellipse cx="42" cy="2" rx="9" ry="22" fill="#2E8B57" transform="rotate(62 42 2)" />
            <ellipse cx="32" cy="-14" rx="8" ry="24" fill="#2E8B57" transform="rotate(8 32 -14)" />
            <ellipse cx="44" cy="-8" rx="8" ry="20" fill="#2E8B57" transform="rotate(38 44 -8)" />
            <path d="M6 18 H54 L48 60 H12 Z" fill="#B5452E" />
            <path d="M4 12 H56 V22 H4 Z" fill="#8E3423" />
          </g>
        </symbol>
        <symbol id="dumbbell" overflow="visible">
          <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
            <rect x="16" y="14" width="30" height="8" rx="2" fill="#9AA6B2" />
            <path d="M18 18 l-9 -15.6 h-18 l-9 15.6 l9 15.6 h18 Z" fill="#2B2A40" />
            <path d="M80 18 l-9 -15.6 h-18 l-9 15.6 l9 15.6 h18 Z" fill="#2B2A40" />
            <path d="M-6 6 h12 M-6 30 h12 M56 6 h12 M56 30 h12" stroke="var(--band, #D11F5C)" strokeWidth="4" />
          </g>
        </symbol>
        <symbol id="water-tank" overflow="visible">
          <g stroke={INK} strokeWidth="2.5">
            {/* the black rooftop tank: a domed drum on two legs, a lid, two moulded ribs */}
            <path d="M0 12 Q0 0 18 0 Q36 0 36 12 V40 H0 Z" fill={INK} />
            <path d="M3 20h30M3 31h30" stroke="#4A4760" strokeWidth="2.5" />
            <rect x="12" y="-5" width="12" height="6" rx="2" fill="#4A4760" />
            <path d="M5 40v7M31 40v7" strokeWidth="3" />
          </g>
        </symbol>
        <symbol id="dish" overflow="visible">
          <g stroke={INK} strokeWidth="2.5">
            <path d="M16 6 L22 34" />
            <ellipse cx="16" cy="6" rx="16" ry="7" fill="#F3F1E7" transform="rotate(-25 16 6)" />
            <circle cx="16" cy="6" r="2" fill={INK} />
          </g>
        </symbol>
        <symbol id="bulb" overflow="visible">
          <circle r="6" fill="#FFF1C9" stroke={INK} strokeWidth="1.5" />
          <path d="M-2.4 1 q1.2 -2.6 2.4 0 q1.2 2.6 2.4 0" fill="none" stroke="#C8792E" strokeWidth="1.1" />
        </symbol>
        <symbol id="trophy" overflow="visible">
          <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
            <path d="M6 4 C-6 4 -4 20 10 20 M34 4 C46 4 44 20 30 20" fill="none" />
            <path d="M6 0 H34 V12 C34 26 6 26 6 12 Z" fill="#FFC21A" />
            <rect x="16" y="22" width="8" height="8" fill="#FFC21A" />
            <rect x="8" y="30" width="24" height="8" rx="2" fill="#8A4B2A" />
          </g>
        </symbol>
        <symbol id="books" overflow="visible">
          <g stroke={INK} strokeWidth="2.5">
            <rect x="0" y="28" width="70" height="14" rx="2" fill="#D11F5C" />
            <rect x="4" y="14" width="70" height="14" rx="2" fill="#FFC21A" />
            <rect x="-2" y="0" width="70" height="14" rx="2" fill="#13A89E" />
          </g>
        </symbol>
        <symbol id="laptop" overflow="visible">
          <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
            <rect x="6" y="0" width="88" height="58" rx="5" fill={INK} />
            <rect x="12" y="6" width="76" height="46" fill="#FFF4DE" strokeWidth="1.5" />
            <path d="M12 17.5h76M12 29h76M12 40.5h76M24.7 6v46M37.3 6v46M50 6v46M62.7 6v46M75.3 6v46" stroke={INK} strokeWidth="1" opacity=".35" />
            <rect x="24.7" y="17.5" width="12.6" height="11.5" fill="#FFC21A" strokeWidth="1" />
            <rect x="62.7" y="29" width="12.6" height="11.5" fill="#FFC21A" strokeWidth="1" />
            <rect x="37.3" y="40.5" width="12.6" height="11.5" fill="#FFC21A" strokeWidth="1" />
            <rect x="12" y="6" width="12.7" height="11.5" fill="#FFC21A" strokeWidth="1" />
            <path d="M0 58 H100 L94 66 H6 Z" fill="#9AA6B2" />
          </g>
        </symbol>
        <symbol id="note" overflow="visible">
          <g stroke={INK} strokeWidth="1.5">
            <rect width="34" height="16" rx="2" fill="#FFE7B8" />
            <path d="M13 4.5h8M13 7.5h8M15 4.5c4 0 5 1 5 2.5s-2 2.5-5 2.5l5 3.5" fill="none" />
          </g>
        </symbol>
        <symbol id="qr-standee" overflow="visible">
          <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
            <path d="M14 100 L32 82 L50 100 Z" fill="#8A4B2A" />
            <rect width="64" height="86" rx="6" fill="#FFF4DE" />
            <rect x="10" y="10" width="44" height="44" fill="#FFFBF2" strokeWidth="1.5" />
            <g fill={INK} stroke="none">
              <rect x="12" y="12" width="12" height="12" />
              <rect x="40" y="12" width="12" height="12" />
              <rect x="12" y="40" width="12" height="12" />
              <rect x="28" y="14" width="6" height="6" />
              <rect x="28" y="28" width="6" height="6" />
              <rect x="40" y="30" width="6" height="6" />
              <rect x="28" y="42" width="6" height="6" />
              <rect x="44" y="44" width="8" height="8" />
              <rect x="16" y="30" width="6" height="6" />
            </g>
            <rect x="10" y="62" width="44" height="14" rx="3" fill="#FF8A00" strokeWidth="1.5" />
          </g>
        </symbol>
        <symbol id="chair-white" overflow="visible">
          <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round" fill="#FFFBF2">
            <path d="M6 0 L18 -112 M102 0 L90 -112 M30 0 L36 -100 M78 0 L72 -100" fill="none" strokeWidth="5" />
            <path d="M6 0 L18 -112 M102 0 L90 -112 M30 0 L36 -100 M78 0 L72 -100" fill="none" stroke="#FFFBF2" strokeWidth="2" />
            <rect x="8" y="-124" width="92" height="18" rx="9" />
            <path d="M14 -122 L4 -232 C4 -246 104 -246 104 -232 L94 -122 Z" />
            <path d="M24 -150 H84 M22 -176 H86 M20 -202 H88" fill="none" strokeWidth="2" />
          </g>
        </symbol>
        <symbol id="scooter" overflow="visible">
          <g stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
            <circle cx="60" cy="130" r="40" fill={INK} />
            <circle cx="60" cy="130" r="16" fill="#FFF4DE" />
            <circle cx="240" cy="130" r="40" fill={INK} />
            <circle cx="240" cy="130" r="16" fill="#FFF4DE" />
            <path d="M20 120 C20 70 60 56 110 60 L190 60 C206 60 210 74 206 92 L200 118 L100 120 Z" fill="var(--scoot, #1565D8)" />
            <path d="M200 118 L222 30 L246 30 C262 30 270 50 262 72 L250 112 C246 122 236 126 226 124 Z" fill="var(--scoot, #1565D8)" />
            <rect x="60" y="44" width="110" height="20" rx="10" fill={INK} />
            <path d="M226 30 L232 4 M214 4 H250" fill="none" strokeWidth="5" />
            <circle cx="262" cy="56" r="10" fill="#FFC21A" />
            <path d="M196 90 H130" fill="none" stroke="#FFF4DE" strokeWidth="3" />
          </g>
        </symbol>
        <symbol id="kb-mark" overflow="visible">
          <path d="M7 11 C7 2 21 2 21 11" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="14" cy="17" r="10" fill="#FF8A00" stroke={INK} strokeWidth="2" />
          <path d="M8 14h12M8 17h12M8 20h12" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
        </symbol>
      </defs>
    </svg>
  );
}

/** Riso dot overlay on a big flat fill. */
export function Dots({ x, y, w, h, o = 0.1 }: { x: number; y: number; w: number; h: number; o?: number }) {
  return <rect x={x} y={y} width={w} height={h} fill="url(#kb-dots)" opacity={o} />;
}

/** A prop from the kit, placed by its top-left corner. `d` is its reveal delay in ms. */
export function Use({ id, x, y, s, rot, style, d, cls, keep }: { id: string; x: number; y: number; s?: number; rot?: number; style?: CSSProperties; d?: number; cls?: string; keep?: string }) {
  const tf = [s ? `scale(${s})` : "", rot ? `rotate(${rot})` : ""].filter(Boolean).join(" ");
  const node = <use href={`#${id}`} x={s ? x / s : x} y={s ? y / s : y} transform={tf || undefined} />;
  if (d == null && !cls && !style && !keep) return node;
  return (
    <g className={[d != null ? "rv" : "", cls ?? ""].join(" ").trim() || undefined} style={{ ...(d != null ? ({ "--d": `${d}ms` } as CSSProperties) : {}), ...style }} data-keepout={keep}>
      {node}
    </g>
  );
}

/** A plane of the art. Every scene stacks three or four of these. */
export function Plane({ children, cls = "", vh = 840, anchor = "xMinYMax" }: { children: ReactNode; cls?: string; vh?: number; anchor?: "xMinYMax" | "xMidYMax" }) {
  return (
    // anchored on the ground: when a wide scene is taller than the art, the sky is what gets
    // cropped (and the right-hand side, which sits under the demo), never the pavement
    <svg className={`plane world ${cls}`} viewBox={`0 0 1440 ${vh}`} preserveAspectRatio={`${anchor} slice`} aria-hidden focusable="false">
      {children}
    </svg>
  );
}

/** A cream speech bubble with an ink stroke and a tail pointing at the speaker. */
export function Bubble({ x, y, w, h = 60, text, tail = "bl", size = 23, cls }: { x: number; y: number; w: number; h?: number; text: string; tail?: "bl" | "br" | "bc"; size?: number; cls?: string }) {
  const tx = tail === "bl" ? x + 30 : tail === "br" ? x + w - 30 : x + w / 2;
  return (
    <g className={cls} aria-hidden>
      <path d={`M${tx - 12} ${y + h - 2} L${tx - 4} ${y + h + 22} L${tx + 14} ${y + h - 2} Z`} fill="#FFF4DE" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x={x} y={y} width={w} height={h} rx="18" fill="#FFF4DE" stroke={INK} strokeWidth="2.5" />
      <path d={`M${tx - 10} ${y + h - 1.5} H${tx + 12}`} stroke="#FFF4DE" strokeWidth="4" />
      <text x={x + w / 2} y={y + h / 2 + size * 0.36} textAnchor="middle" fontSize={size} fontWeight={700} fill={INK} style={{ fontFamily: "var(--font-sans)" }}>
        {text}
      </text>
    </g>
  );
}

/** Four-point sparkle star. */
export function Star({ x, y, r = 6, fill = "#FFF4DE" }: { x: number; y: number; r?: number; fill?: string }) {
  return <path d={`M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r} Z`} fill={fill} />;
}

/** Deterministic blink timing per character, so the server and the browser agree. */
export function blink(seed: string): CSSProperties {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const dur = 4 + (h % 30) / 10;
  const delay = (h % 17) / 10;
  return { "--blink-dur": `${dur}s`, "--blink-delay": `${delay}s` } as CSSProperties;
}
