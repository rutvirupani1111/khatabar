// Small pictures from the street for the app: a 200 x 88 vignette on the right of each screen's
// header, and a larger drawing for empty states. Illustration lives only in headers, the tour and
// empty states, never in the working areas of a screen.
import { Kabootar } from "./characters/Kabootar";
import { Meena } from "./characters/Meena";
import { Moti } from "./characters/Moti";
import { Ravi } from "./characters/Ravi";
import { Dots, INK } from "./kit";

export type VignetteKind = "desk" | "fees" | "freeze" | "report" | "import" | "door" | "settings";

export function Vignette({ kind }: { kind: VignetteKind }) {
  return (
    <svg viewBox="0 0 200 88" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden className="block">
      {kind === "desk" && (
        <g>
          <rect width="200" height="88" fill="#FFE7B8" />
          <Dots x={0} y={0} w={200} h={88} o={0.08} />
          <Ravi x={100} y={150} s={0.36} />
          <rect x="30" y="64" width="140" height="24" fill="#8A4B2A" stroke={INK} strokeWidth="2" />
          <rect x="24" y="58" width="152" height="8" rx="2" fill="#6A3820" stroke={INK} strokeWidth="2" />
          <use href="#register" x={40 / 0.3} y={46 / 0.3} transform="scale(0.3)" />
        </g>
      )}
      {kind === "fees" && (
        <g>
          <rect width="200" height="30" fill="#FF6B4A" />
          <rect y="30" width="200" height="6" fill="#F3F1E7" stroke={INK} strokeWidth="2" />
          <rect y="36" width="200" height="52" fill="#B5452E" />
          <rect y="36" width="200" height="52" fill="url(#kb-bricks)" opacity=".75" />
          <Kabootar x={100} y={36} s={0.5} />
        </g>
      )}
      {kind === "freeze" && (
        <g>
          <rect width="200" height="88" fill="#F3F1E7" />
          <rect x="4" y="4" width="192" height="80" fill="none" stroke="#9AA6B2" strokeWidth="6" />
          {[
            [40, 30, "#FFE7B8", "MP"],
            [80, 52, "#1565D8", "OM"],
            [124, 28, "#FFE7B8", "RJ"],
            [160, 56, "#6B6880", "SK"],
          ].map(([x, y, c, t]) => (
            <g key={t as string}>
              <circle cx={x as number} cy={y as number} r="13" fill={c as string} stroke={INK} strokeWidth="2" />
              <text x={x as number} y={(y as number) + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={c === "#FFE7B8" ? INK : "#fff"} style={{ fontFamily: "var(--font-sans)" }}>
                {t as string}
              </text>
            </g>
          ))}
        </g>
      )}
      {kind === "report" && (
        <g>
          <rect width="200" height="88" fill="#8ED6F5" />
          <circle cx="40" cy="22" r="12" fill="#FFE7B8" stroke={INK} strokeWidth="2" />
          <rect x="50" y="20" width="110" height="68" fill="#FFB547" stroke={INK} strokeWidth="2" />
          <Meena x={104} y={150} s={0.34} />
          <rect x="40" y="66" width="130" height="5" fill="#8A4B2A" stroke={INK} strokeWidth="1.5" />
        </g>
      )}
      {kind === "import" && (
        <g>
          <rect width="200" height="88" fill="#FFE7B8" />
          {["#8A4B2A", "#FFC21A", "#0B7D47", "#1565D8", "#D11F5C"].map((c, i) => (
            <rect key={c} x={62 + (i % 2) * 4} y={74 - i * 9} width="76" height="9" rx="2" fill={c} stroke={INK} strokeWidth="1.5" />
          ))}
          <Moti kind="sit" x={100} y={30} s={0.2} />
        </g>
      )}
      {kind === "door" && (
        <g>
          <rect width="200" height="88" fill="#B5452E" />
          <rect width="200" height="88" fill="url(#kb-bricks)" opacity=".75" />
          <rect x="110" y="10" width="70" height="78" fill="#B8E6F7" stroke="#9AA6B2" strokeWidth="5" />
          <rect x="60" y="22" width="30" height="50" rx="5" fill={INK} stroke={INK} strokeWidth="2" />
          <rect x="65" y="28" width="20" height="22" rx="2" fill="#FFF4DE" />
          <circle className="led" cx="75" cy="62" r="4" fill="#0B7D47" />
        </g>
      )}
      {kind === "settings" && (
        <g>
          <rect width="200" height="88" fill="#B8E6F7" />
          <use href="#tiffin" x={60 / 0.8} y={20 / 0.8} transform="scale(0.8)" />
          <use href="#kettle" x={110} y={30} />
        </g>
      )}
    </svg>
  );
}

/** A bigger empty-state drawing: Ravi at the counter, or Kabootar asleep on the wall. */
export function EmptyArt({ kind = "desk", size = 220 }: { kind?: "desk" | "fees" | "import"; size?: number }) {
  return (
    <svg viewBox="0 0 300 200" width={size} height={(size * 2) / 3} aria-hidden className="block">
      {kind === "fees" ? (
        <g>
          <rect y="70" width="300" height="12" fill="#F3F1E7" stroke={INK} strokeWidth="2.5" />
          <rect y="82" width="300" height="118" fill="#B5452E" stroke={INK} strokeWidth="2.5" />
          <rect y="82" width="300" height="118" fill="url(#kb-bricks)" opacity=".75" />
          <Kabootar x={150} y={72} s={1.1} letter={false} />
          <g fill="none" stroke={INK} strokeWidth="2">
            <path d="M200 20 h10 l-10 12 h10" />
            <path d="M218 4 h7 l-7 9 h7" />
          </g>
        </g>
      ) : kind === "import" ? (
        <g>
          <rect width="300" height="200" fill="#FFE7B8" />
          <Ravi x={150} y={268} s={0.62} pose="carry-pile" />
          {["#D11F5C", "#1565D8", "#0B7D47", "#FFC21A", "#8A4B2A"].map((c, i) => (
            <rect key={c} x={104} y={150 - i * 12} width="92" height="12" rx="2" fill={c} stroke={INK} strokeWidth="2" />
          ))}
          <Moti kind="sit" x={150} y={90} s={0.34} />
        </g>
      ) : (
        <g>
          <rect width="300" height="200" fill="#FFE7B8" />
          <Dots x={0} y={0} w={300} h={200} o={0.08} />
          <Ravi x={150} y={300} s={0.7} />
          <rect x="40" y="150" width="220" height="50" fill="#8A4B2A" stroke={INK} strokeWidth="2.5" />
          <rect x="30" y="140" width="240" height="12" rx="3" fill="#6A3820" stroke={INK} strokeWidth="2.5" />
          <use href="#register" x={50 / 0.6} y={118 / 0.6} transform="scale(0.6)" />
          <use href="#qr-standee" x={200 / 0.5} y={92 / 0.5} transform="scale(0.5)" />
        </g>
      )}
    </svg>
  );
}
