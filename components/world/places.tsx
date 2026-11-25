// Places on Khatabar Street that more than one scene draws: the shopfront with its signboard and
// shutter, the chai stall, the counter inside, the window. All coordinates are in the 1440-wide art.
import type { CSSProperties, ReactNode } from "react";
import { Dots, INK, Use } from "./kit";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Flat sky bands, no blending. [y, h, colour][] */
export function Sky({ bands, dots }: { bands: [number, number, string][]; dots?: number }) {
  return (
    <g>
      {bands.map(([y, h, c], i) => (
        <rect key={i} x="0" y={y} width="1440" height={h} fill={c} />
      ))}
      {dots != null && bands[dots] && <Dots x={0} y={bands[dots][0]} w={1440} h={bands[dots][1]} o={0.12} />}
    </g>
  );
}

export function Wires({ paths }: { paths: string[] }) {
  return (
    <g fill="none" stroke={INK} strokeWidth="2">
      {paths.map((p) => (
        <path key={p} d={p} />
      ))}
    </g>
  );
}

export function Pavement({ y = 780, h = 60 }: { y?: number; h?: number }) {
  return (
    <g>
      <rect x="0" y={y} width="1440" height={h} fill="#D9C7A5" />
      <path d={`M0 ${y}H1440`} stroke={INK} strokeWidth="3" />
      <g stroke={INK} strokeWidth="1.5" opacity=".4" fill="none">
        <path d={`M120 ${y + 14} l30 10 l20 -4 M520 ${y + 30} l26 -8 l18 12 M980 ${y + 18} l-20 14 M1300 ${y + 26} l24 6 l14 -10`} />
      </g>
    </g>
  );
}

/** The shop: brick facade, the marigold signboard with 12 bulbs, the opening and its shutter. */
export function Shopfront({
  shutter = "up",
  bulbs = "off",
  inside,
  padlock,
  idp,
}: {
  shutter?: "anim" | "up" | "down";
  bulbs?: "off" | "on" | "reveal";
  inside?: ReactNode;
  padlock?: boolean;
  idp: string;
}) {
  const bulbXs = [690, 790, 890, 990, 1090, 1190];
  return (
    <g>
      <rect x="620" y="230" width="640" height="550" fill="#B5452E" stroke={INK} strokeWidth="2.5" />
      <rect x="620" y="230" width="640" height="550" fill="url(#kb-bricks)" opacity=".75" />
      <Dots x={620} y={230} w={640} h={550} o={0.08} />
      {[680, 1120].map((x) => (
        <g key={x} stroke={INK} strokeWidth="2.5">
          <rect x={x} y="250" width="80" height="70" fill="#24286A" />
          <rect x={x + 8} y="258" width="30" height="54" fill={bulbs === "on" || bulbs === "reveal" ? "#FFE7B8" : "#FFC21A"} strokeWidth="1.5" />
          <path d={`M${x + 40} 250V320`} />
        </g>
      ))}
      {/* the opening */}
      <rect x="700" y="460" width="480" height="320" fill={shutter === "down" ? "#13A89E" : "#FFE7B8"} stroke={INK} strokeWidth="2.5" />
      {shutter !== "down" && inside}
      {shutter !== "up" && (
        <g clipPath={`url(#${idp}-open)`}>
          <g className={shutter === "anim" ? "hero-shutter" : undefined}>
            <rect x="700" y="460" width="480" height="302" fill="url(#kb-slats)" />
            <rect x="700" y="762" width="480" height="18" fill={INK} />
            <rect x="800" y="768" width="40" height="6" rx="3" fill="#FFF4DE" />
            <rect x="1040" y="768" width="40" height="6" rx="3" fill="#FFF4DE" />
            {shutter === "anim" ? (
              <text x="940" y="628" textAnchor="middle" fontSize="26" fill="#FFF4DE" transform="rotate(-2 940 620)">
                Shutter up! Counter khul gaya.
              </text>
            ) : (
              <text x="940" y="628" textAnchor="middle" fontSize="26" fill="#FFF4DE" transform="rotate(-2 940 620)">
                Kal subah 5:30
              </text>
            )}
            {padlock && (
              <g stroke={INK} strokeWidth="2.5">
                <path d="M928 742 C928 720 952 720 952 742" fill="none" strokeWidth="5" />
                <rect x="920" y="740" width="40" height="32" rx="6" fill="#FFC21A" />
                <circle cx="940" cy="754" r="4" fill={INK} />
              </g>
            )}
          </g>
        </g>
      )}
      <defs>
        <clipPath id={`${idp}-open`}>
          <rect x="700" y="460" width="480" height="320" />
        </clipPath>
      </defs>
      <rect x="690" y="446" width="500" height="22" rx="11" fill="#0D7F77" stroke={INK} strokeWidth="2.5" />
      {/* the signboard */}
      <g>
        <rect x="660" y="330" width="560" height="110" rx="10" fill="#FFC21A" stroke={INK} strokeWidth="4" />
        <Dots x={662} y={332} w={556} h={106} o={0.08} />
        <use href="#kb-mark" x={690 / 2.6} y={352 / 2.6} transform="scale(2.6)" />
        <text x="760" y="405" fontSize="66" fill={INK}>
          KHATABAR
        </text>
        <text x="762" y="430" fontSize="18" fill={INK}>
          GYM FRONT DESK
        </text>
        {bulbXs.map((x, i) => (
          <g key={x}>
            <use href="#bulb" x={x} y={330} />
            <use href="#bulb" x={x} y={440} />
            {bulbs !== "off" && (
              <g className={bulbs === "reveal" ? "bulb-on" : undefined} style={bulbs === "reveal" ? d(i * 120) : undefined}>
                <circle cx={x} cy={330} r="5" fill="#FFC21A" stroke={INK} strokeWidth="1.5" />
                <circle cx={x} cy={440} r="5" fill="#FFC21A" stroke={INK} strokeWidth="1.5" />
              </g>
            )}
          </g>
        ))}
      </g>
    </g>
  );
}

