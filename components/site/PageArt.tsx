// Art for the other marketing pages: the shop at night (sign in, start), the brick wall with its
// rate board (pricing) and Moti puzzled by a blank signboard (404).
import { Moti } from "@/components/world/characters/Moti";
import { Dots, INK, Plane, Star } from "@/components/world/kit";
import { Pavement, Shopfront, Sky } from "@/components/world/places";

export function NightShop() {
  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden>
      <Plane>
        <g transform="translate(-380 -60) scale(1.15)">
          <Sky
            bands={[
              [0, 300, "#0F1030"],
              [300, 200, "#191A4A"],
              [500, 400, "#24286A"],
            ]}
          />
          {[
            [700, 80],
            [880, 140],
            [1040, 60],
            [1220, 120],
            [1340, 200],
          ].map(([x, y]) => (
            <Star key={x} x={x} y={y} r={7} />
          ))}
          <circle cx="1300" cy="110" r="34" fill="#FFF4DE" stroke={INK} strokeWidth="2.5" />
          <circle cx="1316" cy="100" r="30" fill="#0F1030" />
          <rect x="580" y="300" width="10" height="480" fill={INK} />
          <path d="M585 302 H612 V306" fill="none" stroke={INK} strokeWidth="5" />
          <polygon points="612,330 540,780 690,780" fill="#FFC21A" opacity=".18" />
          <circle cx="612" cy="318" r="12" fill="#FFC21A" stroke={INK} strokeWidth="2.5" />
          <Shopfront idp="night" shutter="down" padlock />
          <Pavement />
          <rect x="1140" y="760" width="130" height="36" rx="14" fill="#C99A5B" stroke={INK} strokeWidth="2.5" />
          <Moti kind="asleep" x={1188} y={772} s={0.78} />
        </g>
      </Plane>
    </div>
  );
}

export function PricingWall() {
  return (
    <div className="relative h-full w-full overflow-hidden" aria-hidden>
      <Plane>
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
        <text x="900" y="360" fontSize="40" fill="#FFF4DE" transform="rotate(-2 900 360)">
          FREE FOR ONE BRANCH
        </text>
        <Pavement />
        <Moti kind="sit" x={1010} y={790} s={0.8} />
        <use href="#pot-plant" x="1180" y="712" />
      </Plane>
    </div>
  );
}

export function LostSign() {
  return (
    <svg viewBox="0 0 520 340" className="h-auto w-full max-w-[520px]" aria-hidden>
      <rect x="0" y="0" width="520" height="340" rx="20" fill="#FFE3A3" />
      <rect x="0" y="280" width="520" height="60" fill="#D9C7A5" stroke={INK} strokeWidth="2.5" />
      <path d="M80 280 V120 M330 280 V120" stroke={INK} strokeWidth="8" />
      <rect x="50" y="60" width="310" height="110" rx="10" fill="#FFC21A" stroke={INK} strokeWidth="4" />
      <Dots x={52} y={62} w={306} h={106} o={0.08} />
      <text x="205" y="128" textAnchor="middle" fontSize="40" fill={INK} opacity=".25" style={{ fontFamily: "var(--font-sign)" }}>
        ? ? ?
      </text>
      <g transform="translate(0 0)">
        <Moti kind="sit" x={420} y={292} s={1.1} pose="tilt" />
      </g>
    </svg>
  );
}
