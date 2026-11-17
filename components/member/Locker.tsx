"use client";
// The member card opens like their locker, once a day: the brass key turns a
// quarter, the steel door swings open on its left hinge, the ID card hangs inside.
// Same choreography as Toranika's doors: perspective, 1.1 s, ease [0.65,0,0.35,1].
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EASE_DOOR } from "@/components/art";
import { ssGet, ssSet } from "@/lib/client/idb";
import { todayIST } from "@/lib/core/dates";

export function Locker({ memberNo, calm, label = "Open my locker", aria }: { memberNo: string; calm: boolean; label?: string; aria?: string }) {
  const key = `kb_locker_${memberNo}_${todayIST()}`;
  const [phase, setPhase] = useState<"closed" | "key" | "swing" | "open" | "unknown">("unknown");
  const fired = useRef(false);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPhase(ssGet(key) === "1" ? "open" : "closed");
  }, [key]);

  const open = useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    ssSet(key, "1");
    if (calm) {
      setPhase("swing");
      setTimeout(() => setPhase("open"), 200);
      return;
    }
    setPhase("key");
    setTimeout(() => setPhase("swing"), 180);
    setTimeout(() => setPhase("open"), 1300);
  }, [key, calm]);

  useEffect(() => {
    if (phase !== "closed") return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    btn.current?.focus({ preventScroll: true });
    let y0 = 0;
    const k = (e: KeyboardEvent) => ["Enter", " ", "ArrowUp"].includes(e.key) && (e.preventDefault(), open());
    const ts = (e: TouchEvent) => (y0 = e.touches[0].clientY);
    const tm = (e: TouchEvent) => y0 - e.touches[0].clientY > 24 && open();
    const w = (e: WheelEvent) => Math.abs(e.deltaY) > 4 && open();
    window.addEventListener("keydown", k);
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchmove", tm, { passive: true });
    window.addEventListener("wheel", w, { passive: true });
    return () => {
      root.style.overflow = prev;
      window.removeEventListener("keydown", k);
      window.removeEventListener("touchstart", ts);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("wheel", w);
    };
  }, [phase, open]);

  if (phase === "unknown") return <div className="fixed inset-0 z-[80]" style={{ background: "var(--rubber)" }} aria-hidden />;
  return (
    <AnimatePresence>
      {phase !== "open" && (
        <motion.div key="locker" className="fixed inset-0 z-[80]" style={{ perspective: 1600 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} role="dialog" aria-modal="true" aria-label={aria ?? `Locker ${memberNo}. Tap to open.`}>
          <motion.div
            className="absolute inset-0 origin-left"
            style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden", background: "linear-gradient(100deg, #8e9496 0%, #a8aeb0 30%, #8c9294 70%, #7c8284 100%)", boxShadow: "inset -10px 0 30px rgba(0,0,0,.25)" }}
            animate={phase === "swing" ? (calm ? { opacity: 0 } : { rotateY: -112 }) : { rotateY: 0 }}
            transition={{ duration: calm ? 0.2 : 1.1, ease: EASE_DOOR }}
            onClick={open}
          >
            {/* pressed panel edge and the vents */}
            <div className="absolute inset-4 border-2 border-black/15" style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,.18)" }} />
            <div className="absolute left-1/2 top-[9%] flex -translate-x-1/2 flex-col gap-[7px]">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="block h-[7px] w-[46vw] max-w-[260px] rounded-full" style={{ background: "#2a2d2e", boxShadow: "0 1px 0 rgba(255,255,255,.4)" }} />
              ))}
            </div>
            <div className="t-stencil absolute left-1/2 top-[30%] -translate-x-1/2 whitespace-nowrap text-[clamp(44px,15vw,120px)]" style={{ color: "rgba(30,32,34,.8)", textShadow: "0 1px 0 rgba(255,255,255,.35)" }}>
              {memberNo}
            </div>
            <div className="absolute inset-x-0 bottom-[8%] flex flex-col gap-[7px] px-[18%]">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="block h-[6px] rounded-full" style={{ background: "#2a2d2e", boxShadow: "0 1px 0 rgba(255,255,255,.4)" }} />
              ))}
            </div>
            {/* the lock and the brass key tag */}
            <div className="absolute right-[10%] top-1/2 -translate-y-1/2">
              <div className="grid size-16 place-items-center rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #d9dcdd, #6b7072)", boxShadow: "0 2px 4px rgba(0,0,0,.4)" }}>
                <motion.div animate={phase === "key" || phase === "swing" ? { rotate: 90 } : { rotate: 0 }} transition={{ duration: 0.18 }} className="relative h-10 w-3 rounded-sm" style={{ background: "#3a3d3f" }}>
                  <span className="absolute left-1/2 top-[-34px] h-9 w-[6px] -translate-x-1/2" style={{ background: "linear-gradient(var(--brass-hi), var(--brass))" }} />
                </motion.div>
              </div>
              <motion.div className="t-stencil absolute left-1/2 top-[86px] w-[86px] -translate-x-1/2 py-2 text-center text-[18px]" style={{ background: "linear-gradient(var(--brass-hi), var(--brass))", color: "var(--brass-ink)", clipPath: "polygon(50% 0, 100% 18%, 100% 100%, 0 100%, 0 18%)" }} animate={phase !== "closed" ? { rotate: [0, -8, 4, 0] } : { rotate: [0, 3, -2, 0] }} transition={{ duration: 0.9, repeat: phase === "closed" ? Infinity : 0, repeatDelay: 2 }}>
                {memberNo.split("-")[1]}
              </motion.div>
            </div>
          </motion.div>
          {phase === "swing" && !calm && (
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 12 }, (_, i) => (
                <motion.span key={i} className="absolute block size-2 rounded-full" style={{ left: `${8 + ((i * 41) % 30)}%`, top: `${20 + ((i * 53) % 60)}%`, background: "var(--chalk-dust)" }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0], x: 30 + (i % 4) * 14, y: -20 - (i % 3) * 16, scale: 2 }} transition={{ delay: 0.55, duration: 0.6 }} />
              ))}
            </div>
          )}
          {/* absolute now wins over the brass button's own position (components layer), so it sits 24 px off the bottom */}
          <button ref={btn} type="button" onClick={open} className="btn-brass absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 !min-h-12 -translate-x-1/2 whitespace-nowrap" style={{ opacity: phase === "closed" ? 1 : 0 }}>
            {label}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
