// Finale: the street, fully awake. The signboard bulbs light one by one, Ravi waves from the door,
// Mahesh walks out with his towel, Omkar heads off with his books and Meena arrives on her scooter.
import type { CSSProperties } from "react";
import { FINALE } from "@/lib/i18n/site";
import { Kabootar } from "@/components/world/characters/Kabootar";
import { Mahesh } from "@/components/world/characters/Mahesh";
import { Meena } from "@/components/world/characters/Meena";
import { Moti } from "@/components/world/characters/Moti";
import { Omkar } from "@/components/world/characters/Omkar";
import { Ravi } from "@/components/world/characters/Ravi";
import { Dots, INK, Plane, Use } from "@/components/world/kit";
import { ChaiStall, OpeningInside, Pavement, Shopfront, Sky, Wires } from "@/components/world/places";
import { cropVars, ext, T, TwoActions } from "../bits";

export function Finale() {
  const style = {
    ...cropVars({ p: [600, 160, 840, 480], m: [0, 100, 1440, 540] }, 640),
    "--ext": ext(
      [
        ["#8ED6F5", 140],
        ["#B8E6F7", 230],
        ["#4F7FD1", 580],
        ["#D9C7A5", 640],
      ],
      640,
    ),
  } as CSSProperties;
  return (
    <section id="start" data-scene="8" aria-labelledby="s8-title" className="scene wide cv finale" style={style}>
      <div className="scene-art" aria-hidden>
        <div className="scene-crop">
          <Plane vh={640} cls="cam-zoom">
            <g transform="translate(0 -200)">
              <Sky
                bands={[
                  [200, 140, "#8ED6F5"],
                  [340, 90, "#B8E6F7"],
                  [430, 410, "#FFE3A3"],
                ]}
              />
              <rect x="0" y="380" width="620" height="400" fill="#4F7FD1" stroke={INK} strokeWidth="2.5" />
              <Dots x={0} y={380} w={620} h={400} o={0.1} />
              <rect x="1260" y="330" width="180" height="450" fill="#2A2A72" stroke={INK} strokeWidth="2.5" />
              <Wires paths={["M0 330 Q620 400 1440 320"]} />
              <Shopfront
                idp="fin"
                shutter="up"
                bulbs="reveal"
                inside={
                  <OpeningInside clock="7:45">
                    <Ravi x={840} y={880} s={1.02} pose="wave-door" actor="fin-ravi" />
                  </OpeningInside>
                }
              />
              <ChaiStall />
              <Pavement />
              <Use id="scooter" x={372} y={678} s={0.6} style={{ ["--scoot" as string]: "#D11F5C" }} />
              <Meena x={448} y={748} s={0.5} chair={false} pose="smile" actor="fin-meena" />
              <Mahesh x={1066} y={800} s={0.62} pose="walk" towel bag={false} actor="fin-mahesh" />
              <Omkar x={1170} y={800} s={0.6} pose="walk-books" actor="fin-omkar" />
              <Moti kind="stand" x={960} y={796} s={0.5} pose="wag" actor="fin-moti" />
              <Kabootar x={440} y={366} s={0.8} actor="fin-kabootar" letter={false} />
            </g>
          </Plane>
        </div>
      </div>
      <div className="scene-ui">
        <div className="notice finale-notice">
          <span className="tape l" aria-hidden />
          <span className="tape r" aria-hidden />
          <h2 id="s8-title" className="scene-h2">
            <T v={FINALE.h2} />
          </h2>
          <div className="mt-4">
            <TwoActions swap />
          </div>
          <p className="mt-3 text-[15px] font-semibold">
            <T v={FINALE.line} />
          </p>
        </div>
      </div>
    </section>
  );
}