/** What is behind the opening in the morning: the back wall, the tube light, the counter. */
export function OpeningInside({ clock = "5:58", children, lit = true }: { clock?: string; children?: ReactNode; lit?: boolean }) {
  const [h, m] = clock.split(":").map(Number);
  const ma = (m / 60) * 360;
  const ha = ((h % 12) / 12) * 360 + (m / 60) * 30;
  return (
    <g stroke={INK} strokeWidth="2.5">
      <rect x="700" y="460" width="480" height="320" fill="#FFE7B8" />
      <Dots x={700} y={460} w={480} h={320} o={0.08} />
      <rect x="860" y="480" width="160" height="10" rx="5" fill="#FFF4DE" />
      {lit && <polygon points="860,490 1020,490 1080,620 800,620" fill="#FFE3A3" opacity=".35" stroke="none" />}
      <rect x="720" y="560" width="140" height="8" fill="#8A4B2A" />
      <Use id="dumbbell" x={728} y={536} s={0.4} style={{ ["--band" as string]: "#D11F5C" }} />
      <Use id="dumbbell" x={772} y={536} s={0.4} style={{ ["--band" as string]: "#1565D8" }} />
      <Use id="dumbbell" x={816} y={536} s={0.4} style={{ ["--band" as string]: "#0B7D47" }} />
      <circle cx="1110" cy="520" r="26" fill="#FFFBF2" />
      <path d={`M1110 520 L${1110 + 16 * Math.sin((ma * Math.PI) / 180)} ${520 - 16 * Math.cos((ma * Math.PI) / 180)}`} strokeWidth="2.5" />
      <path d={`M1110 520 L${1110 + 10 * Math.sin((ha * Math.PI) / 180)} ${520 - 10 * Math.cos((ha * Math.PI) / 180)}`} strokeWidth="3.5" />
      {children}
      <rect x="760" y="650" width="360" height="130" fill="#8A4B2A" />
      <path d="M880 652V780M1000 652V780" stroke="#6A3820" strokeWidth="3" />
      <rect x="740" y="636" width="400" height="18" rx="4" fill="#6A3820" />
      <rect x="1040" y="578" width="34" height="58" rx="5" fill={INK} />
      <rect x="1044" y="584" width="26" height="40" fill="#FFF4DE" strokeWidth="1" />
      <path d="M1048 592h18M1048 600h14M1048 608h18" strokeWidth="1.5" />
    </g>
  );
}

