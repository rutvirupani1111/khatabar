// Scene 4, 6:30 AM: The freeze board. Inside the gym, by the mirror and the dumbbell rack, Omkar
// asks for ten days off for his exams. The glass door swings open to show him.
import { SCENES } from "@/lib/i18n/site";
import { Moti } from "@/components/world/characters/Moti";
import { Omkar } from "@/components/world/characters/Omkar";
import { Bubble, Dots, INK, Plane, Use } from "@/components/world/kit";
import { DemoIsland } from "../Islands";
import { ext, Scene } from "../bits";

const BANDS = ["#D11F5C", "#1565D8", "#FFC21A", "#0B7D47", "#1B1A2E"];

export function Scene4Freeze() {
  const c = SCENES[3];
  return (
    <Scene
      c={c}
      crop={{ p: [104, 300, 796, 520], m: [0, 200, 1440, 640] }}
      ext={ext([
        ["#B8E6F7", 520],
        ["#1565D8", 544],
        ["#B8E6F7", 760],
        ["#2B2A40", 840],
      ])}
      art={
        <>
          <Plane cls="cam-rise">
            <rect x="0" y="0" width="1440" height="760" fill="#B8E6F7" />
            <Dots x={0} y={0} w={1440} h={760} o={0.08} />
            <rect x="0" y="520" width="1440" height="24" fill="#1565D8" stroke={INK} strokeWidth="2.5" />
            <g stroke={INK} strokeWidth="2.5">
              <rect x="620" y="70" width="270" height="400" fill="#9AA6B2" />
              <rect x="630" y="80" width="250" height="380" fill="#F3F1E7" />
              <path d="M660 160 L720 100 M670 200 L760 110" stroke="#FFF4DE" strokeWidth="6" />
              <path d="M840 420 L870 390" stroke="#FFF4DE" strokeWidth="5" />
            </g>
            <text x="1040" y="140" fontSize="34" fill="#1565D8">
              NO PAIN
            </text>
            <text x="1040" y="182" fontSize="34" fill="#D11F5C">
              NO GAIN
            </text>
            <g stroke={INK} strokeWidth="2.5">
              <circle cx="480" cy="420" r="44" fill="#9AA6B2" />
              <g className="fan-blades">
                <ellipse cx="480" cy="396" rx="10" ry="22" fill="#FFF4DE" />
                <ellipse cx="480" cy="396" rx="10" ry="22" fill="#FFF4DE" transform="rotate(120 480 420)" />
                <ellipse cx="480" cy="396" rx="10" ry="22" fill="#FFF4DE" transform="rotate(240 480 420)" />
              </g>
              <circle cx="480" cy="420" r="7" fill={INK} />
              <path d="M480 464 V500 M462 500 H498" strokeWidth="5" />
            </g>
          </Plane>
          <Plane cls="cam-rise-far">
            <rect x="0" y="760" width="1440" height="80" fill="#2B2A40" stroke={INK} strokeWidth="2.5" />
            <path d="M0 772 H1440" stroke="#0B7D47" strokeWidth="2" />
            <g stroke={INK} strokeWidth="2.5">
              <path d="M624 600 V760 M884 600 V760" strokeWidth="6" />
              <rect x="610" y="596" width="290" height="12" rx="4" fill="#9AA6B2" />
              <rect x="610" y="676" width="290" height="12" rx="4" fill="#9AA6B2" />
            </g>
            {BANDS.map((b, i) => (
              <Use key={`t${i}`} id="dumbbell" x={628 + i * 54} y={574} s={0.55} d={120 + i * 40} style={{ ["--band" as string]: b }} />
            ))}
            {BANDS.map((b, i) => (
              <Use key={`b${i}`} id="dumbbell" x={628 + i * 54} y={652} s={0.55} d={320 + i * 40} style={{ ["--band" as string]: b }} />
            ))}
            <Omkar x={392} y={762} s={0.93} actor="s4-omkar" d={300} />
            <Bubble x={104} y={384} w={260} h={54} text="Exams hain. 10 din ka break?" tail="br" size={19} cls="rv" />
            <Moti kind="sit" x={176} y={800} s={0.52} actor="s4-moti" d={500} />
          </Plane>
        </>
      }
      side={
        <div className="glass-door" aria-hidden>
          <div className="door-leaf">
            <svg viewBox="0 0 520 900" preserveAspectRatio="none" width="100%" height="100%" className="world">
              <rect x="0" y="0" width="520" height="900" fill="#9AA6B2" stroke={INK} strokeWidth="3" />
              <rect x="10" y="10" width="500" height="880" fill="#B8E6F7" opacity=".7" />
              <path d="M60 260 L260 60 M90 330 L330 90" stroke="#FFF4DE" strokeWidth="10" />
              <rect x="470" y="380" width="16" height="160" rx="6" fill="#9AA6B2" stroke={INK} strokeWidth="2.5" />
              <text x="60" y="660" fontSize="22" fill={INK}>
                OPEN 5:30 AM TO 10 PM
              </text>
            </svg>
          </div>
        </div>
      }
      demo={<DemoIsland name="freeze" minH={560} label="Freeze demo" />}
    />
  );
}
