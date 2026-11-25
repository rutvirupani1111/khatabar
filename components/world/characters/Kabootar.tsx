// Kabootar, the reminder pigeon: grey-blue, a paan and dusk neck band, coral beak and feet, a
// marigold eye. He carries a cream envelope with a plain chat-bubble mark (never a WhatsApp logo).
import { INK } from "../kit";
import { Ch, type ChProps } from "./base";

export function Kabootar(p: ChProps & { letter?: boolean }) {
  return (
    <Ch name="kabootar" {...p} pose={p.pose ?? "perch"}>
      <path d="M-6 -6 V2 M-12 2 H0 M8 -6 V2 M2 2 H14" stroke="#FF6B4A" strokeWidth="3" fill="none" />
      <path d="M-28 -30 L-58 -20 L-54 -34 L-60 -44 L-26 -40 Z" fill="#5E7499" />
      <ellipse cx="0" cy="-28" rx="34" ry="22" fill="#8DA3C4" />
      <path className="wing" d="M-22 -40 C0 -48 24 -40 26 -26 C8 -16 -14 -18 -28 -26 Z" fill="#5E7499" />
      <path d="M-14 -32 C-4 -30 6 -28 14 -26 M-12 -26 C-2 -24 6 -22 14 -22" stroke="#8DA3C4" strokeWidth="1.6" fill="none" />
      <g className="head">
        <path d="M14 -44 C18 -38 28 -38 34 -44" stroke="#0B7D47" strokeWidth="5" fill="none" />
        <path d="M14 -40 C18 -34 28 -34 34 -40" stroke="#3E5BA9" strokeWidth="4" fill="none" />
        <circle cx="26" cy="-56" r="13" fill="#8DA3C4" />
        <path d="M37 -60 L49 -56 L37 -51 Z" fill="#FF6B4A" strokeWidth="2" />
        <circle cx="29" cy="-59" r="4" fill="#FFC21A" strokeWidth="1.5" />
        <circle cx="30" cy="-59" r="2" fill={INK} stroke="none" />
        {p.letter !== false && (
          <g transform="rotate(-12 58 -52)">
            <rect x="44" y="-62" width="30" height="20" rx="2" fill="#FFF4DE" strokeWidth="2" />
            <path d="M44 -62 L59 -51 L74 -62" fill="none" strokeWidth="1.6" />
            <rect x="44" y="-46" width="30" height="4" fill="#0B7D47" stroke="none" />
            <path d="M53 -56 h10 a1 1 0 0 1 1 1 v4 a1 1 0 0 1 -1 1 h-6 l-3 2 v-2 h-1 a1 1 0 0 1 -1 -1 v-4 a1 1 0 0 1 1 -1 z" fill="none" strokeWidth="1.2" />
          </g>
        )}
      </g>
    </Ch>
  );
}