/** The chai stall, front view: kingfisher canopy, wooden cart, kettle on the stove, three glasses. */
export function ChaiStall({ x = 0, steam = true }: { x?: number; steam?: boolean }) {
  return (
    <g transform={x ? `translate(${x} 0)` : undefined} stroke={INK} strokeWidth="2.5">
      <path d="M1236 520 V620 M1424 504 V620" strokeWidth="5" />
      <path d="M1220 520 L1440 500 L1440 560 L1240 580 Z" fill="#1565D8" />
      <path d="M1240 580 q20 16 40 -4 q20 16 40 -4 q20 16 40 -4 q20 16 40 -4 q20 16 40 -4" fill="#1565D8" />
      <rect x="1250" y="620" width="190" height="150" fill="#8A4B2A" />
      <rect x="1262" y="640" width="166" height="110" fill="#13A89E" />
      <Dots x={1262} y={640} w={166} h={110} o={0.1} />
      <path d="M1322 676 h46 v18 c0 16 -10 26 -23 26 c-13 0 -23 -10 -23 -26 z M1368 684 c14 0 14 18 0 18" fill="#FFF4DE" />
      <circle cx="1280" cy="790" r="26" fill={INK} />
      <circle cx="1280" cy="790" r="9" fill="#FFF4DE" />
      <rect x="1300" y="590" width="60" height="30" rx="3" fill={INK} />
      <Use id="kettle" x={1298} y={540} />
      {steam && (
        <g className="steam" stroke="#FFF4DE" strokeWidth="4" fill="none">
          <path d="M1318 532 c-8 -12 8 -22 0 -34 c-6 -10 4 -16 0 -24" />
          <path d="M1332 528 c-8 -12 8 -22 0 -34 c-6 -10 4 -16 0 -26" />
          <path d="M1346 532 c-8 -12 8 -22 0 -34 c-6 -10 4 -16 0 -22" />
        </g>
      )}
      <Use id="glass" x={1386} y={598} />
      <Use id="glass" x={1404} y={598} />
      <Use id="glass" x={1422} y={598} />
    </g>
  );
}

/** The counter inside the shop (scenes 2, 6 night and 7). */
export function Counter({ items = true }: { items?: boolean }) {
  return (
    <g stroke={INK} strokeWidth="2.5">
      <rect x="420" y="600" width="480" height="240" fill="#8A4B2A" />
      <Dots x={420} y={600} w={480} h={240} o={0.1} />
      <path d="M540 604V840M660 604V840M780 604V840" stroke="#6A3820" strokeWidth="3" />
      <rect x="400" y="584" width="520" height="20" rx="6" fill="#6A3820" />
      {items && (
        <>
          <Use id="register" x={430} y={548} d={120} />
          <Use id="tiffin" x={606} y={522} d={180} />
          <Use id="qr-standee" x={820} y={484} d={240} />
        </>
      )}
    </g>
  );
}

/** A window in the back wall with flat sky bands behind its panes. */
export function Window({ x, y, w, h, bands, roof = true, moon }: { x: number; y: number; w: number; h: number; bands: [number, string][]; roof?: boolean; moon?: boolean }) {
  let yy = y;
  const total = bands.reduce((a, b) => a + b[0], 0);
  return (
    <g stroke={INK} strokeWidth="2.5">
      <rect x={x - 12} y={y - 12} width={w + 24} height={h + 24} rx="4" fill="#8A4B2A" />
      {bands.map(([bh, c], i) => {
        const r = <rect key={i} x={x} y={yy} width={w} height={(bh / total) * h} fill={c} stroke="none" />;
        yy += (bh / total) * h;
        return r;
      })}
      {moon && (
        <g stroke="none">
          <circle cx={x + 130} cy={y + 50} r="28" fill="#FFF4DE" />
          <circle cx={x + 144} cy={y + 40} r="24" fill="#191A4A" />
        </g>
      )}
      {roof && (
        <g>
          <path d={`M${x} ${y + h - 40} L${x + w * 0.6} ${y + h - 60} L${x + w} ${y + h - 46} V${y + h} H${x} Z`} fill="#2A2A72" />
          <Use id="water-tank" x={x + 44} y={y + h - 98} />
        </g>
      )}
      <rect x={x} y={y} width={w} height={h} fill="none" />
      <path d={`M${x + w / 2} ${y}V${y + h}M${x} ${y + h / 2}H${x + w}`} strokeWidth="6" />
    </g>
  );
}
