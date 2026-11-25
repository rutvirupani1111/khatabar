// Omkar Mukherjee, student: slim, messy hair, round glasses, a dusk hoodie with cream drawstrings,
// indigo jeans, and a stack of books with a marigold sticky note. His exams are the freeze request.
import { Bubble, INK } from "../kit";
import { Arm, Ch, Eyes, type ChProps } from "./base";

const SKIN = "#C68642";
const HOOD = "#3E5BA9";

export function Omkar(p: ChProps & { say?: string; books?: boolean }) {
  const books = p.books !== false;
  return (
    <Ch name="omkar" {...p}>
      <g className="leg-a">
        <rect x="-32" y="-130" width="26" height="126" rx="13" fill="#2A2A72" />
        <path d="M-41 0 a19 13 0 0 1 38 0 Z" fill="#FFF4DE" />
      </g>
      <g className="leg-b">
        <rect x="6" y="-130" width="26" height="126" rx="13" fill="#2A2A72" />
        <path d="M3 0 a19 13 0 0 1 38 0 Z" fill="#FFF4DE" />
      </g>
      <ellipse cx="0" cy="-252" rx="36" ry="15" fill={HOOD} />
      <Arm side="l" sx={-50} sy={-244} sleeve={HOOD} skin={SKIN} uw={22} uh={58} fw={20} fh={52} hand={11} cls="hold" />
      <rect x="-45" y="-250" width="90" height="124" rx="26" fill={HOOD} />
      <path d="M-26 -160 H26 V-138 H-26 Z" fill="#33508F" strokeWidth="2" />
      <path d="M-9 -248 V-212 M9 -248 V-214" stroke="#FFF4DE" strokeWidth="3" fill="none" />
      <circle cx="-9" cy="-210" r="3" fill="#FFF4DE" strokeWidth="1.5" />
      <circle cx="9" cy="-212" r="3" fill="#FFF4DE" strokeWidth="1.5" />
      <rect x="-8" y="-264" width="16" height="18" fill={SKIN} />
      <g className="head">
        <circle cx="-31" cy="-294" r="6.5" fill={SKIN} />
        <circle cx="31" cy="-294" r="6.5" fill={SKIN} />
        <circle cx="0" cy="-296" r="31" fill={SKIN} />
        <path d="M-33 -298 C-40 -322 -26 -340 -12 -332 C-8 -346 12 -346 14 -332 C28 -340 40 -322 33 -298 C28 -312 18 -318 8 -314 C2 -322 -6 -322 -10 -314 C-20 -318 -28 -312 -33 -298 Z" fill={INK} />
        <Eyes y={-296} dx={13} seed={p.actor ?? "omkar"} rx={4} ry={5.5} />
        <g className="glasses" fill="none" strokeWidth="2.5">
          <circle cx="-13" cy="-296" r="10" />
          <circle cx="13" cy="-296" r="10" />
          <path d="M-3 -297 H3 M-23 -298 L-31 -300 M23 -298 L31 -300" />
        </g>
        <path d="M-6 -276 Q0 -271 6 -276" fill="none" strokeWidth="2" />
      </g>
      {books && (
        <g>
          <rect x="-58" y="-214" width="74" height="14" rx="2" fill="#D11F5C" />
          <rect x="-54" y="-228" width="74" height="14" rx="2" fill="#FFC21A" />
          <rect x="-60" y="-242" width="74" height="14" rx="2" fill="#13A89E" />
          <rect x="-24" y="-262" width="30" height="30" fill="#FFC21A" transform="rotate(6 -9 -247)" strokeWidth="2" />
          <path d="M-18 -252 h16 M-18 -246 h12" strokeWidth="1.5" transform="rotate(6 -9 -247)" />
        </g>
      )}
      <Arm side="r" sx={50} sy={-244} sleeve={HOOD} skin={SKIN} uw={22} uh={58} fw={20} fh={52} hand={11} />
      {p.say !== undefined && <Bubble x={-250} y={-440} w={250} text={p.say || "Exams hain. 10 din ka break?"} tail="br" size={21} cls="talk" />}
    </Ch>
  );
}
