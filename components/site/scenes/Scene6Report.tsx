// Scene 6, 10:30 PM to 6:00 AM: Close the day, then the owner's report. At night Sunita counts the
// drawer under the tube light; at dawn Meena reads the report on her balcony with a cutting chai.
import type { CSSProperties } from "react";
import { SCENES } from "@/lib/i18n/site";
import { Meena } from "@/components/world/characters/Meena";
import { Moti } from "@/components/world/characters/Moti";
import { Sunita } from "@/components/world/characters/Sunita";
import { Dots, INK, Plane, Use } from "@/components/world/kit";
import { Counter, Window } from "@/components/world/places";
import { DemoIsland } from "../Islands";
import { CaptionCard, cropVars, ext } from "../bits";

export function Scene6Report() {
  const c = SCENES[5];
  const style = {
    ...cropVars({ p: [104, 280, 796, 520], m: [0, 200, 1440, 640] }),
    "--ext": ext([
      ["#2E3A78", 640],
      ["#2B2A40", 840],
    ]),
  } as CSSProperties;
  return (
    <section id={c.id} data-scene={c.n} aria-labelledby={`s${c.n}-title`} className="scene wide cv" data-beat="night" style={style}>
      <div className="scene-art" aria-hidden>
        <div className="scene-crop">
          <Plane>
            <rect className="sky-band sb1" x="0" y="0" width="1440" height="240" />
            <rect className="sky-band sb2" x="0" y="240" width="1440" height="120" />
            <rect className="sky-band sb3" x="0" y="360" width="1440" height="480" />
            <g className="beat-morning">
              <circle cx="720" cy="120" r="46" fill="#FFE7B8" stroke={INK} strokeWidth="2.5" />
            </g>
          </Plane>
          <Plane cls="cam-rise">
            {/* night: the counter under the tube light */}
            <g className="beat-night">
              <rect x="0" y="0" width="1440" height="640" fill="#2E3A78" />
              <Dots x={0} y={0} w={1440} h={640} o={0.12} />
              <rect x="0" y="628" width="1440" height="12" fill="#6A3820" stroke={INK} strokeWidth="2.5" />
              <Window
                x={600}
                y={60}
                w={260}
                h={210}
                moon
                bands={[
                  [70, "#0F1030"],
                  [70, "#191A4A"],
                  [70, "#24286A"],
                ]}
              />
              <rect x="560" y="300" width="300" height="12" rx="6" fill="#FFF4DE" stroke={INK} strokeWidth="2.5" />
              <polygon className="tube-glow tube-flicker" points="560,312 860,312 1000,640 420,640" fill="#9BE7FF" opacity=".3" />
              <rect x="0" y="760" width="1440" height="80" fill="#2B2A40" stroke={INK} strokeWidth="2.5" />
              <Sunita x={714} y={690} pose="count" actor="s6-sunita" say="" />
              <Counter items={false} />
              <g stroke={INK} strokeWidth="2.5">
                <rect x="600" y="560" width="200" height="40" fill="#9AA6B2" />
                <path d="M640 560v40M680 560v40M720 560v40M760 560v40" strokeWidth="2" />
              </g>
              <Use id="note" x={604} y={566} />
              <Use id="note" x={644} y={570} />
              <Use id="note" x={686} y={566} />
              <g stroke={INK} strokeWidth="2.5">
                <rect x="830" y="530" width="40" height="56" rx="5" fill={INK} />
                <rect x="836" y="536" width="28" height="12" fill="#FFF4DE" strokeWidth="1" />
                <path d="M838 556h6M848 556h6M858 556h4M838 566h6M848 566h6M858 566h4M838 576h6M848 576h6" stroke="#FFF4DE" strokeWidth="2" />
              </g>
              <Moti kind="asleep" x={190} y={790} s={0.72} actor="s6-moti" />
            </g>
            {/* morning: Meena's balcony above the street */}
            <g className="beat-morning">
              <g stroke={INK} strokeWidth="2.5">
                <rect x="120" y="560" width="110" height="90" fill="#B5452E" />
                <rect x="132" y="596" width="86" height="54" fill="#FFC21A" />
                <rect x="132" y="584" width="86" height="12" fill="#13A89E" />
                <rect x="126" y="566" width="98" height="16" rx="2" fill="#FFC21A" />
                <rect x="270" y="580" width="110" height="90" fill="#B5452E" />
                <rect x="282" y="616" width="86" height="54" fill="#FFC21A" />
                <rect x="282" y="604" width="86" height="12" fill="#13A89E" />
                <rect x="276" y="586" width="98" height="16" rx="2" fill="#FFC21A" />
                <rect x="0" y="650" width="460" height="190" fill="#D9C7A5" />
              </g>
              <text x="175" y="578" textAnchor="middle" fontSize="10" fill={INK}>
                MANINAGAR
              </text>
              <text x="325" y="598" textAnchor="middle" fontSize="10" fill={INK}>
                VASTRAPUR
              </text>
              <Moti kind="stand" x={420} y={770} s={0.4} actor="s6-moti-am" />
              <g stroke={INK} strokeWidth="2.5">
                <rect x="460" y="300" width="440" height="540" fill="#FFB547" />
                <rect x="560" y="330" width="230" height="300" fill="#6A3820" />
                <rect x="574" y="344" width="202" height="286" fill="#8A4B2A" />
                <Dots x={460} y={300} w={440} h={540} o={0.08} />
              </g>
              <Meena x={690} y={700} pose="read-phone" actor="s6-meena" />
              <g stroke={INK} strokeWidth="2.5">
                <rect x="480" y="600" width="420" height="12" rx="3" fill="#8A4B2A" />
                {Array.from({ length: 16 }, (_, i) => (
                  <rect key={i} x={490 + i * 26} y="612" width="6" height="88" fill={INK} strokeWidth="1" />
                ))}
                <rect x="480" y="700" width="420" height="20" fill="#F3F1E7" />
                <circle cx="852" cy="618" r="7" fill="none" strokeWidth="2.5" />
                <rect x="846" y="624" width="12" height="18" rx="3" fill="#FF8A00" strokeWidth="1.5" />
              </g>
              <Use id="pot-plant" x={492} y={548} s={0.7} />
              <path d="M520 590 C512 620 528 640 516 670 C506 696 522 712 514 740" fill="none" stroke="#2E8B57" strokeWidth="5" />
              <g fill="#2E8B57" stroke={INK} strokeWidth="1.5">
                <ellipse cx="510" cy="630" rx="8" ry="5" />
                <ellipse cx="524" cy="666" rx="8" ry="5" />
                <ellipse cx="508" cy="704" rx="8" ry="5" />
              </g>
            </g>
          </Plane>
        </div>
      </div>
      <div className="scene-ui">
        <CaptionCard
          c={c}
          timeLabel={
            <>
              <span className="t-night">10:30 PM</span>
              <span className="t-morning">6:00 AM</span>
            </>
          }
        />
        <div className="demo-slot" data-demo-slot>
          <DemoIsland name="report" minH={620} label="Close the day and owner report demo" />
        </div>
      </div>
    </section>
  );
}
