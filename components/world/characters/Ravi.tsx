// Ravi, desk staff: lanky, saffron tee with the kettlebell mark, a thick moustache with curled
// tips and a blue pen behind his right ear. He stands in for the visitor at the counter.
import { Bubble, INK } from "../kit";
import { Arm, Ch, Eyes, type ChProps } from "./base";

const SKIN = "#A8693A";
const SAFFRON = "#FF8A00";

export function Ravi(p: ChProps & { say?: string; bubble?: [number, number, number] }) {
  const [bx, by, bw] = p.bubble ?? [40, -452, 300];
  return (
    <Ch name="ravi" {...p}>
      {/* legs and sneakers */}
      <g className="leg-a">
        <rect x="-34" y="-132" width="28" height="128" rx="14" fill="#2B2A40" />
        <path d="M-44 0 a21 14 0 0 1 42 0 Z" fill="#FFF4DE" />
      </g>
      <g className="leg-b">
        <rect x="6" y="-132" width="28" height="128" rx="14" fill="#2B2A40" />
        <path d="M2 0 a21 14 0 0 1 42 0 Z" fill="#FFF4DE" />
      </g>
      <Arm side="l" sx={-50} sy={-246} sleeve={SAFFRON} skin={SKIN} />
      {/* torso */}
      <rect x="-42" y="-252" width="84" height="128" rx="26" fill={SAFFRON} />
      <path d="M-14 -252 Q0 -240 14 -252" fill="none" strokeWidth="2" />
      <g transform="translate(-13 -222)" strokeWidth="1.8">
        <path d="M7 11 C7 2 21 2 21 11" fill="none" strokeWidth="3" />
        <circle cx="14" cy="17" r="10" fill="none" strokeWidth="2.2" />
        <path d="M8 14h12M8 17h12M8 20h12" strokeWidth="1.5" />
      </g>
      {/* neck, ears, head */}
      <rect x="-9" y="-268" width="18" height="20" fill={SKIN} />
      <g className="head">
        <circle cx="-33" cy="-296" r="7" fill={SKIN} />
        <circle cx="33" cy="-296" r="7" fill={SKIN} />
        <circle cx="0" cy="-298" r="33" fill={SKIN} />
        <path d="M-34 -300 C-37 -336 -6 -343 10 -337 C27 -334 37 -322 34 -300 C30 -316 16 -322 0 -321 L-8 -329 C-16 -320 -27 -314 -34 -300 Z" fill={INK} />
        <Eyes y={-298} seed={p.actor ?? "ravi"} />
        <path d="M-20 -311 l13 -3 M7 -314 l13 3" strokeWidth="2.6" fill="none" />
        <path d="M0 -284 C-8 -289 -18 -290 -24 -283 C-27 -278 -23 -275 -20 -279 C-14 -282 -6 -280 0 -277 C6 -280 14 -282 20 -279 C23 -275 27 -278 24 -283 C18 -290 8 -289 0 -284 Z" fill={INK} />
        <path d="M-7 -271 Q0 -265 7 -271" fill="none" strokeWidth="2" />
        <g className="pen">
          <g transform="rotate(20 36 -318)">
            <rect x="33" y="-334" width="6" height="28" rx="3" fill="#1565D8" strokeWidth="2" />
            <rect x="33" y="-334" width="6" height="8" rx="3" fill="#FFF4DE" strokeWidth="2" />
          </g>
        </g>
      </g>
      <Arm
        side="r"
        sx={50}
        sy={-246}
        sleeve={SAFFRON}
        skin={SKIN}
        extra={
          <>
            <rect className="thumb" x="58" y="-146" width="16" height="9" rx="4.5" fill={SKIN} />
            <rect className="finger" x="46" y="-136" width="8" height="20" rx="4" fill={SKIN} />
          </>
        }
      />
      {p.say !== undefined && <Bubble x={bx} y={by} w={bw} h={54} size={19} text={p.say || "Bank mein aaya? Tab PAID."} tail="bc" cls="talk" />}
    </Ch>
  );
}
