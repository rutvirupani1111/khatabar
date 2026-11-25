// Server-rendered pieces of the marketing pages: bilingual text, the caption card, the scene frame.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ACTIONS, type Bi, type SceneCopy } from "@/lib/i18n/site";
import { CtaLink } from "./client";

/** Both languages in the HTML; the head script shows one before first paint. */
export function T({ v, block }: { v: Bi; block?: boolean }) {
  return (
    <>
      <span className="l-en">{v.en}</span>
      <span className={`l-hi${block ? " l-block" : ""}`} lang="hi">
        {v.hi}
      </span>
    </>
  );
}

export function stopOf(n: number): Bi {
  return { en: ACTIONS.stopOf.en.replace("{n}", String(n)), hi: ACTIONS.stopOf.hi.replace("{n}", String(n)) };
}

export function CaptionCard({ c, timeLabel, noLink }: { c: SceneCopy; timeLabel?: ReactNode; noLink?: boolean }) {
  return (
    <div className="caption">
      <div className="flex flex-wrap items-center gap-3">
        <span className="time-pill" data-time>
          {timeLabel ?? `${c.time} ${Number(c.time.split(":")[0]) >= 9 && c.n === 6 ? "PM" : "AM"}`}
        </span>
        <span className="text-[14px] font-semibold text-[var(--muted-ink)]">
          <T v={stopOf(c.n)} />
        </span>
      </div>
      <h2 id={`s${c.n}-title`} className="scene-h2 mt-3">
        <T v={c.h2} />
      </h2>
      <p className="problem mt-2">
        <T v={c.problem} />
      </p>
      <p className="try-it mt-3">
        <T v={ACTIONS.tryIt} /> <T v={c.try} />
      </p>
      {c.demo && !noLink && (
        <Link href={c.demo} className="mt-2 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold underline underline-offset-4">
          <T v={ACTIONS.fullDemo} />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

export interface Crop {
  /** phone crop rect in art px */
  p: [number, number, number, number];
  /** medium crop rect in art px */
  m: [number, number, number, number];
}

export function cropVars(c: Crop, vh = 840): CSSProperties {
  return {
    "--px": c.p[0],
    "--py": c.p[1],
    "--pw": c.p[2],
    "--ph": c.p[3],
    "--mx": c.m[0],
    "--my": c.m[1],
    "--mw": c.m[2],
    "--mh": c.m[3],
    "--vh": vh,
  } as CSSProperties;
}

/** Hard-stop band extension for viewports wider than the 1440 art: same y as the art at any height. */
export function ext(stops: [string, number][], vh = 840): string {
  let prev = 0;
  const parts = stops.map(([c, y]) => {
    const at = `max(${y}px, ${((y / vh) * 100).toFixed(3)}%)`;
    const s = `${c} ${prev === 0 ? "0" : `max(${prev}px, ${((prev / vh) * 100).toFixed(3)}%)`} ${at}`;
    prev = y;
    return s;
  });
  return `linear-gradient(to bottom, ${parts.join(", ")})`;
}

export function Scene({ c, crop, ext: bg, art, side, demo, demoCls = "", cls = "", vh, style }: { c: SceneCopy; crop: Crop; ext: string; art: ReactNode; side?: ReactNode; demo: ReactNode; demoCls?: string; cls?: string; vh?: number; style?: CSSProperties }) {
  return (
    <section id={c.id} data-scene={c.n} aria-labelledby={`s${c.n}-title`} className={`scene wide cv ${cls}`} style={{ ...cropVars(crop, vh), "--ext": bg, ...style } as CSSProperties}>
      <div className="scene-art" aria-hidden>
        <div className="scene-crop">{art}</div>
      </div>
      <div className="scene-ui">
        <CaptionCard c={c} />
        {side}
        <div className={`demo-slot ${demoCls}`} data-demo-slot>
          {demo}
        </div>
      </div>
    </section>
  );
}

export function TwoActions({ swap, size = "lg", pulse }: { swap?: boolean; size?: "lg" | "md"; pulse?: boolean }) {
  const big = size === "lg" ? "btn-lg" : "";
  const demo = (
    <CtaLink key="d" href="/demo/desk" className={`btn ${big} ${swap ? "" : "btn-primary"} ${pulse ? "cta-pulse" : ""}`}>
      <T v={ACTIONS.demo} />
    </CtaLink>
  );
  const start = (
    <CtaLink key="s" href="/start" className={`btn ${big} ${swap ? "btn-primary" : ""}`}>
      <T v={ACTIONS.start} />
    </CtaLink>
  );
  return <div className="flex flex-wrap gap-3">{swap ? [start, demo] : [demo, start]}</div>;
}
