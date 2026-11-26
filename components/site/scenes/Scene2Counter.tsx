// Scene 2, 6:02 AM: At the counter. Mahesh says his last four digits, Ravi finds him and renews.
import { SCENES } from "@/lib/i18n/site";
import { Mahesh } from "@/components/world/characters/Mahesh";
import { Moti } from "@/components/world/characters/Moti";
import { Ravi } from "@/components/world/characters/Ravi";
import { Bubble, Dots, INK, Plane, Use } from "@/components/world/kit";
import { Counter, Window } from "@/components/world/places";
import { DemoIsland } from "../Islands";
import { ext, Scene } from "../bits";

export function Scene2Counter() {
  const c = SCENES[1];
  return (
    <Scene
      c={c}
      crop={{ p: [104, 300, 816, 540], m: [40, 300, 1300, 500] }}
      ext={ext([
        ["#FFE7B8", 628],
        ["#6A3820", 640],
        ["#FFE7B8", 760],
        ["#EED9B5", 840],
      ])}
      art={
        <>
          <Plane cls="cam-rise">
            <rect x="0" y="0" width="1440" height="640" fill="#FFE7B8" />
            <Dots x={0} y={0} w={1440} h={640} o={0.08} />
            <rect x="0" y="628" width="1440" height="12" fill="#6A3820" stroke={INK} strokeWidth="2.5" />
            <Window
              x={600}
              y={60}
              w={260}
              h={210}
              bands={[
                [60, "#3E5BA9"],
                [70, "#FF6B4A"],
                [80, "#FFB547"],
              ]}
            />
            <g stroke={INK} strokeWidth="2.5">
              <rect x="620" y="320" width="260" height="12" fill="#8A4B2A" />
              <path d="M650 332 l12 18 M850 332 l-12 18" fill="none" strokeWidth="5" />
            </g>
            <Use id="trophy" x={640} y={282} d={120} />
            <Use id="trophy" x={690} y={282} d={180} />
            <Use id="pot-plant" x={762} y={262} s={0.9} d={240} />
            <Use id="dumbbell" x={826} y={306} s={0.45} d={300} style={{ ["--band" as string]: "#1565D8" }} />
            <rect x="1060" y="120" width="180" height="120" rx="6" fill="#FFFBF2" stroke={INK} strokeWidth="2.5" />
            <text x="1150" y="168" textAnchor="middle" fontSize="20" fill={INK}>
              RATE LIST
            </text>
            <path d="M1086 190 h70 M1176 190 h40 M1086 210 h70 M1176 210 h40" stroke={INK} strokeWidth="2" />
          </Plane>
          <Plane cls="cam-rise-far">
            <rect x="0" y="760" width="1440" height="80" fill="#EED9B5" stroke={INK} strokeWidth="2.5" />
            <Dots x={0} y={760} w={1440} h={80} o={0.1} />
            <Ravi x={700} y={697} actor="s2-ravi" say="" bubble={[-80, -457, 260]} />
            <Counter />
            <Mahesh x={340} y={790} s={0.95} actor="s2-mahesh" d={300} slide />
            <Bubble x={104} y={446} w={190} h={50} text="Bhaiya, 4521." tail="br" size={22} cls="rv" />
            <Moti kind="sit" x={170} y={804} s={0.78} actor="s2-moti" d={500} />
          </Plane>
        </>
      }
      demo={<DemoIsland name="counter" minH={560} label="Front desk demo" />}
    />
  );
}
