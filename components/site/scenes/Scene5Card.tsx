// Scene 5, 6:45 AM: At the door. Daylight on the brick front, a scanner by the glass door, and
// Mahesh holding out his phone. The phone on the right is his real card.
import { SCENES } from "@/lib/i18n/site";
import { Mahesh } from "@/components/world/characters/Mahesh";
import { Moti } from "@/components/world/characters/Moti";
import { Dots, INK, Plane, Use } from "@/components/world/kit";
import { Pavement, Sky } from "@/components/world/places";
import { DemoIsland } from "../Islands";
import { ext, Scene } from "../bits";

export function Scene5Card() {
  const c = SCENES[4];
  return (
    <Scene
      c={c}
      prop="glass"
      cls="dim-out"
      over={
        <div className="scene-doors" aria-hidden>
          <i className="l" />
          <i className="r" />
        </div>
      }
      crop={{ p: [250, 360, 660, 480], m: [0, 250, 1440, 590] }}
      ext={ext([
        ["#8ED6F5", 200],
        ["#B8E6F7", 300],
        ["#B5452E", 780],
        ["#D9C7A5", 840],
      ])}
      art={
        <>
          <Plane>
            <Sky
              bands={[
                [0, 200, "#8ED6F5"],
                [200, 120, "#B8E6F7"],
                [320, 40, "#FFE3A3"],
              ]}
            />
            <g fill="#3E5BA9" stroke={INK} strokeWidth="2.5">
              <path d="M0 380 V250 H140 V220 H300 V270 H460 V236 H600 V260 H760 V210 H940 V250 H1100 V230 H1260 V262 H1440 V380 Z" />
            </g>
            <g fill="#FFF4DE" stroke={INK} strokeWidth="2">
              <path d="M180 120 q20 -26 50 -10 q24 -20 46 4 q26 4 18 26 h-120 q-14 -10 6 -20 z" />
              <path d="M1080 90 q16 -20 40 -8 q20 -16 38 4 q20 4 14 20 h-96 q-12 -8 4 -16 z" />
            </g>
          </Plane>
          <Plane cls="cam-rise">
            <rect x="0" y="300" width="1440" height="480" fill="#B5452E" stroke={INK} strokeWidth="2.5" />
            <rect x="0" y="300" width="1440" height="480" fill="url(#kb-bricks)" opacity=".75" />
            <Dots x={0} y={300} w={1440} h={480} o={0.08} />
            <rect x="540" y="330" width="340" height="40" rx="6" fill="#FFC21A" stroke={INK} strokeWidth="3" />
            <text x="710" y="360" textAnchor="middle" fontSize="24" fill={INK}>
              KHATABAR GYM
            </text>
            <g stroke={INK} strokeWidth="2.5">
              <rect x="560" y="380" width="300" height="400" fill="#9AA6B2" />
              <rect x="570" y="390" width="280" height="390" fill="#B8E6F7" opacity=".85" />
              <path d="M600 520 L700 420 M620 580 L760 440" stroke="#FFF4DE" strokeWidth="7" />
              <path d="M640 720 h140 l20 -60 h-36 M660 720 v-40 h90" fill="none" stroke={INK} strokeWidth="5" opacity=".55" />
              <rect x="820" y="520" width="14" height="140" rx="6" fill="#9AA6B2" />
            </g>
            <rect x="453" y="570" width="104" height="26" rx="4" fill={INK} />
            <text x="505" y="588" textAnchor="middle" fontSize="13" fill="#FFF4DE" style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}>
              Scan here
            </text>
            <g stroke={INK} strokeWidth="2.5" data-keepout="scanner">
              <rect x="480" y="470" width="50" height="90" rx="8" fill={INK} />
              <rect x="487" y="480" width="36" height="44" rx="3" fill="#FFF4DE" />
              <path d="M494 490 h22 M494 500 h22 M494 510 h14" strokeWidth="2" />
              <circle className="led" cx="505" cy="545" r="6" fill="#0B7D47" />
            </g>
            <Use id="pot-plant" x={478} y={712} d={120} keep="plant" />
            <rect x="600" y="770" width="220" height="20" rx="3" fill="#D11F5C" stroke={INK} strokeWidth="2.5" />
            <text x="710" y="786" textAnchor="middle" fontSize="14" fill="#FFF4DE">
              WELCOME
            </text>
            <Pavement y={790} h={50} />
            <Mahesh x={360} y={800} s={0.92} pose="phone-out" actor="s5-mahesh" towel bag={false} phone d={300} />
            <Moti kind="sit" x={172} y={798} s={0.6} actor="s5-moti" d={500} />
          </Plane>
        </>
      }
      demoCls="center"
      demo={<DemoIsland name="card" minH={600} label="Member card demo" />}
    />
  );
}
