"use client";
// Door check-in: a spare phone or tablet at the entrance. Members show the QR on their card; one big
// result slip says who may walk in, and the line keeps moving.
import { useCallback, useEffect, useState } from "react";
import { AppScreen } from "@/components/shell/AppShell";
import { useDerived, useGym } from "@/components/shell/Gym";
import { Icon } from "@/components/ui/Icon";
import { Initials } from "@/components/ui/Status";
import { fmtDay } from "@/lib/core/dates";
import { firstName, rupees } from "@/lib/core/money";
import { CameraStrip } from "./Camera";
import { useCheckin, type ScanEvent } from "./checkin";

function slip(ev: ScanEvent): { bg: string; fg: string; text: string } {
  const n = ev.st ? firstName(ev.st.m.name) : "This card";
  switch (ev.kind) {
    case "ok":
      return { bg: "var(--paan)", fg: "#fff", text: `Welcome, ${n}` };
    case "dues":
      return { bg: "var(--rani)", fg: "#fff", text: `${n} owes ${rupees(ev.st?.dues ?? 0)}. Please see the desk.` };
    case "frozen":
      return { bg: "var(--kingfisher)", fg: "#fff", text: `${n} is frozen till ${fmtDay(ev.st?.frozenNow?.toDate)}.` };
    case "lapsed":
      return { bg: "var(--ended)", fg: "#fff", text: ev.st?.endDate ? `${n}'s membership ended on ${fmtDay(ev.st.endDate)}. Please see the desk.` : `${n} has no plan yet. Please see the desk.` };
    case "already":
      return { bg: "var(--marigold)", fg: "var(--ink)", text: `${n} is already in today. ${ev.text}.` };
    case "photo":
      return { bg: "var(--marigold)", fg: "var(--ink)", text: `${n}: no signal on the phone. Please see the desk.` };
    default:
      return { bg: "var(--ink)", fg: "var(--cream)", text: `${ev.text}. Please see the desk.` };
  }
}

export function Door() {
  const { mode, base } = useGym();
  const d = useDerived();
  const { scan, checkIn } = useCheckin();
  const [ev, setEv] = useState<ScanEvent | null>(null);
  const [cam, setCam] = useState(false);
  const [noCam, setNoCam] = useState(false);
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

  const sample = (d?.list ?? []).filter((x, i, a) => a.findIndex((y) => y.status === x.status && !!y.frozenNow === !!x.frozenNow && y.dues > 0 === x.dues > 0) === i).slice(0, 6);
  const s = ev ? slip(ev) : null;
  return (
    <AppScreen screen="door" title="Door check-in" sentence="Keep a spare phone or tablet at the door. Members show the QR on their card." vignette="door">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-3 py-4 md:px-6">
        {cam ? (
          <div className="h-[min(60svh,520px)]">
            <CameraStrip onCode={(c) => void onCode(c)} onClose={() => setCam(false)} tall />
          </div>
        ) : (
          <div className="panel flex flex-col items-center gap-3 p-6 text-center">
            <Icon name="camera" size={40} />
            <p className="text-[17px] font-semibold">The camera reads each member&apos;s QR and checks them in.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => setCam(true)}>
                <Icon name="camera" size={20} /> Start camera
              </button>
              {mode === "demo" && (
                <button type="button" className="btn btn-lg" onClick={() => setNoCam((v) => !v)} aria-expanded={noCam}>
                  Try without camera
                </button>
              )}
            </div>
          </div>
        )}
        {mode === "demo" && noCam && (
          <section className="panel-flat p-3" aria-label="Pretend scans">
            <p className="mb-2 text-[15px] font-semibold">Tap a member to pretend they scanned their card:</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sample.map((x) => (
                <button key={x.m.id} type="button" className="btn !justify-start" onClick={() => show(checkIn(x.m.id, "door"))}>
                  <Initials name={x.m.name} size={28} /> <span className="truncate">{x.m.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        <a href={`${base}/poster`} target="_blank" rel="noreferrer" className="btn self-start">
          <Icon name="print" size={18} /> Print the entrance poster
        </a>
      </div>
      {ev && s && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-50 px-3 md:bottom-6" role="status" aria-live="assertive">
          <div className="anim-sheet mx-auto flex max-w-[720px] items-center gap-4 rounded-3xl border-2 border-[var(--ink)] p-5 shadow-[0_6px_0_var(--ink)]" style={{ background: s.bg, color: s.fg }}>
            {ev.st && <Initials name={ev.st.m.name} photo={ev.st.m.photo} size={ev.kind === "photo" ? 96 : 64} />}
            <p className="t-display text-[clamp(24px,5vw,40px)] leading-tight">{s.text}</p>
          </div>
        </div>
      )}
    </AppScreen>
  );
}
