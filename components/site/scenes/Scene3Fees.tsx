// Scene 3, 6:15 AM: The fees wall. Out on the street past the chai stall, Kabootar waits on the wall
// with an envelope. Every reminder sent makes him fly off with it.
import { SCENES } from "@/lib/i18n/site";
import { Kabootar } from "@/components/world/characters/Kabootar";
import { Moti } from "@/components/world/characters/Moti";
import { Dots, INK, Plane, Use } from "@/components/world/kit";
import { Pavement, Sky, Wires } from "@/components/world/places";
import { DemoIsland } from "../Islands";
import { ext, Scene } from "../bits";

export function Scene3Fees() {
  const c = SCENES[2];
  return (
    <Scene
      c={c}
      crop={{ p: [104, 160, 776, 640], m: [0, 180, 1440, 590] }}
      ext={ext([
        ["#3E5BA9", 90],
        ["#FF6B4A", 180],
        ["#FFB547", 230],
        ["#FFE3A3", 250],
        ["#F3F1E7", 268],
        ["#B5452E", 780],
        ["#D9C7A5", 840],
      ])}
      art={
        <>
          <Plane>
            <Sky
              bands={[
                [0, 90, "#3E5BA9"],
                [90, 90, "#FF6B4A"],
                [180, 50, "#FFB547"],
                [230, 40, "#FFE3A3"],
              ]}
              dots={1}
            />
          </Plane>
          <Plane cls="cam-slide-far">
            <path d="M0 300 V170 H120 V150 H260 V196 H400 V160 H560 V210 H700 V176 H860 V200 H980 V158 H1120 V190 H1260 V166 H1440 V300 Z" fill="#2A2A72" stroke={INK} strokeWidth="2.5" />
            <g fill="none" stroke={INK} strokeWidth="2.5">
              <path d="M300 90 L270 196 M300 90 L330 196 M282 150 H318 M276 172 H324 M286 128 H314 M290 110 H310" />
              <path d="M300 90 V70" />
            </g>
            <circle cx="300" cy="66" r="5" fill="#D11F5C" stroke={INK} strokeWidth="2" />
            <Use id="water-tank" x={900} y={160} />
            <Use id="water-tank" x={1200} y={126} />
            <Use id="dish" x={520} y={176} />
            <Wires paths={["M0 150 Q720 210 1440 140", "M0 175 Q700 245 1440 170", "M0 200 Q760 270 1440 205"]} />
          </Plane>
          <Plane cls="cam-slide">
            <rect x="0" y="250" width="1440" height="18" fill="#F3F1E7" stroke={INK} strokeWidth="2.5" />
            <rect x="0" y="268" width="1440" height="512" fill="#B5452E" stroke={INK} strokeWidth="2.5" />
            <rect x="0" y="268" width="1440" height="512" fill="url(#kb-bricks)" opacity=".75" />
            <Dots x={0} y={268} w={1440} h={512} o={0.1} />
            <g transform="rotate(-1 710 350)">
              <text x="580" y="366" fontSize="34" fill="#FFF4DE">
                KHATABAR GYM
              </text>
              <path d="M582 386 H806 l-14 -10 M806 386 l-14 10" fill="none" stroke="#FFF4DE" strokeWidth="5" strokeLinecap="round" />
            </g>
            <rect x="380" y="420" width="120" height="150" rx="4" fill="#FFF4DE" stroke={INK} strokeWidth="2.5" transform="rotate(2 440 495)" />
            <text x="440" y="470" textAnchor="middle" fontSize="16" fill={INK} transform="rotate(2 440 495)">
              YOGA 7 AM
            </text>
            <path d="M398 496 h84 M398 516 h60 M398 536 h76" stroke={INK} strokeWidth="2" transform="rotate(2 440 495)" />
            <g className="kabootar-fly">
              <Kabootar x={720} y={252} s={1.15} actor="s3-kabootar" d={300} />
            </g>
            <Pavement />
            {/* the chai stall from the side */}
            <g stroke={INK} strokeWidth="2.5">
              <path d="M120 540 V640 M340 540 V640" strokeWidth="5" />
              <path d="M104 520 H360 L344 560 H120 Z" fill="#1565D8" />
              <path d="M120 560 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0 q14 14 28 0" fill="#1565D8" />
              <rect x="114" y="640" width="236" height="120" fill="#8A4B2A" />
              <rect x="126" y="656" width="212" height="88" fill="#13A89E" />
              <path d="M200 690 h46 v14 c0 14 -10 22 -23 22 c-13 0 -23 -8 -23 -22 z" fill="#FFF4DE" />
              <circle cx="150" cy="780" r="22" fill={INK} />
              <circle cx="150" cy="780" r="7" fill="#FFF4DE" />
              <rect x="150" y="612" width="60" height="28" rx="3" fill={INK} />
              <Use id="kettle" x={150} y={566} s={0.85} />
              <Use id="glass" x={270} y={618} />
              <Use id="glass" x={292} y={618} />
            </g>
            <g className="steam" stroke="#FFF4DE" strokeWidth="4" fill="none">
              <path d="M170 560 c-8 -12 8 -22 0 -34 c-6 -10 4 -16 0 -24" />
              <path d="M184 556 c-8 -12 8 -22 0 -34 c-6 -10 4 -16 0 -26" />
            </g>
            <Use id="scooter" x={520} y={650} s={0.95} d={160} style={{ ["--scoot" as string]: "#1565D8" }} keep="scooter" />
            <Moti kind="stand" x={430} y={792} s={0.62} pose="walk" actor="s3-moti" />
          </Plane>
        </>
      }
      demo={<DemoIsland name="fees" minH={560} label="Fees due demo" />}
    />
  );
}
