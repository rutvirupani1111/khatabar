// Art for the other marketing pages: the shop at night (sign in, start), the brick wall with its
// rate board (pricing) and Moti puzzled by a blank signboard (404).
import type { ReactNode } from "react";
import { Moti } from "@/components/world/characters/Moti";
import { Dots, INK, Star } from "@/components/world/kit";
import { Pavement, Shopfront, Sky } from "@/components/world/places";

export function NightShop() {
  // Drawn at the scene 1 geometry: the night wall on the left (the form's notice is pasted there on
  // wide screens), the shop with its shutter down and padlocked, the lamp still lit, Moti asleep.
  return (
    <div className="night-art" aria-hidden>
      <svg className="world" viewBox="0 0 1440 840" preserveAspectRatio="xMidYMax slice" focusable="false">
        <Sky
          bands={[
            [0, 220, "#0F1030"],
            [220, 160, "#191A4A"],
            [380, 460, "#24286A"],
          ]}
        />
        {[
          [90, 60],
          [330, 130],
          [520, 50],
          [760, 110],
          [1040, 60],
          [1220, 150],
          [1380, 90],
        ].map(([x, y]) => (
          <Star key={x} x={x} y={y} r={7} />
        ))}
        <circle cx="1150" cy="120" r="34" fill="#FFF4DE" stroke={INK} strokeWidth="2.5" />
        <circle cx="1166" cy="110" r="30" fill="#0F1030" />
        <g fill="#191A4A" stroke={INK} strokeWidth="2.5">
          <path d="M0 300 H180 V840 H0 Z" />
          <path d="M170 340 H310 V840 H170 Z" />
          <path d="M1260 310 H1440 V840 H1260 Z" />
        </g>
        <rect x="1300" y="350" width="22" height="26" fill="#FFC21A" stroke={INK} strokeWidth="1.5" />
        <rect x="0" y="260" width="620" height="520" fill="#2E3A78" stroke={INK} strokeWidth="2.5" />
        <Dots x={0} y={260} w={620} h={520} o={0.1} />
        <rect x="580" y="300" width="10" height="480" fill={INK} />
        <path d="M585 302 H612 V306" fill="none" stroke={INK} strokeWidth="5" />
        <polygon points="612,330 520,780 704,780" fill="#FFC21A" opacity=".16" />
        <circle cx="612" cy="318" r="12" fill="#FFC21A" stroke={INK} strokeWidth="2.5" />
        <Shopfront idp="night" shutter="down" padlock />
        <Pavement />
        <rect x="1140" y="760" width="130" height="36" rx="14" fill="#C99A5B" stroke={INK} strokeWidth="2.5" />
        <path d="M1154 770 h10 M1176 770 h10 M1198 770 h10 M1220 770 h10 M1242 770 h10" stroke={INK} strokeWidth="1.5" />
        <Moti kind="asleep" x={1188} y={772} s={0.78} />
      </svg>
    </div>
  );
}

/** A street wall drawn at the home page geometry. Phone: a band cropped on the right-hand props;
 *  tablet and up: the whole wall behind the page, ground on the bottom edge. */
function WallScene({ children, sign }: { children?: ReactNode; sign?: string }) {
  return (
    <div className="page-art" aria-hidden>
      <svg className="world" viewBox="0 0 1440 840" preserveAspectRatio="xMidYMax slice" focusable="false">
        <Sky
          bands={[
            [0, 120, "#3E5BA9"],
            [120, 90, "#FF6B4A"],
            [210, 60, "#FFB547"],
          ]}
          dots={1}
        />
        <rect x="0" y="250" width="1440" height="18" fill="#F3F1E7" stroke={INK} strokeWidth="2.5" />
        <rect x="0" y="268" width="1440" height="512" fill="#B5452E" stroke={INK} strokeWidth="2.5" />
        <rect x="0" y="268" width="1440" height="512" fill="url(#kb-bricks)" opacity=".75" />
        <Dots x={0} y={268} w={1440} h={512} o={0.1} />
        {sign && (
          <text x="900" y="360" fontSize="40" fill="#FFF4DE" transform="rotate(-2 900 360)">
            {sign}
          </text>
        )}
        <Pavement />
        {children}
      </svg>
    </div>
  );
}

export function PricingWall() {
  return (
    <WallScene sign="FREE FOR ONE BRANCH">
      <Moti kind="sit" x={1010} y={790} s={0.8} />
      <use href="#pot-plant" x="1180" y="712" />
    </WallScene>
  );
}

/** 404: a blank marigold signboard on two posts, and Moti with his head tilted at it. */
export function LostStreet() {
  return (
    <WallScene>
      <g stroke={INK}>
        <path d="M860 780 V470 M1120 780 V470" strokeWidth="10" />
        <rect x="800" y="380" width="380" height="130" rx="12" fill="#FFC21A" strokeWidth="4" />
        <Dots x={804} y={384} w={372} h={122} o={0.1} />
        <text x="990" y="466" textAnchor="middle" fontSize="54" fill={INK} opacity=".22" stroke="none" style={{ fontFamily: "var(--font-sign)" }}>
          ? ? ?
        </text>
      </g>
      <Moti kind="sit" x={1250} y={790} s={0.95} pose="tilt" />
      <use href="#pot-plant" x="700" y="712" />
    </WallScene>
  );
}
