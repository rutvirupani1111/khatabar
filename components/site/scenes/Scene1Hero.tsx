// Scene 1, 5:58 AM: Shutter up. The street before dawn, the shop's shutter rolls up, Ravi waves
// from the counter and Moti is still asleep on his sack. The notice says what Khatabar is.
import type { CSSProperties } from "react";
import { ACTIONS, HERO } from "@/lib/i18n/site";
import { Moti } from "@/components/world/characters/Moti";
import { Ravi } from "@/components/world/characters/Ravi";
import { Dots, INK, Plane, Star, Use } from "@/components/world/kit";
import { ChaiStall, OpeningInside, Pavement, Shopfront, Sky, Wires } from "@/components/world/places";
import { cropVars, ext, T, TwoActions } from "../bits";

export function Scene1Hero() {
  const style = {
    ...cropVars({ p: [600, 300, 760, 400], m: [600, 220, 840, 620] }),
    "--ext": ext([
      ["#2A2A72", 170],
      ["#3E5BA9", 300],
      ["#FF6B4A", 390],
      ["#FFB547", 460],
      ["#2A2A72", 780],
      ["#D9C7A5", 840],
    ]),
  } as CSSProperties;
  return (
    <section id="top" data-scene="1" aria-labelledby="s1-title" className="scene wide hero" style={style}>
      <div className="hero-grid">
        <div className="scene-art" aria-hidden>
          <div className="scene-crop">
            <Plane anchor="xMidYMax">
              <Sky
                bands={[
                  [0, 170, "#2A2A72"],
                  [170, 130, "#3E5BA9"],
                  [300, 90, "#FF6B4A"],
                  [390, 450, "#FFB547"],
                ]}
                dots={2}
              />
              <circle cx="1240" cy="430" r="64" fill="#FFE3A3" stroke={INK} strokeWidth="2.5" />
              <g className="hero-stars">
                {[
                  [90, 40],
                  [300, 90],
                  [520, 30],
                  [760, 70],
                  [1000, 40],
                  [1180, 96],
                ].map(([x, y]) => (
                  <Star key={x} x={x} y={y} r={6} />
                ))}
              </g>
            </Plane>
            <Plane cls="cam-exit" anchor="xMidYMax">
              <g fill="#2A2A72" stroke={INK} strokeWidth="2.5">
                <path d="M0 300 H180 V840 H0 Z" />
                <path d="M170 340 H310 V840 H170 Z" />
                <path d="M1260 310 H1440 V840 H1260 Z" />
              </g>
              <g fill="#24286A" stroke="none">
                <rect x="30" y="330" width="22" height="26" />
                <rect x="96" y="330" width="22" height="26" />
                <rect x="1300" y="350" width="22" height="26" />
                <rect x="1370" y="350" width="22" height="26" />
              </g>
              <rect x="30" y="330" width="22" height="26" fill="#FFC21A" stroke={INK} strokeWidth="1.5" />
              <rect x="1370" y="350" width="22" height="26" fill="#FFC21A" stroke={INK} strokeWidth="1.5" />
              <Use id="water-tank" x={60} y={260} />
              <Use id="water-tank" x={1300} y={270} />
              <Wires paths={["M0 360 Q720 420 1440 350", "M0 390 Q600 450 1440 400"]} />
              {/* the blue wall the notice is pasted on */}
              <rect x="0" y="260" width="620" height="520" fill="#4F7FD1" stroke={INK} strokeWidth="2.5" />
              <Dots x={0} y={260} w={620} h={520} o={0.1} />
              <Use id="dish" x={360} y={222} />
              <path d="M36 652 C30 630 70 626 96 636 C130 628 160 650 150 676 C160 700 120 712 90 704 C60 712 30 700 36 676 Z" fill="#B5452E" stroke={INK} strokeWidth="2" />
              <path d="M44 646 h40 M88 646 h44 M40 664 h30 M74 664 h46 M124 664 h20 M48 682 h44 M96 682 h42 M60 698 h50" stroke="#8E3423" strokeWidth="2" />
              <rect x="470" y="560" width="60" height="80" rx="4" fill="#9AA6B2" stroke={INK} strokeWidth="2.5" />
              <circle cx="500" cy="590" r="12" fill="#FFF4DE" stroke={INK} strokeWidth="2" />
              <path d="M500 590 l6 -5" stroke={INK} strokeWidth="2" />
              <g fill="none" stroke={INK} strokeWidth="2">
                <path d="M530 600 C560 640 590 610 620 600" />
                <path d="M530 610 C566 660 594 624 620 614" />
                <path d="M530 620 C570 680 598 640 620 628" />
                <path d="M530 630 C572 700 600 652 620 640" />
              </g>
              {/* lamp post */}
              <rect x="580" y="300" width="10" height="480" fill={INK} />
              <path d="M585 302 H612 V306" fill="none" stroke={INK} strokeWidth="5" />
              <circle cx="612" cy="318" r="12" fill="#FFF4DE" stroke={INK} strokeWidth="2.5" />
              <circle className="hero-lamp-on" cx="612" cy="318" r="12" fill="#FFC21A" stroke={INK} strokeWidth="2.5" />
              <Shopfront
                idp="s1"
                shutter="anim"
                bulbs="seq"
                inside={
                  <OpeningInside clock="5:58">
                    <Ravi x={920} y={858} actor="s1-ravi" />
                  </OpeningInside>
                }
              />
              <Pavement />
              <polygon className="hero-spill" points="700,780 1180,780 1300,840 580,840" fill="#FFC21A" />
            </Plane>
            <Plane anchor="xMidYMax">
              <ChaiStall />
              <rect x="1140" y="760" width="130" height="36" rx="14" fill="#C99A5B" stroke={INK} strokeWidth="2.5" />
              <path d="M1154 770 h10 M1176 770 h10 M1198 770 h10 M1220 770 h10 M1242 770 h10" stroke={INK} strokeWidth="1.5" />
              <Moti kind="asleep" x={1188} y={772} s={0.78} actor="s1-moti" />
            </Plane>
          </div>
        </div>
        <div className="scene-ui">
          <div className="notice">
            <span className="tape l" aria-hidden />
            <span className="tape r" aria-hidden />
            <span className="time-pill">{HERO.time}</span>
            <h1 id="s1-title" className="hero-h1 mt-3">
              <T v={HERO.h1} />
            </h1>
            <p className="hero-sub mt-3">
              <T v={HERO.sub} />
            </p>
            <p className="hero-sub mt-3 font-semibold">
              <T v={HERO.who} />
            </p>
            <div className="hero-ctas mt-5 hidden md:block">
              <TwoActions pulse />
            </div>
            <a href="#how" className="mt-3 hidden min-h-11 items-center gap-1 text-[15px] font-semibold underline underline-offset-4 md:inline-flex">
              <T v={ACTIONS.seeHow} />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
