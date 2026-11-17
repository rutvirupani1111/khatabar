"use client";
import { AnimatePresence, motion } from "motion/react";
import { InkTick, Portrait, SPRING, Stamp } from "@/components/art";
import { rupees } from "@/lib/core/money";
import { useGym } from "@/components/shell/Gym";
import type { ScanEvent } from "./checkin";

export function Arrivals({ items, count }: { items: ScanEvent[]; count: number }) {
  const { t } = useGym();
  return (
    <section aria-label="Today's attendance" className="flex min-h-0 flex-col">
      <div className="flex items-baseline justify-between px-3 pt-2">
        <h2 className="t-teko text-[18px]" style={{ color: "var(--chalk)" }}>
          <span lang="hi">हाज़िरी</span> · {t.present}
        </h2>
        <span className="t-stencil tnum text-[26px]" style={{ color: "var(--brass-hi)", minWidth: "3ch", textAlign: "right" }} aria-live="polite">
          {String(count).padStart(3, "0")}
        </span>
      </div>
      {/* every arrival of the day: seven in view, the rest scroll in the same column */}
      <ol className="scroll-thin flex max-h-[344px] flex-col gap-1 overflow-y-auto px-3 pb-2" style={{ minHeight: 40 }}>
        <AnimatePresence initial={false}>
          {items.map((e) => (
            <motion.li key={e.id} layout initial={{ x: 260, opacity: 0, rotate: 6 }} animate={{ x: 0, opacity: 1, rotate: 0 }} exit={{ opacity: 0 }} transition={SPRING} className="pvc flex h-11 items-center gap-2 px-2" style={{ borderRadius: 4, borderTop: `3px solid var(--branch)` }}>
              <span className="[&>span]:!h-8 [&>span]:!w-7">{e.st && <Portrait name={e.st.m.name} photo={e.st.m.photo} size={28} />}</span>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-[13px] font-medium" style={{ color: "var(--ink)" }}>
                  {e.st?.m.name}
                </span>
                <span className="t-hand truncate text-[12.5px]" style={{ color: "var(--ink)" }}>
                  <span lang="hi">हाज़िरी लगी</span> · {e.text} · {e.time}
                </span>
              </span>
              <InkTick size={16} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {items.length > 7 && (
        <p className="t-teko px-3 pb-1 text-[13px] muted">
          {count} in today · scroll for the other {items.length - 7}
        </p>
      )}
    </section>
  );
}

const WORD: Record<string, { word: string; kind: "due" | "freeze" | "lapsed" | "pending"; sub?: (e: ScanEvent) => string }> = {
  dues: { word: "बाकी", kind: "due", sub: (e) => rupees(e.st?.dues ?? 0) },
  frozen: { word: "FROZEN", kind: "freeze" },
  lapsed: { word: "LAPSED", kind: "lapsed" },
  photo: { word: "PHOTO", kind: "pending" },
};

export function NeedsAWord({ items, focus, onAct }: { items: ScanEvent[]; focus: number; onAct: (e: ScanEvent, a: "open" | "credit" | "away" | "photo-ok" | "end-freeze") => void }) {
  const { t } = useGym();
  return (
    <section aria-label={t.needsAWord} className="flex min-h-0 flex-1 flex-col">
      <h2 className="t-teko px-3 pt-2 text-[18px]" style={{ color: "var(--hazard)" }}>
        {t.needsAWord} {items.length ? `(${items.length})` : ""}
      </h2>
      {!items.length && <p className="t-hand px-3 text-[15px] muted">Nobody waiting. Scans land here only when someone owes, is frozen or has lapsed.</p>}
      <div className="scroll-thin flex flex-col gap-3 overflow-y-auto px-3 pb-3 pt-1">
        <AnimatePresence initial={false}>
          {items.map((e, i) => {
            // 1-14 days over is DUE, like the register and the rack; 15+ is LAPSED
            const w = e.kind === "lapsed" && e.st?.plate === "p20" ? { word: "DUE", kind: "due" as const, sub: undefined } : WORD[e.kind];
            const tilt = e.kind === "lapsed" ? -4 : 0;
            return (
              <motion.div key={e.id} layout initial={{ x: 260, rotateY: 180, opacity: 0 }} animate={{ x: 0, rotateY: 0, opacity: 1, rotate: tilt }} exit={{ opacity: 0, x: -40 }} transition={SPRING} className="relative" style={{ outline: i === focus ? "2px solid var(--focus)" : undefined, outlineOffset: 2 }}>
                {e.kind === "lapsed" && <div className="hazard absolute -top-2 left-0 right-0 z-10 h-2" />}
                <div className="pvc relative flex gap-2 p-2" style={{ borderRadius: 6, borderTop: "4px solid var(--branch)" }}>
                  <span className="[&>span]:!h-14 [&>span]:!w-12">{e.st && <Portrait name={e.st.m.name} photo={e.st.m.photo} size={e.kind === "photo" ? 80 : 48} />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                      {e.st?.m.name}
                    </div>
                    <div className="t-mono text-[11px] muted">
                      {e.st?.m.memberNo} · {e.time}
                    </div>
                    <div className="t-teko text-[13px]" style={{ color: "var(--carbon)" }}>
                      {e.text}
                    </div>
                  </div>
                  {w && (
                    <span className="absolute -right-1 top-1">
                      <Stamp kind={w.kind} word={w.word} sub={w.sub?.(e)} seed={e.id} size={0.55} />
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {e.kind === "photo" ? (
                    <button type="button" className="btn-iron !min-h-8 !text-[14px]" onClick={() => onAct(e, "photo-ok")}>
                      Face matches (Enter)
                    </button>
                  ) : (
                    <button type="button" className="btn-iron !min-h-8 !text-[14px]" onClick={() => onAct(e, "open")}>
                      Counter (Enter)
                    </button>
                  )}
                  {e.kind === "frozen" && (
                    <button type="button" className="btn-iron !min-h-8 !text-[14px]" onClick={() => onAct(e, "end-freeze")}>
                      End freeze
                    </button>
                  )}
                  <button type="button" className="btn-iron !min-h-8 !text-[14px]" onClick={() => onAct(e, "credit")}>
                    Let in once (L)
                  </button>
                  <button type="button" className="btn-iron !min-h-8 !text-[14px]" onClick={() => onAct(e, "away")}>
                    Turn away (X)
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
