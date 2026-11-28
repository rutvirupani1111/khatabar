"use client";
// The demo desk's first run: four short steps that only move on when the real thing happens
// (the card opens, Renew opens, the money really lands). Always skippable, and saved as done the
// moment the last step shows, so a reload never starts it again.
// Nothing is dimmed and nothing is covered: the control to press gets a marigold ring, and the step
// card sits beside it on a desk screen, docks to the bottom edge on a phone, or sits inside the
// member's sheet when that is open. It moves with transform only, so it never shifts the page.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Moti } from "@/components/world/characters/Moti";
import { lsGet, lsSet, ssGet, ssSet } from "@/lib/client/idb";

const KEY = "kb_tour_desk_done";
let memoryDone = false;

export function tourDone(): boolean {
  if (memoryDone) return true;
  return lsGet(KEY) === "1" || ssGet(KEY) === "1";
}
export function setTourDone(on: boolean) {
  memoryDone = on;
  lsSet(KEY, on ? "1" : "");
  ssSet(KEY, on ? "1" : "");
}

/** 3 is "pick a plan and say how they paid"; "wait" is the same step after UPI "Not yet". */
export type TourStep = 1 | 2 | 3 | "wait" | 4;

interface Props {
  step: TourStep;
  /** the waiting amount and the member's first name, for the words */
  amount?: string;
  name?: string;
  onSkip: () => void;
  onDoIt: () => void;
  onFees: () => void;
}

function stepOf(step: TourStep, amount = "the money", name = "Mahesh") {
  switch (step) {
    case 1:
      return { n: 1, target: "search", text: "Find a member. Type 4521 in the box, the last 4 digits of Mahesh's phone." };
    case 2:
      return { n: 2, target: "renew", text: `This is ${name}'s card. Tap Renew.` };
    case 3:
      return { n: 3, target: "flow", text: "Pick a plan, then say how they paid. For UPI, press 'Yes, money arrived' only after you see it in your bank." };
    case "wait":
      return { n: 3, target: "arrived", text: `Saved as waiting for money. Nothing is counted as paid yet. When ${amount} shows in your bank or UPI app, tap 'Money arrived, mark paid'.` };
    default:
      return { n: 4, target: "done", text: `Done. ${name} is paid and has a receipt. Next, try Fees due to send reminders.` };
  }
}

/** The element a step is about. The desk keeps a hidden copy of the member card for the other
 *  screen width, so the one that is actually drawn wins. */
function findTarget(target: string): Element | null {
  const all = document.querySelectorAll(`[data-tour="${target}"]`);
  for (const e of all) if (e.getClientRects().length > 0) return e;
  return all[0] ?? null;
}

/** Puts the marigold ring on whatever the step is about, and moves it if the element is replaced. */
function useRing(target: string) {
  useEffect(() => {
    let el: Element | null = null;
    const mark = () => {
      const next = findTarget(target);
      if (next === el) return;
      el?.removeAttribute("data-tour-on");
      el = next;
      el?.setAttribute("data-tour-on", "");
    };
    mark();
    const id = window.setInterval(mark, 250);
    return () => {
      window.clearInterval(id);
      el?.removeAttribute("data-tour-on");
    };
  }, [target]);
}

