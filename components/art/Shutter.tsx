"use client";
// Signature 1. The rolling steel shutter on the shopfront: it opens the day and
// it decides how a shift closes. Acts and timings follow the spec to the ms.
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { istParts } from "@/lib/core/dates";
import { EASE_DOOR } from "./index";

const SLATS = 12;

function shiftLine() {
  const { h, min } = istParts();
  const t = `${h % 12 || 12}:${String(min).padStart(2, "0")}`;
  if (h < 12) return { hi: `सुबह ${t}`, en: "Morning shift" };
  if (h < 16) return { hi: `दोपहर ${t}`, en: "Afternoon shift" };
  return { hi: `शाम ${t}`, en: "Evening shift" };
}

function Slat({ i, children }: { i: number; children?: ReactNode }) {
  return (
    <div
      className="absolute inset-x-0"
      style={{
        bottom: `${(i * 100) / SLATS}%`,
        height: `${100 / SLATS + 0.2}%`,
        background: "linear-gradient(to bottom, var(--steel-hi) 0, var(--steel-hi) 1px, var(--steel) 2px, var(--steel-lo) 100%)",
        borderBottom: "1px solid #4c5153",
        boxShadow: "inset 0 -3px 0 rgba(0,0,0,.12)",
      }}
    >
      <div className="absolute inset-x-0 top-[38%] h-px bg-black/10" />
      <div className="absolute inset-x-0 bottom-[22%] h-[2px]" style={{ background: "linear-gradient(to right, transparent, rgba(0,0,0,.08) 20%, rgba(0,0,0,.02) 50%, rgba(0,0,0,.1) 80%, transparent)" }} />
      {children}
    </div>
  );
}

