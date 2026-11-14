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

// One rolled-steel slat profile, tiled 12 times down the screen: a lip, two convex ribs and a groove.
const RIBS =
  "linear-gradient(to bottom, var(--steel-hi) 0, var(--steel-hi) 1px, #7d8385 1px, #b4b9ba 10%, var(--steel) 30%, var(--steel-lo) 45%, #50555a 48.5%, #c2c6c7 51.5%, var(--steel) 66%, var(--steel-lo) 92%, #3f4345 100%)";
// Grime that belongs to the whole shopfront, so it lines up across slats: rust where the shutter meets the
// floor, vertical rain streaks and a shine where hands push it up every morning.
const GRIME = [
  "radial-gradient(70% 16% at 14% 101%, rgba(122,59,44,.34), transparent 70%)",
  "radial-gradient(40% 10% at 84% 100%, rgba(122,59,44,.26), transparent 70%)",
  "radial-gradient(22% 9% at 50% 93%, rgba(255,255,255,.16), transparent 70%)",
  "repeating-linear-gradient(90deg, rgba(40,30,20,.06) 0 1px, transparent 1px 23px, rgba(255,255,255,.05) 23px 24px, transparent 24px 61px, rgba(60,45,30,.05) 61px 63px, transparent 63px 97px)",
  "linear-gradient(to bottom, rgba(0,0,0,.18), transparent 22%, transparent 78%, rgba(40,25,15,.16))",
].join(",");

/** A slat is a full-screen layer clipped to its band, so anything painted across the shutter (the sign)
 *  is cut along the same seams and breaks apart slat by slat as they ratchet up. */
function SlatLayer({ i, children }: { i: number; children?: ReactNode }) {
  const top = 100 - ((i + 1) * 100) / SLATS;
  const bot = (i * 100) / SLATS;
  return (
    <div
      className="absolute inset-0"
      style={{
        clipPath: `inset(${Math.max(0, top - 0.15)}% 0 ${Math.max(0, bot - 0.15)}% 0)`,
        backgroundImage: `${GRIME}, ${RIBS}`,
        backgroundSize: `100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% ${100 / SLATS}%`,
        backgroundColor: "var(--steel)",
      }}
    >
      {children}
      {i === 0 && <BottomRail />}
    </div>
  );
}

/** The angle-iron bottom rail with the two pull handles every shop boy knows. */
function BottomRail() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[14px]" style={{ background: "linear-gradient(#5a5f62, #2c2f31 60%, #1b1d1e)", borderTop: "1px solid var(--steel-hi)" }} aria-hidden>
      {[22, 78].map((x) => (
        <svg key={x} className="absolute -top-[22px]" style={{ left: `calc(${x}% - 30px)` }} width="60" height="26" viewBox="0 0 60 26">
          <path d="M6 24 V10 a8 8 0 0 1 8 -8 H46 a8 8 0 0 1 8 8 V24" fill="none" stroke="#2a2d2f" strokeWidth="6" strokeLinecap="round" />
          <path d="M6 24 V10 a8 8 0 0 1 8 -8 H46 a8 8 0 0 1 8 8 V24" fill="none" stroke="var(--steel-hi)" strokeWidth="1.4" strokeLinecap="round" opacity=".7" transform="translate(-1 -1)" />
          <rect x="1" y="20" width="10" height="6" fill="#3a3e40" />
          <rect x="49" y="20" width="10" height="6" fill="#3a3e40" />
        </svg>
      ))}
    </div>
  );
}

/** The sign a signwriter painted straight onto the slats: brass stencil, chalk-white second line, a
 *  double painted frame, slight overspray and chips where the paint has worn. */
function PaintedSign({ gym, line, branch }: { gym: string; line: { hi: string; en: string }; branch: string }) {
  // one line when the whole name fits; on a phone a long name breaks between words instead of shrinking to nothing
  const word = Math.max(5, ...gym.split(/\s+/).map((w) => w.length));
  const size = `min(168px, max(calc((100vw - 96px) / ${(Math.max(6, gym.length) * 0.56).toFixed(2)}), min(calc((100vw - 120px) / ${(word * 0.56).toFixed(2)}), 64px)))`;
  return (
    <div className="pointer-events-none absolute inset-x-0 flex justify-center px-4" style={{ top: "15%" }} aria-hidden>
      <div className="relative px-[4vw] pb-5 pt-6 text-center" style={{ border: "3px solid rgba(179,139,77,.85)", outline: "1.5px solid rgba(179,139,77,.7)", outlineOffset: "5px", maxWidth: "calc(100vw - 56px)" }}>
        <div className="paint t-stencil" style={{ textWrap: "balance", color: "var(--brass)", fontSize: size, letterSpacing: "0.03em", textShadow: "0 0 7px rgba(179,139,77,.45), 0 0 1px rgba(80,55,20,.6)" }}>
          {gym}
        </div>
        <div className="t-teko mt-3 text-[clamp(15px,2.2vw,24px)]" style={{ color: "rgba(241,238,228,.92)", textShadow: "0 0 5px rgba(241,238,228,.3), 0 1px 0 rgba(0,0,0,.35)" }}>
          {line.hi && (
            <>
              <span lang="hi">{line.hi}</span> · {line.en} ·{" "}
            </>
          )}
          {branch}
        </div>
      </div>
      {/* every shutter on the street has one */}
      <div className="paint t-stencil absolute right-[9%] top-[245%] -rotate-1 text-[clamp(18px,2.6vw,34px)] max-[640px]:hidden" style={{ color: "rgba(181,55,42,.78)", letterSpacing: "0.12em" }}>
        NO PARKING
      </div>
    </div>
  );
}

