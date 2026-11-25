// Mahesh Pillai, the regular (LP-0042, phone ending 4521): broad, kingfisher tank top, rani
// headband with two tails, a jaw-line beard, track pants with cream stripes and a teal duffel.
import { Bubble, INK, Star } from "../kit";
import { Arm, Ch, Eyes, type ChProps } from "./base";

const SKIN = "#8D5524";

export function Mahesh(p: ChProps & { say?: string; towel?: boolean; bag?: boolean; phone?: boolean }) {
  const bag = p.bag !== false;
  return (
    <Ch name="mahesh" {...p}>
      {bag && (
        <g>
          <rect x="-152" y="-168" width="110" height="52" rx="18" fill="#13A89E" />
          <path d="M-140 -150 H-54" stroke="#FFF4DE" strokeWidth="2" fill="none" />
          <rect x="-112" y="-180" width="30" height="14" rx="6" fill="none" strokeWidth="3" />
        </g>
      )}
      <g className="leg-a">
        <rect x="-44" y="-136" width="36" height="130" rx="16" fill="#2B2A40" />
        <path d="M-38 -128 V-14" stroke="#FFF4DE" strokeWidth="2.5" fill="none" />
        <path d="M-50 0 a22 15 0 0 1 44 0 Z" fill="#D11F5C" />
      </g>
      <g className="leg-b">
        <rect x="8" y="-136" width="36" height="130" rx="16" fill="#2B2A40" />
        <path d="M38 -128 V-14" stroke="#FFF4DE" strokeWidth="2.5" fill="none" />
        <path d="M6 0 a22 15 0 0 1 44 0 Z" fill="#D11F5C" />
      </g>
      <Arm side="l" sx={-66} sy={-250} sleeve={SKIN} skin={SKIN} uw={30} uh={62} fw={26} fh={56} hand={14} />
      {/* torso: tank top with a scooped neck */}
      <rect x="-58" y="-258" width="116" height="126" rx="34" fill="#1565D8" />
      <path d="M-26 -258 Q0 -222 26 -258 Z" fill={SKIN} />
      <path d="M-58 -150 H58" stroke="#0E4FB0" strokeWidth="2" fill="none" />
      {bag && <path d="M44 -252 L-70 -150" strokeWidth="8" stroke={INK} fill="none" />}
      {p.towel && <rect x="26" y="-262" width="28" height="90" rx="6" fill="#FFF4DE" transform="rotate(-8 40 -262)" />}
      <rect x="-13" y="-274" width="26" height="22" fill={SKIN} />
      <g className="head">
        <circle cx="-34" cy="-304" r="7.5" fill={SKIN} />
        <circle cx="34" cy="-304" r="7.5" fill={SKIN} />
        <circle cx="0" cy="-306" r="34" fill={SKIN} />
        <path d="M-33 -312 C-33 -344 33 -344 33 -312 C26 -326 -26 -326 -33 -312 Z" fill={INK} />
        <rect x="-34" y="-326" width="68" height="11" rx="3" fill="#D11F5C" />
        <path d="M33 -322 C46 -326 52 -318 58 -312 M33 -318 C44 -316 46 -306 50 -298" stroke="#D11F5C" strokeWidth="6" fill="none" />
        <Eyes y={-304} seed={p.actor ?? "mahesh"} dx={13} />
        <path d="M-22 -317 l14 2 M8 -315 l14 -2" strokeWidth="3" fill="none" />
        <path d="M-33 -304 C-31 -280 -14 -268 0 -268 C14 -268 31 -280 33 -304 C27 -290 16 -284 0 -284 C-16 -284 -27 -290 -33 -304 Z" fill={INK} />
        <path d="M-8 -287 Q0 -282 8 -287" stroke="#FFF4DE" strokeWidth="2" fill="none" />
      </g>
      <Arm
        side="r"
        sx={66}
        sy={-250}
        sleeve={SKIN}
        skin={SKIN}
        uw={30}
        uh={62}
        fw={26}
        fh={56}
        hand={14}
        extra={p.phone ? <rect x="58" y="-148" width="18" height="32" rx="4" fill={INK} /> : null}
      />
      <g className="sparkle" strokeWidth="2">
        <Star x={128} y={-300} r={16} fill="#FFC21A" />
        <Star x={150} y={-330} r={9} fill="#FFF4DE" />
      </g>
      {p.say !== undefined && <Bubble x={-210} y={-440} w={210} text={p.say || "Bhaiya, 4521."} tail="br" cls="talk" />}
    </Ch>
  );
}
