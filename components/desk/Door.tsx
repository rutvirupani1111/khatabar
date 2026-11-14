"use client";
// Door mode: a spare Android phone on the wall. Full-screen camera, one big
// result plate, and the line keeps moving.
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Plate, Portrait, SPRING, Stamp } from "@/components/art";
import { useDerived, useGym } from "@/components/shell/Gym";
import { MarginNotes } from "@/components/shell/TopBar";
import { rupees } from "@/lib/core/money";
import { useCheckin, type ScanEvent } from "./checkin";
import { CameraStrip } from "./Panels";

export function Door() {
  const { mode, base } = useGym();
  const d = useDerived();
  const { scan, checkIn } = useCheckin();
  const [ev, setEv] = useState<ScanEvent | null>(null);
  const [cam, setCam] = useState(false);
  const show = useCallback((e: ScanEvent) => {
    setEv(e);
    setTimeout(() => setEv((x) => (x?.id === e.id ? null : x)), 3200);
  }, []);
  const onCode = useCallback(async (c: string) => show(await scan(c, "door")), [scan, show]);

  useEffect(() => {
    if (mode !== "demo" || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("kb-demo");
    ch.onmessage = (m) => m.data?.type === "scan" && void onCode(m.data.code);
    return () => ch.close();
  }, [mode, onCode]);

  const ok = ev?.kind === "ok";
  const stopWord = ev && { dues: "बाकी", frozen: "FROZEN", lapsed: "LAPSED", old: "OLD CODE", bad: "NOT VALID", photo: "SEE DESK", already: "IN", branch: "OTHER BRANCH", unknown: "UNKNOWN" }[ev.kind as string];
  return (
    <div className="floor relative flex min-h-dvh flex-col">
      <div className="absolute inset-0">{cam ? <CameraStrip onCode={(c) => void onCode(c)} tall /> : <div className="grid h-full place-items-center"><button type="button" className="btn-brass !min-h-14 !text-[24px]" onClick={() => setCam(true)}>Start the door camera</button></div>}</div>
      <div className="relative z-10 flex items-center justify-between p-3">
        <a href={`${base}/desk`} className="steel-tag">Back to desk</a>
        {mode === "demo" && (
          <button
            type="button"
            className="btn-iron"
            onClick={() => {
              const pool = d?.list ?? [];
              const who = pool[Math.floor(Math.random() * Math.min(pool.length, 60))];
              if (who) show(checkIn(who.m.id, "door"));
            }}
          >
            Simulate scan
          </button>
        )}
      </div>
      <AnimatePresence>
        {ev && (
          <motion.div key={ev.id} className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 p-6" style={{ background: ok ? "rgba(42,112,68,.94)" : "rgba(26,26,24,.95)" }} initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={SPRING} role="status">
            <div className="flex items-center gap-4">
              {ev.st && <Portrait name={ev.st.m.name} photo={ev.st.m.photo} size={ev.kind === "photo" ? 120 : 72} />}
              {ev.st && <Plate state={ev.st.plate} size={96} label="" />}
            </div>
            <div className="t-stencil text-center text-[clamp(36px,10vw,64px)]" style={{ color: "var(--chalk)" }}>
              {ok ? "Welcome" : stopWord}
            </div>
            <div className="t-hand text-center text-[22px]" style={{ color: "var(--chalk)" }}>
              {ev.st?.m.name} · {ev.text} {ev.kind === "dues" && ev.st ? rupees(ev.st.dues) : ""}
            </div>
            {!ok && ev.kind !== "already" && <Stamp kind="due" word="SEE THE DESK" seed={ev.id} size={0.9} />}
          </motion.div>
        )}
      </AnimatePresence>
      <MarginNotes />
    </div>
  );
}