/** Guide channels with their bolts, fixed to the wall, so they stay put while the curtain moves. */
function Rails() {
  const rail = (side: "left" | "right") => ({
    background: `radial-gradient(circle 2.5px at 50% 50%, #1d1f20 60%, var(--steel-hi) 70%, transparent 80%) 0 0 / 100% 88px repeat-y, linear-gradient(to ${side === "left" ? "right" : "left"}, #2c2f31, #6b7072 40%, #3a3e40 70%, #1c1e1f)`,
    boxShadow: side === "left" ? "6px 0 10px -4px rgba(0,0,0,.5)" : "-6px 0 10px -4px rgba(0,0,0,.5)",
  });
  return (
    <>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[15] w-3 sm:w-5" style={rail("left")} />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[15] w-3 sm:w-5" style={rail("right")} />
    </>
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
          {/* warm tube-light from inside the gym spills out of the widening gap */}
          {lifting && !calm && (
            <motion.div className="pointer-events-none absolute inset-0" style={{ zIndex: 0, background: "linear-gradient(to top, rgba(210,174,110,.34), rgba(210,174,110,.08) 45%, transparent 75%)" }} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ delay: 0.12, duration: 1.1, times: [0, 0.45, 1] }} />
          )}
          {Array.from({ length: SLATS }, (_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              style={{ transformOrigin: "50% 0%", zIndex: i + 1 }}
              animate={lifting ? (calm ? { opacity: 0 } : { y: `-${((SLATS - i) * 100) / SLATS + 2}%`, rotateX: [0, 8, 0] }) : { y: 0 }}
              transition={calm ? { duration: 0.25 } : { delay: (120 + i * 40) / 1000, duration: 0.52, ease: EASE_DOOR }}
            >
              <SlatLayer i={i}>
                <PaintedSign gym={gym} line={line} branch={branch} />
              </SlatLayer>
            </motion.div>
          ))}
          <Rails />
          {/* the bottom slat: padlock and the way in */}
          <motion.div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 px-4 pb-[max(44px,calc(env(safe-area-inset-bottom)+30px))]" animate={lifting ? (calm ? { opacity: 0 } : { y: "-110vh" }) : { y: 0 }} transition={calm ? { duration: 0.25 } : { delay: 0.12, duration: 0.52, ease: EASE_DOOR }}>
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
export function ShutterDown({ stopAt, calm, children, sign }: { stopAt: number; calm: boolean; children?: ReactNode; sign?: string }) {
  return (
    <div className="fixed inset-0 z-[75] overflow-hidden" role="dialog" aria-modal="true" aria-label={stopAt < 1 ? "Shutter stopped: cash count does not match" : "Shift closed"}>
      {Array.from({ length: SLATS }, (_, i) => {
        const visible = i >= Math.round(SLATS * (1 - stopAt));
        return (
          <motion.div
            key={i}
            className="absolute inset-0"
            style={{ zIndex: i + 1, transformOrigin: "50% 0%" }}
            initial={calm ? { opacity: 0 } : { y: `-${((SLATS - i) * 100) / SLATS + 2}%` }}
            animate={calm ? { opacity: 1 } : visible ? { y: ["-100%", "0.6%", "0%"] } : { y: `-${((SLATS - i) * 100) / SLATS + 2}%` }}
            transition={calm ? { duration: 0.15 } : { delay: ((SLATS - 1 - i) * 30) / 1000, duration: 0.7, times: [0, 0.85, 1], ease: EASE_DOOR }}
          >
            {visible && <SlatLayer i={i}>{sign && stopAt >= 1 && <PaintedSign gym={sign} line={{ hi: "", en: "" }} branch="Closed for the shift" />}</SlatLayer>}
          </motion.div>
        );
      })}
      {stopAt >= 1 && <Rails />}
      {stopAt < 1 && <motion.div className="absolute inset-x-0 z-30 h-5 hazard" style={{ top: `calc(${stopAt * 100}% - 10px)` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: calm ? 0 : 0.8, duration: 0.25 }} />}
      <div className="absolute inset-0 z-40">{children}</div>
    </div>
  );
}