function Dust({ n, from = "bottom" }: { n: number; from?: "bottom" | "top" }) {
  const parts = Array.from({ length: n }, (_, i) => ({ x: ((i * 37) % 100) + (i % 3) * 1.5, dx: ((i * 53) % 40) - 20, dy: 40 + ((i * 29) % 70), s: 3 + (i % 4) * 2 }));
  return (
    <div className="pointer-events-none absolute inset-x-0 h-0" style={from === "bottom" ? { bottom: 0 } : { top: 0 }} aria-hidden>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block rounded-full"
          style={{ left: `${p.x}%`, width: p.s, height: p.s, background: "var(--chalk-dust)" }}
          initial={{ opacity: 0.9, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.dx, y: from === "bottom" ? -p.dy : p.dy, scale: 2.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export interface ShutterProps {
  gym: string;
  branch: string;
  pin?: (pin: string) => Promise<boolean | string>; // real desks: only a correct PIN raises it
  hint?: ReactNode;
  calm: boolean;
  onAct?: (act: "lock" | "lift" | "dust" | "slate" | "settle") => void;
  onOpen: (via: "key" | "click" | "wheel" | "touch" | "pin") => void;
  ctaLabel?: string;
}

/** Shutter Up. Demo: click, Space/Enter/ArrowUp, wheel or a swipe raise it. Real desk: the staff PIN. */
export function ShutterUp({ gym, branch, pin, hint, calm, onAct, onOpen, ctaLabel = "Raise shutter" }: ShutterProps) {
  const [phase, setPhase] = useState<"closed" | "lifting" | "done">("closed");
  const [digits, setDigits] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fired = useRef(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);
  const [line, setLine] = useState({ hi: "", en: "" });
  useEffect(() => setLine(shiftLine()), []);

  const via = useRef<"key" | "click" | "wheel" | "touch" | "pin">("click");
  const raise = useCallback((how: "key" | "click" | "wheel" | "touch" | "pin" = "click") => {
    if (fired.current) return;
    via.current = how;
    fired.current = true;
    setPhase("lifting");
    onAct?.("lock");
    const t = (ms: number, f: () => void) => setTimeout(f, calm ? 0 : ms);
    if (calm) {
      onAct?.("slate");
      setTimeout(() => {
        setPhase("done");
        onOpen(via.current);
      }, 250);
      return;
    }
    t(120, () => onAct?.("lift"));
    t(450, () => onAct?.("dust"));
    t(620, () => onAct?.("slate"));
    t(1040, () => onAct?.("settle"));
    t(1240, () => {
      setPhase("done");
      onOpen(via.current);
    });
  }, [calm, onAct, onOpen]);

  useEffect(() => {
    if (phase !== "closed") return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    if (pin) pinRef.current?.focus({ preventScroll: true });
    else btn.current?.focus({ preventScroll: true });
    if (pin)
      return () => {
        root.style.overflow = prev;
      };
    let touchY = 0;
    const onWheel = (e: WheelEvent) => e.deltaY > 4 && raise("wheel");
    const onKey = (e: KeyboardEvent) => {
      if ([" ", "Enter", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        raise("key");
      }
    };
    const ts = (e: TouchEvent) => (touchY = e.touches[0].clientY);
    const tm = (e: TouchEvent) => touchY - e.touches[0].clientY > 24 && raise("touch");
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchmove", tm, { passive: true });
    return () => {
      root.style.overflow = prev;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", ts);
      window.removeEventListener("touchmove", tm);
    };
  }, [phase, raise, pin]);

  const submitPin = async (v: string) => {
    if (!pin || busy) return;
    setBusy(true);
    const ok = await pin(v);
    setBusy(false);
    if (ok === true) raise("pin");
    else {
      setErr(typeof ok === "string" ? ok : "That PIN did not match. Try again.");
      setDigits("");
      pinRef.current?.focus();
    }
  };

  const lifting = phase === "lifting";
  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div key="shutter" role="dialog" aria-modal="true" aria-label={`${gym} shutter. ${pin ? "Enter your 4 digit staff PIN" : ctaLabel}`} className="fixed inset-0 z-[80] overflow-hidden" exit={{ opacity: 0 }} transition={{ duration: calm ? 0.25 : 0.2 }} style={{ perspective: 1800 }}>
          {Array.from({ length: SLATS }, (_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              style={{ transformOrigin: "50% 0%", zIndex: i }}
              animate={lifting ? (calm ? { opacity: 0 } : { y: `-${((SLATS - i) * 100) / SLATS + 2}%`, rotateX: [0, 8, 0] }) : { y: 0 }}
              transition={calm ? { duration: 0.25 } : { delay: (120 + i * 40) / 1000, duration: 0.52, ease: EASE_DOOR }}
            >
              <Slat i={i} />
            </motion.div>
          ))}
          {/* guide channels either side, like a real shopfront */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[15] w-3 sm:w-5" style={{ background: "linear-gradient(to right, #3a3e40, #6b7072 40%, #2c2f31)" }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[15] w-3 sm:w-5" style={{ background: "linear-gradient(to left, #3a3e40, #6b7072 40%, #2c2f31)" }} />
          {/* the painted sign across the middle slats */}
          <motion.div className="absolute inset-x-0 z-20 flex flex-col items-center px-4" style={{ top: "22%" }} animate={lifting ? (calm ? { opacity: 0 } : { y: "-110vh" }) : { y: 0 }} transition={calm ? { duration: 0.25 } : { delay: 0.12 + 0.28, duration: 0.6, ease: EASE_DOOR }}>
            <div className="iron max-w-[92vw] px-6 py-4 text-center sm:px-10">
              <div className="t-stencil stamped break-words" style={{ color: "var(--brass)", fontSize: "clamp(34px, 8vw, 88px)" }}>
                {gym}
              </div>
              <div className="t-teko mt-2 text-[18px] sm:text-[22px]" style={{ color: "var(--chalk-dust)" }}>
                {line.hi && (
                  <>
                    <span lang="hi">{line.hi}</span> · {line.en} ·{" "}
                  </>
                )}
                {branch}
              </div>
            </div>
          </motion.div>
          {/* the bottom slat: padlock and the way in */}
          <motion.div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 px-4 pb-[max(18px,env(safe-area-inset-bottom))]" animate={lifting ? (calm ? { opacity: 0 } : { y: "-110vh" }) : { y: 0 }} transition={calm ? { duration: 0.25 } : { delay: 0.12, duration: 0.52, ease: EASE_DOOR }}>
            <motion.svg width="46" height="56" viewBox="0 0 46 56" animate={lifting && !calm ? { rotate: 90, y: 40, opacity: 0 } : { rotate: 0 }} transition={{ rotate: { type: "spring", stiffness: 500, damping: 30, duration: 0.16 }, y: { delay: 0.16, duration: 0.2 }, opacity: { delay: 0.16, duration: 0.2 } }} aria-hidden>
              <path d="M12 24v-8a11 11 0 0 1 22 0v8" fill="none" stroke="var(--steel-hi)" strokeWidth="5" />
              <rect x="4" y="22" width="38" height="30" rx="3" fill="var(--brass)" stroke="#6d5430" strokeWidth="2" />
              <circle cx="23" cy="35" r="4" fill="#3b2e1a" />
              <rect x="21.5" y="36" width="3" height="9" fill="#3b2e1a" />
            </motion.svg>
            {pin ? (
              <form
                className="flex flex-col items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (digits.length === 4) void submitPin(digits);
                }}
              >
                <label className="t-teko text-[18px]" style={{ color: "var(--iron-rim)" }} htmlFor="kb-pin">
                  Staff PIN
                </label>
                <div className="relative flex gap-2">
                  {[0, 1, 2, 3].map((k) => (
                    <span key={k} className="iron grid h-12 w-11 place-items-center t-stencil text-[26px]" style={{ color: "var(--brass-hi)" }} aria-hidden>
                      {digits[k] ? "•" : ""}
                    </span>
                  ))}
                  <input
                    id="kb-pin"
                    ref={pinRef}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    value={digits}
                    disabled={busy}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setDigits(v);
                      setErr("");
                      if (v.length === 4) void submitPin(v);
                    }}
                    className="absolute inset-0 opacity-0"
                    aria-describedby="kb-pin-err"
                  />
                </div>
                <p id="kb-pin-err" role="alert" className="t-teko min-h-5 text-[17px]" style={{ color: "var(--stamp-due)" }}>
                  {err}
                </p>
              </form>
            ) : (
              <button ref={btn} type="button" onClick={() => raise("click")} className="btn-brass">
                {ctaLabel}
                <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
                  <path d="M10 16V4m0 0-5 5m5-5 5 5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </button>
            )}
            {hint && <div className="t-teko text-center text-[15px]" style={{ color: "var(--iron-rim)" }}>{hint}</div>}
          </motion.div>
          {lifting && !calm && (
            <motion.div className="absolute inset-x-0 z-40" style={{ bottom: "50%" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0 }}>
              <Dust n={14} />
            </motion.div>
          )}
          {/* the rolled-up shutter settles into a band at the top */}
          {lifting && !calm && (
            <motion.div className="absolute inset-x-0 top-0 z-50 h-6" style={{ background: "linear-gradient(var(--steel-hi), var(--steel-lo))", borderBottom: "2px solid #4c5153" }} initial={{ y: -30 }} animate={{ y: [-30, 4, 0] }} transition={{ delay: 0.9, duration: 0.3, times: [0, 0.7, 1] }} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Shutter Down: drops back over the desk. stopAt=0.6 leaves a gap under hazard tape. */
export function ShutterDown({ stopAt, calm, children }: { stopAt: number; calm: boolean; children?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[75] overflow-hidden" role="dialog" aria-modal="true" aria-label={stopAt < 1 ? "Shutter stopped: cash count does not match" : "Shift closed"}>
      {Array.from({ length: SLATS }, (_, i) => {
        const visible = i >= Math.round(SLATS * (1 - stopAt));
        return (
          <motion.div
            key={i}
            className="absolute inset-0"
            style={{ zIndex: i, transformOrigin: "50% 0%" }}
            initial={calm ? { opacity: 0 } : { y: `-${((SLATS - i) * 100) / SLATS + 2}%` }}
            animate={calm ? { opacity: 1 } : visible ? { y: ["-100%", "0.6%", "0%"] } : { y: `-${((SLATS - i) * 100) / SLATS + 2}%` }}
            transition={calm ? { duration: 0.15 } : { delay: ((SLATS - 1 - i) * 30) / 1000, duration: 0.7, times: [0, 0.85, 1], ease: EASE_DOOR }}
          >
            {visible && <Slat i={i} />}
          </motion.div>
        );
      })}
      {stopAt < 1 && <motion.div className="absolute inset-x-0 z-30 h-5 hazard" style={{ top: `calc(${stopAt * 100}% - 10px)` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: calm ? 0 : 0.8, duration: 0.25 }} />}
      <div className="absolute inset-0 z-40">{children}</div>
    </div>
  );
}
