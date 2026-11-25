// Moti, the street dog and guide. One ear up, one ear flopped, a marigold collar with a cream
// reflective tag, a curled tail. He has a fixed spot in every scene and never sits on any words.
// `kind` picks the drawing (asleep, sitting, standing); `pose` adds a motion on top (wag, tilt...).
import { INK } from "../kit";
import { Ch, type ChProps } from "./base";

const DOG = "#B07A45";
const DARK = "#7E5330";
const LIGHT = "#E4B98A";

function Tail({ d }: { d: string }) {
  return (
    <g className="tail">
      <path d={d} fill="none" stroke={INK} strokeWidth="13" />
      <path d={d} fill="none" stroke={DOG} strokeWidth="8" />
    </g>
  );
}

function Face({ x, y, closed, seed }: { x: number; y: number; closed?: boolean; seed: string }) {
  return (
    <g className="head">
      <path className="ear" d={`M${x - 16} ${y - 14} L${x - 10} ${y - 44} L${x + 4} ${y - 20} Z`} fill={DARK} />
      <circle cx={x} cy={y} r="24" fill={DOG} />
      <path d={`M${x + 8} ${y - 18} C${x + 24} ${y - 22} ${x + 30} ${y - 6} ${x + 22} ${y + 10} C${x + 18} ${y + 2} ${x + 14} ${y - 6} ${x + 8} ${y - 18} Z`} fill={DARK} />
      <ellipse cx={x + 20} cy={y + 8} rx="14" ry="10" fill={LIGHT} />
      <circle cx={x + 32} cy={y + 4} r="5" fill={INK} stroke="none" />
      <path d={`M${x + 22} ${y + 14} q5 4 10 0`} fill="none" strokeWidth="2" />
      {closed ? (
        <>
          <path d={`M${x - 2} ${y - 4} q4 3 8 0`} fill="none" strokeWidth="2.2" />
          <ellipse className="eye-open" cx={x + 2} cy={y - 4} rx="2.4" ry="3" fill={INK} stroke="none" />
        </>
      ) : (
        <g className="eyes" style={{ ["--blink-dur" as string]: "5.6s", ["--blink-delay" as string]: seed.length % 3 + "s" }}>
          <ellipse cx={x + 2} cy={y - 5} rx="2.4" ry="3" fill={INK} stroke="none" />
        </g>
      )}
    </g>
  );
}

function Collar({ x, y, r = -20 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`rotate(${r} ${x} ${y})`}>
      <rect x={x - 6} y={y - 16} width="8" height="32" rx="3" fill="#FFC21A" strokeWidth="2" />
      <rect x={x} y={y + 6} width="8" height="8" fill="#FFF4DE" strokeWidth="1.5" />
    </g>
  );
}

export function Moti(p: ChProps & { kind?: "asleep" | "sit" | "stand" }) {
  const kind = p.kind ?? "sit";
  const seed = p.actor ?? "moti";
  if (kind === "asleep")
    return (
      <Ch name="moti" {...p} pose={p.pose ?? "asleep"}>
        <Tail d="M-56 -16 C-80 -2 -40 10 20 6" />
        <ellipse cx="0" cy="-26" rx="62" ry="26" fill={DOG} />
        <ellipse cx="-10" cy="-38" rx="26" ry="8" fill={DARK} stroke="none" opacity=".55" />
        <rect x="18" y="-12" width="44" height="12" rx="6" fill={DOG} />
        <Face x={58} y={-30} closed seed={seed} />
        <Collar x={36} y={-30} r={10} />
        <g fill="none" strokeWidth="2" opacity=".7">
          <path d="M92 -66 h10 l-10 12 h10" />
          <path d="M108 -84 h7 l-7 9 h7" strokeWidth="1.6" />
        </g>
      </Ch>
    );
  if (kind === "stand")
    return (
      <Ch name="moti" {...p} pose={p.pose ?? "stand"}>
        <Tail d="M-56 -64 C-80 -72 -86 -100 -70 -106 C-60 -110 -54 -98 -62 -92" />
        <rect className="leg-b" x="-46" y="-48" width="12" height="48" rx="6" fill={DARK} />
        <rect className="leg-b" x="30" y="-48" width="12" height="48" rx="6" fill={DARK} />
        <ellipse cx="0" cy="-54" rx="60" ry="28" fill={DOG} />
        <ellipse cx="36" cy="-46" rx="16" ry="18" fill="#FFF4DE" />
        <rect className="leg-a" x="-30" y="-46" width="12" height="46" rx="6" fill={DOG} />
        <rect className="leg-a paw" x="44" y="-46" width="12" height="46" rx="6" fill={DOG} />
        <Collar x={46} y={-76} />
        <Face x={58} y={-96} seed={seed} />
      </Ch>
    );
  return (
    <Ch name="moti" {...p} pose={p.pose ?? "sit"}>
      <Tail d="M-30 -8 C-66 -6 -72 -34 -54 -40" />
      <circle cx="-14" cy="-30" r="30" fill={DOG} />
      <path d="M-30 -40 C-28 -88 10 -110 30 -100 C42 -92 40 -60 30 -30 L-6 -8 Z" fill={DOG} />
      <ellipse cx="22" cy="-62" rx="13" ry="24" fill="#FFF4DE" />
      <rect x="2" y="-50" width="12" height="50" rx="6" fill={DOG} />
      <rect className="paw" x="22" y="-52" width="12" height="52" rx="6" fill={DOG} />
      <path d="M-40 0 a14 7 0 0 1 28 0 Z" fill={DARK} />
      <Collar x={24} y={-96} />
      <Face x={30} y={-118} seed={seed} />
    </Ch>
  );
}
