"use client";
// The demo desk's first run: four short steps that only move on when the real thing happens
// (the card opens, Renew opens, the payment lands). Always skippable, never shown again once done.
// The highlighted control stays usable; the tour never blocks typing.
import { useEffect, useLayoutEffect, useState } from "react";
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

const STEPS: { target: string; text: string }[] = [
  { target: "search", text: "Find a member. Type 4521 in the box." },
  { target: "renew", text: "Tap Renew." },
  { target: "flow", text: "Pick a plan, then how they paid. For UPI, press 'Yes, money arrived' only after you see it in your bank." },
  { target: "card", text: "Done. That is a renewal. Next, try Fees due to send reminders." },
];

export function Tour({ step, onSkip, onDoIt, onFees }: { step: number; onSkip: () => void; onDoIt: () => void; onFees: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const s = STEPS[step - 1];
  useLayoutEffect(() => {
    if (!s) return;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${s.target}"]`);
      const r = el?.getBoundingClientRect() ?? null;
      setRect((old) => (old && r && old.x === r.x && old.y === r.y && old.width === r.width && old.height === r.height ? old : r));
      raf = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(raf);
  }, [s]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step > 0) onSkip();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [step, onSkip]);
  if (!s) return null;
  const pad = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const hole = rect ? { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 } : null;
  const below = hole ? hole.y + hole.h + 220 < vh : true;
  const bw = Math.min(320, vw - 32);
  const bx = hole ? Math.max(16, Math.min(vw - bw - 16, hole.x)) : 16;
  const by = hole ? (below ? hole.y + hole.h + 14 : Math.max(16, hole.y - 14 - 200)) : 80;
  return (
    <div className="pointer-events-none fixed inset-0 z-[65]" aria-live="polite">
      {hole && <div className="fixed rounded-[14px] transition-all duration-150" style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h, boxShadow: "0 0 0 9999px rgba(27,26,46,.55)", outline: "3px solid var(--marigold)" }} />}
      <div role="dialog" aria-label={`Tour step ${step} of 4`} className="panel pointer-events-auto fixed flex flex-col gap-3 p-4" style={{ left: bx, top: by, width: bw }}>
        <svg viewBox="0 0 140 110" width="64" height="50" className="absolute -right-3 -top-10" aria-hidden>
          <Moti kind="sit" x={70} y={108} s={0.7} pose="point" />
        </svg>
        <p className="text-[13px] font-semibold text-[var(--muted-ink)]">Step {step} of 4</p>
        <p className="text-[16px] font-bold leading-snug">{s.text}</p>
        <div className="flex flex-wrap gap-2">
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
          {step < 4 && (
            <button type="button" className="btn btn-sm !min-h-11" onClick={onSkip}>
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
