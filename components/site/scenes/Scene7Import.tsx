// Scene 7, 7:30 AM: Bring your members. Ravi carries the old registers out of the steel cupboard,
// with Moti riding on top of the pile; the laptop on the side table has the messy sheet open.
import Link from "next/link";
import type { CSSProperties } from "react";
import { RATES, SCENES } from "@/lib/i18n/site";
import { Moti } from "@/components/world/characters/Moti";
import { Ravi } from "@/components/world/characters/Ravi";
import { Dots, INK, Plane, Use } from "@/components/world/kit";
import { Window } from "@/components/world/places";
import { DemoIsland } from "../Islands";
import { ext, Scene, T } from "../bits";

const PILE = ["#D11F5C", "#1565D8", "#0B7D47", "#FFC21A", "#8A4B2A"];

export function Scene7Import() {
  const c = SCENES[6];
  return (
    <Scene
      c={c}
      crop={{ p: [380, 330, 540, 470], m: [0, 200, 1440, 640] }}
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
              x={620}
              y={60}
              w={240}
              h={200}
              bands={[
                [90, "#8ED6F5"],
                [70, "#B8E6F7"],
                [40, "#FFE3A3"],
              ]}
            />
            <rect x="1000" y="80" width="160" height="10" rx="5" fill="#FFF4DE" stroke={INK} strokeWidth="2.5" />
            <rect x="0" y="760" width="1440" height="80" fill="#EED9B5" stroke={INK} strokeWidth="2.5" />
            <Dots x={0} y={760} w={1440} h={80} o={0.1} />
            {/* the steel cupboard, doors open, registers inside */}
            <g stroke={INK} strokeWidth="2.5">
              <rect x="134" y="580" width="240" height="200" fill="#6D7883" />
              <rect x="146" y="596" width="216" height="168" fill="#2B2A40" />
              <path d="M146 680 H362" strokeWidth="4" stroke="#9AA6B2" />
              <path d="M134 580 L104 596 V770 L134 780 Z" fill="#9AA6B2" />
              <path d="M374 580 L404 596 V770 L374 780 Z" fill="#9AA6B2" />
            </g>
            <Use id="register" x={160} y={640} s={0.6} style={{ ["--reg" as string]: "#1565D8" }} />
            <Use id="register" x={250} y={640} s={0.6} style={{ ["--reg" as string]: "#FFC21A" }} />
            <Use id="register" x={160} y={724} s={0.6} style={{ ["--reg" as string]: "#0B7D47" }} />
            <Use id="books" x={260} y={718} s={0.8} />
          </Plane>
          <Plane cls="cam-walk">
            <Ravi x={680} y={762} s={1.08} pose="carry-pile" actor="s7-ravi" />
            <g stroke={INK} strokeWidth="2.5">
              {PILE.map((col, i) => (
                <g key={col} transform={`rotate(${[-3, 2, -2, 3, -1][i]} 680 ${560 - i * 18})`}>
                  <rect x="610" y={542 - i * 18} width="140" height="18" rx="3" fill={col} />
                  <path d={`M736 ${545 - i * 18} v12 M742 ${545 - i * 18} v12`} stroke="#FFF4DE" strokeWidth="2" />
                </g>
              ))}
              <g className="riffle" style={{ "--d": "100ms" } as CSSProperties}>
                <rect x="618" y="448" width="56" height="8" fill="#FFFBF2" strokeWidth="1.5" />
              </g>
              <g className="riffle" style={{ "--d": "180ms" } as CSSProperties}>
                <rect x="690" y="446" width="54" height="8" fill="#FFFBF2" strokeWidth="1.5" />
              </g>
              <g className="riffle" style={{ "--d": "260ms" } as CSSProperties}>
                <rect x="650" y="440" width="60" height="8" fill="#FFFBF2" strokeWidth="1.5" />
              </g>
            </g>
            <Moti kind="sit" x={684} y={448} s={0.5} actor="s7-moti" d={500} />
            <g stroke={INK} strokeWidth="2.5">
              <rect x="780" y="600" width="104" height="14" rx="3" fill="#8A4B2A" />
              <path d="M792 614 V760 M872 614 V760" strokeWidth="6" />
            </g>
            <Use id="laptop" x={782} y={534} d={200} keep="laptop" />
            <g className="cells">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <rect key={i} className="cell" x={800 + (i % 3) * 18} y={548 + Math.floor(i / 3) * 14} width="14" height="10" fill="#FFF4DE" stroke={INK} strokeWidth="1.5" opacity="0" style={{ "--d": `${i * 60}ms` } as CSSProperties} />
              ))}
            </g>
          </Plane>
        </>
      }
      side={
        <div className="side-card rate-board">
          <div className="t-sign text-[22px]">{RATES.title}</div>
          <p className="mt-2 text-[16px] font-semibold leading-snug">
            <T v={RATES.free} />
          </p>
          <p className="mt-2 text-[15px] leading-snug">
            <T v={RATES.more} />
          </p>
          <Link href="/pricing" className="mt-2 inline-flex min-h-11 items-center text-[15px] font-bold underline underline-offset-4">
            <T v={RATES.link} />
          </Link>
        </div>
      }
      demo={<DemoIsland name="import" minH={560} label="Import members demo" />}
    />
  );
}
