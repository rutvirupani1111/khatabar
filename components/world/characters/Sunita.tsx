// Sunita, the manager: hair in a back bun, reading glasses on a cord, a paan cardigan over a cream
// top. At night she counts the drawer note by note.
import { Bubble, INK } from "../kit";
import { Arm, Ch, Eyes, type ChProps } from "./base";

const SKIN = "#6E3F1C";
const PAAN = "#0B7D47";

export function Sunita(p: ChProps & { say?: string; bubble?: [number, number, number] }) {
  const [bx, by, bw] = p.bubble ?? [-90, -450, 220];
  return (
    <Ch name="sunita" {...p}>
      <g className="leg-a">
        <rect x="-32" y="-128" width="28" height="124" rx="14" fill="#2B2A40" />
        <path d="M-40 0 a19 12 0 0 1 38 0 Z" fill={INK} />
      </g>
      <g className="leg-b">
        <rect x="4" y="-128" width="28" height="124" rx="14" fill="#2B2A40" />
        <path d="M2 0 a19 12 0 0 1 38 0 Z" fill={INK} />
      </g>
      <Arm side="l" sx={-50} sy={-240} sleeve={PAAN} skin={SKIN} uw={22} uh={58} fw={20} fh={52} hand={11} />
      <rect x="-46" y="-246" width="92" height="120" rx="26" fill="#FFF4DE" />
      <path d="M-46 -220 C-46 -238 -36 -246 -16 -246 L-8 -126 H-28 C-40 -126 -46 -132 -46 -146 Z" fill={PAAN} />
      <path d="M46 -220 C46 -238 36 -246 16 -246 L8 -126 H28 C40 -126 46 -132 46 -146 Z" fill={PAAN} />
      <circle cx="-14" cy="-180" r="3" fill="#FFF4DE" strokeWidth="1.5" />
      <circle cx="-13" cy="-160" r="3" fill="#FFF4DE" strokeWidth="1.5" />
      <path d="M-18 -260 C-22 -220 22 -220 18 -260" fill="none" strokeWidth="1.5" />
      <rect x="-14" y="-226" width="12" height="8" rx="3" fill="#9BE7FF" strokeWidth="1.5" />
      <rect x="2" y="-226" width="12" height="8" rx="3" fill="#9BE7FF" strokeWidth="1.5" />
      <rect x="-8" y="-262" width="16" height="18" fill={SKIN} />
      <g className="head">
        <circle cx="0" cy="-336" r="16" fill={INK} />
        <circle cx="-31" cy="-292" r="6.5" fill={SKIN} />
        <circle cx="31" cy="-292" r="6.5" fill={SKIN} />
        <circle cx="0" cy="-294" r="31" fill={SKIN} />
        <path d="M-32 -294 C-34 -326 34 -326 32 -294 C26 -312 10 -316 0 -312 C-10 -316 -26 -312 -32 -294 Z" fill={INK} />
        <Eyes y={-292} dx={12} seed={p.actor ?? "sunita"} rx={4.5} ry={6} />
        <path className="brow-l" d="M-19 -305 l11 -1" strokeWidth="2.6" fill="none" />
        <path className="brow-r" d="M8 -306 l11 1" strokeWidth="2.6" fill="none" />
        <path d="M-7 -275 Q0 -270 7 -275" fill="none" strokeWidth="2" />
        <circle cx="-31" cy="-284" r="2.5" fill="#FFC21A" strokeWidth="1.2" />
      </g>
      <Arm side="r" sx={50} sy={-240} sleeve={PAAN} skin={SKIN} uw={22} uh={58} fw={20} fh={52} hand={11} extra={<rect x="38" y="-140" width="26" height="12" rx="2" fill="#FFE7B8" strokeWidth="1.5" />} />
      {p.say !== undefined && <Bubble x={bx} y={by} w={bw} h={54} size={20} text={p.say || "Hisaab barabar."} tail="bc" cls="talk" />}
    </Ch>
  );
}
