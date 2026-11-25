// Meena Lohar, "Meena didi": owner of two branches. Shoulder-length hair, reading glasses pushed up
// on her head, a rani kurta with a marigold neckline and a cream dupatta. She reads the 6 am report
// on her phone, on a white plastic chair, with a cutting chai. She never speaks; her brow does.
import { INK } from "../kit";
import { Arm, Ch, Eyes, type ChProps } from "./base";

const SKIN = "#C68642";
const RANI = "#D11F5C";

export function Meena(p: ChProps & { chair?: boolean }) {
  return (
    <Ch name="meena" {...p}>
      {p.chair !== false && <use href="#chair-white" x="-54" y="0" />}
      {/* hair falls behind the shoulders */}
      <path d="M-36 -296 C-44 -240 -40 -222 -24 -214 L24 -214 C40 -222 44 -240 36 -296 Z" fill={INK} />
      <path d="M-30 -112 V-6 M6 -112 V-6" stroke="none" />
      <rect x="-30" y="-116" width="24" height="112" rx="12" fill="#FFF4DE" />
      <rect x="6" y="-116" width="24" height="112" rx="12" fill="#FFF4DE" />
      <path d="M-40 0 a19 12 0 0 1 38 0 Z" fill="#FFC21A" />
      <path d="M2 0 a19 12 0 0 1 38 0 Z" fill="#FFC21A" />
      <Arm side="l" sx={-52} sy={-236} sleeve={RANI} skin={SKIN} uw={22} uh={56} fw={20} fh={48} hand={11} extra={<rect x="-66" y="-150" width="22" height="36" rx="4" fill={INK} />} />
      <rect x="-48" y="-246" width="96" height="134" rx="26" fill={RANI} />
      <rect x="-54" y="-140" width="108" height="40" rx="18" fill={RANI} />
      <path d="M-14 -246 L0 -222 L14 -246" fill="none" stroke="#FFC21A" strokeWidth="5" />
      <path d="M-14 -246 L0 -222 L14 -246" fill="none" strokeWidth="1.5" />
      <path d="M22 -246 C40 -240 46 -200 30 -150 L14 -152 C28 -196 24 -232 10 -244 Z" fill="#FFF4DE" />
      <rect x="-8" y="-262" width="16" height="18" fill={SKIN} />
      <g className="head">
        <circle cx="0" cy="-292" r="31" fill={SKIN} />
        <path d="M-34 -286 C-40 -332 40 -336 34 -286 C30 -306 14 -318 -6 -314 C-14 -306 -26 -300 -34 -286 Z" fill={INK} />
        <g fill="none" strokeWidth="2.5" stroke="#FFC21A">
          <circle cx="-12" cy="-318" r="8" />
          <circle cx="12" cy="-318" r="8" />
        </g>
        <Eyes y={-290} dx={12} seed={p.actor ?? "meena"} rx={4.5} ry={6} />
        <path d="M-19 -303 l11 -1" strokeWidth="2.6" fill="none" />
        <path className="brow-r" d="M8 -304 l11 1" strokeWidth="2.6" fill="none" />
        <path d="M-8 -273 Q0 -266 8 -273" fill="none" strokeWidth="2.2" />
        <circle cx="0" cy="-286" r="2.4" fill={RANI} stroke="none" />
      </g>
      <Arm side="r" sx={52} sy={-236} sleeve={RANI} skin={SKIN} uw={22} uh={56} fw={20} fh={48} hand={11} extra={<use href="#glass" x="44" y="-150" />} />
    </Ch>
  );
}
