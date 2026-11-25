// Every character is drawn standing on its own origin (feet at 0,0; 1 unit = 10 art px) and placed
// with an outer group. The inner group carries the pose as a data attribute; joint rotations are
// CSS keyframes on transform only, so a pose change never re-renders the drawing.
import type { CSSProperties, ReactNode } from "react";
import { blink, INK } from "../kit";

export interface ChProps {
  x: number;
  y: number;
  s?: number;
  pose?: string;
  /** "s2-ravi": what the street reactor addresses to change this character's pose */
  actor?: string;
  /** reveal delay in ms for the one-shot scene reveal; omit to draw it static */
  d?: number;
  /** slide in from the left on reveal instead of popping */
  slide?: boolean;
  cls?: string;
  style?: CSSProperties;
}

export function Ch({ name, x, y, s = 1, pose = "idle", actor, d, slide, cls, style, children }: ChProps & { name: string; children: ReactNode }) {
  const reveal = d != null ? (slide ? "rv-slide" : "rv") : "";
  return (
    <g transform={`translate(${x} ${y})${s !== 1 ? ` scale(${s})` : ""}`} data-keepout={name}>
      <g className={reveal || undefined} style={d != null ? ({ "--d": `${d}ms` } as CSSProperties) : undefined}>
        <g className={`ch ${name} ${cls ?? ""}`} data-pose={pose} data-idle={pose} data-actor={actor} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" style={style}>
          {children}
        </g>
      </g>
    </g>
  );
}

/** Two blinking eyes. */
export function Eyes({ y, dx = 12, seed, rx = 5, ry = 7 }: { y: number; dx?: number; seed: string; rx?: number; ry?: number }) {
  return (
    <g className="eyes" style={blink(seed)}>
      <ellipse cx={-dx} cy={y} rx={rx} ry={ry} fill={INK} stroke="none" />
      <ellipse cx={dx} cy={y} rx={rx} ry={ry} fill={INK} stroke="none" />
      <circle cx={-dx + 1.6} cy={y - 2.4} r={1.4} fill="#FFF4DE" stroke="none" />
      <circle cx={dx + 1.6} cy={y - 2.4} r={1.4} fill="#FFF4DE" stroke="none" />
    </g>
  );
}

/** An arm hanging from a shoulder at (sx, sy): upper arm, forearm and hand, each joint a group. */
export function Arm({ side, sx, sy, upper, fore, sleeve, skin, uw = 24, uh = 60, fw = 20, fh = 56, hand = 12, extra, cls }: { side: "l" | "r"; sx: number; sy: number; upper?: string; fore?: string; sleeve: string; skin: string; uw?: number; uh?: number; fw?: number; fh?: number; hand?: number; extra?: ReactNode; cls?: string }) {
  const ux = sx - uw / 2;
  const fx = sx - fw / 2;
  const ey = sy + uh - fw * 0.6;
  return (
    <g className={`arm arm-${side} ${cls ?? ""}`}>
      <g className="shoulder">
        <rect x={ux} y={sy - 4} width={uw} height={uh} rx={uw / 2} fill={upper ?? sleeve} />
        <g className="elbow">
          <rect x={fx} y={ey} width={fw} height={fh} rx={fw / 2} fill={fore ?? skin} />
          <circle cx={sx} cy={ey + fh} r={hand} fill={skin} />
          {extra}
        </g>
      </g>
    </g>
  );
}