function useWide() {
  const [w, setW] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setW(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return w;
}

function Body({ step, amount, name, onSkip, onDoIt, onFees, showMe, compact }: Props & { showMe?: () => void; compact?: boolean }) {
  const s = stepOf(step, amount, name);
  // phones and tablets: a short strip in the page itself (above the search box, or at the top of
  // the member's sheet), so it never floats over the thing it points at. Same two rows every step.
  if (compact)
    return (
      <>
        <div className="flex items-start gap-2">
          <svg viewBox="0 0 140 110" width="36" height="28" className="pointer-events-none mt-0.5 shrink-0" aria-hidden>
            <Moti kind="sit" x={70} y={108} s={0.7} pose="point" />
          </svg>
          <p className="min-w-0 flex-1 text-[15px] font-bold leading-snug">
            <span className="mr-1 text-[12px] font-semibold text-[var(--muted-ink)]">Step {s.n} of 4.</span>
            {s.text}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {step === 1 && (
            <button type="button" className="btn btn-primary btn-sm !min-h-11" onClick={onDoIt}>
              Do it for me
            </button>
          )}
          {step === 4 && (
            <>
              <button type="button" className="btn btn-primary btn-sm !min-h-11" onClick={onSkip}>
                Finish
              </button>
              <button type="button" className="btn btn-sm !min-h-11" onClick={onFees}>
                Go to Fees due
              </button>
            </>
          )}
          {step !== 4 && (
            <button type="button" className="ml-auto min-h-11 px-1 text-[14px] font-semibold underline underline-offset-4" onClick={onSkip}>
              Skip tour
            </button>
          )}
        </div>
      </>
    );
  return (
    <>
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 140 110" width="44" height="34" className="pointer-events-none shrink-0" aria-hidden>
          <Moti kind="sit" x={70} y={108} s={0.7} pose="point" />
        </svg>
        <p className="text-[13px] font-semibold text-[var(--muted-ink)]">Step {s.n} of 4</p>
      </div>
      <p className="text-[16px] font-bold leading-snug">{s.text}</p>
      <div className="flex flex-wrap gap-2">
        {showMe && (
          <button type="button" className="btn btn-primary btn-sm !min-h-11" onClick={showMe}>
            Show me where
          </button>
        )}
        {step === 1 && (
          <button type="button" className="btn btn-primary btn-sm !min-h-11" onClick={onDoIt}>
            Do it for me
          </button>
        )}
        {step === 4 ? (
          <>
            <button type="button" className="btn btn-primary btn-sm !min-h-11" onClick={onSkip}>
              Finish
            </button>
            <button type="button" className="btn btn-sm !min-h-11" onClick={onFees}>
              Go to Fees due
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-sm !min-h-11" onClick={onSkip}>
            Skip tour
          </button>
        )}
      </div>
    </>
  );
}

/** The step as a card inside the member's sheet on a phone: part of the sheet, covering nothing. */
export function TourInline(p: Props) {
  useRing(stepOf(p.step).target);
  return (
    <div role="status" aria-live="polite" className="flex shrink-0 flex-col gap-2 rounded-2xl border-2 border-[var(--ink)] bg-[var(--marigold-pale)] px-3 py-2">
      <Body {...p} compact />
    </div>
  );
}

/** The floating step card: beside its target on a desk screen. On a phone it sits just above or
 *  below the target, or above the bottom tabs, never on top of the control it points at. */
export function Tour(p: Props) {
  const s = stepOf(p.step, p.amount, p.name);
  const wide = useWide();
  const card = useRef<HTMLDivElement>(null);
  const [off, setOff] = useState(false);
  useRing(s.target);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") p.onSkip();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [p]);

  // place the card beside the target (desk) or above/below it (phone), below the app header
  useLayoutEffect(() => {
    if (wide === null) return;
    const box = card.current;
    if (!box) return;
    let last = "";
    const place = () => {
      const el = findTarget(s.target);
      const bw = box.offsetWidth;
      const bh = box.offsetHeight;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const head = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
      const top0 = Math.max(16, head + 12);
      const r = el?.getBoundingClientRect();
      const seen = !!r && r.width > 0 && r.bottom > top0 + 8 && r.top < vh - 8;
      let x: number;
      let y: number;
      if (!wide) {
        // phones: just above the target (what is under it, like the filter chips, stays free),
        // else just under it if that fits above the bottom tabs, else docked over the tabs
        const floor = vh - 76;
        x = 12;
        if (seen && r && r.top - 12 - bh >= top0) y = r.top - 12 - bh;
        else if (seen && r && r.bottom + 12 + bh <= floor) y = r.bottom + 12;
        else y = floor - bh;
      } else if (!seen || !r) {
        x = vw - bw - 24;
        y = vh - bh - 24;
      } else if (r.left > vw / 2 && r.left - bw - 20 >= 16) {
        x = r.left - bw - 20;
        y = r.top;
      } else if (r.left <= vw / 2 && vw - r.right - 20 >= bw + 16) {
        x = r.right + 20;
        y = r.top;
      } else if (r.bottom + 16 + bh < vh) {
        x = r.left;
        y = r.bottom + 16;
      } else {
        x = r.left;
        y = r.top - bh - 16;
      }
      x = Math.round(wide ? Math.max(16, Math.min(vw - bw - 16, x)) : x);
      y = Math.round(Math.max(top0, Math.min(vh - bh - 16, y)));
      const key = `${x},${y},${seen}`;
      if (key === last) return;
      last = key;
      box.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      box.style.visibility = "visible";
      setOff(!seen);
    };
    place();
    const onMove = () => place();
    window.addEventListener("scroll", onMove, { capture: true, passive: true });
    window.addEventListener("resize", onMove);
    const id = window.setInterval(place, 200);
    return () => {
      window.removeEventListener("scroll", onMove, { capture: true });
      window.removeEventListener("resize", onMove);
      window.clearInterval(id);
    };
  }, [wide, s.target]);

  if (wide === null) return null;
  const showMe = off ? () => findTarget(s.target)?.scrollIntoView({ block: "center", behavior: "smooth" }) : undefined;
  return (
    <div ref={card} role="dialog" aria-label={`Tour step ${s.n} of 4`} aria-live="polite" className={`tour-card panel flex flex-col ${wide ? "gap-3 p-4" : "tour-card-phone gap-2 px-3 py-2"}`}>
      <Body {...p} showMe={wide ? showMe : undefined} compact={!wide} />
    </div>
  );
}
