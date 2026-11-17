"use client";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { fmtDate, fmtDay, fmtSpan, istClock, todayIST } from "@/lib/core/dates";
import { rupees } from "@/lib/core/money";
import type { Snapshot } from "@/lib/core/types";
import { useGym } from "@/components/shell/Gym";

/** G then U: member-made and left-pending UPI payments waiting for the desk to see the credit. */
export function UpiMatch({ snap, onClose }: { snap: Snapshot; onClose: () => void }) {
  const { store } = useGym();
  const pend = snap.payments.filter((p) => p.state === "pending").sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const [i, setI] = useState(0);
  const names = new Map(snap.members.map((m) => [m.id, m]));
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown" || e.key === "j") setI((x) => Math.min(pend.length - 1, x + 1));
      else if (e.key === "ArrowUp" || e.key === "k") setI((x) => Math.max(0, x - 1));
      else if (e.key === "Enter" && pend[i]) act(pend[i].id, "confirm");
      else if ((e.key === "x" || e.key === "X") && pend[i]) act(pend[i].id, "reject");
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  });
  const act = (id: string, a: "confirm" | "reject") => {
    const r = store.run(a === "confirm" ? "payment.confirm" : "payment.reject", { id });
    if (!r.ok) store.note(r.error ?? "Not saved");
    else store.note(a === "confirm" ? "Matched. Counted as paid now." : "Marked as not received.", "ink");
  };
  return (
    <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="UPI to match" className="ledger w-full max-w-[760px] pb-4 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between pl-[72px] pr-4">
          <h2 className="t-stencil text-[28px]" style={{ color: "var(--ink)" }}>
            UPI to match
          </h2>
          <span className="t-teko text-[15px]" style={{ color: "var(--carbon)" }}>
            Check your UPI app or soundbox · Enter: arrived · X: not received
          </span>
        </div>
        {!pend.length && <p className="t-hand h-8 pl-[72px] text-[17px]" style={{ color: "var(--muted-on-paper)" }}>Nothing waiting. Every UPI payment is matched.</p>}
        {pend.map((p, k) => {
          const m = names.get(p.memberId);
          return (
            <div key={p.id} className="grid h-8 items-center gap-2 pl-[72px] pr-4 text-[13px]" style={{ gridTemplateColumns: "60px 1fr 90px 90px 140px", outline: k === i ? "1.5px solid var(--ink)" : undefined, outlineOffset: -2 }}>
              <span className="t-mono">{istClock(p.createdAt)}</span>
              <span className="truncate" style={{ color: "var(--ink)" }}>
                {m?.memberNo} {m?.name} <span className="t-teko muted">{p.mode === "upi_member" ? "from their card" : "desk QR"}</span>
              </span>
              <span className="t-mono text-right">{rupees(p.amount)}</span>
              <span className="t-mono text-right">{p.utrLast4 ? `UTR ${p.utrLast4}` : "no UTR"}</span>
              <span className="flex justify-end gap-1">
                <button type="button" className="btn-ink !min-h-7" onClick={() => act(p.id, "confirm")}>
                  Arrived
                </button>
                <button type="button" className="btn-ink !min-h-7" style={{ color: "var(--margin-red)", borderColor: "var(--margin-red)" }} onClick={() => act(p.id, "reject")}>
                  No
                </button>
              </span>
            </div>
          );
        })}
        <p className="t-hand mt-2 pl-[72px] pr-4 text-[14px]" style={{ color: "var(--margin-red)" }}>
          A screenshot is not money. Only mark it when the credit shows in your own UPI app.
        </p>
      </div>
    </motion.div>
  );
}

const KEYS: [string, string][] = [
  ["/  or  Ctrl+K", "Search: last 4 digits, name, member no., or scan"],
  ["J / K  or  ↓ / ↑", "Move between rows"],
  ["Enter", "Lift the card"],
  ["R", "Renew: flip to the plate side"],
  ["1 - 6", "Pick a plan plate"],
  ["T", "PT add-on"],
  ["D", "Discount"],
  ["A", "Part payment amount"],
  ["P", "UPI QR"],
  ["Shift+P", "Cash"],
  ["Shift+S", "Split cash and UPI"],
  ["C", "Check in (or open camera)"],
  ["F", "Freeze on the whiteboard"],
  ["N", "New member"],
  ["W", "Receipt on WhatsApp"],
  ["Q", "Queue Mode"],
  ["G then D W U O I", "Rack, Board, UPI, Owner, Import"],
  ["Ctrl+Z", "Undo (8 s payments, 10 s others)"],
  ["Ctrl+Shift+D", "Close shift"],
  ["Shift+M", "Calm mode"],
  ["Esc", "Back one act, never loses data"],
];
const CAP = ["var(--plate-25)", "var(--plate-20)", "var(--plate-15)", "var(--plate-10)", "var(--plate-5)"];

export function KeyMap({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, [onClose]);
  return (
    <motion.div className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-3 print:bg-white print:p-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Keyboard map" className="board mx-auto w-full max-w-[820px] p-6 print:max-w-none print:border-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between">
          <h2 className="t-stencil text-[44px]" style={{ color: "var(--iron-rim)" }}>
            THE COUNTER KEYS
          </h2>
          <div className="no-print flex gap-2">
            <button type="button" className="btn-ink" onClick={() => window.print()}>
              Print A4
            </button>
            <button type="button" className="btn-ink" onClick={onClose}>
              Esc
            </button>
          </div>
        </div>
        <p className="t-hand text-[17px]" style={{ color: "var(--ink)" }}>
          Stick this next to the scanner. Renew = R, plan number, Shift+P.
        </p>
        <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {KEYS.map(([k, v], i) => (
            <div key={k} className="flex items-center gap-3">
              <span className="t-mono inline-flex min-w-[120px] justify-center px-2 py-1 text-[13px]" style={{ background: CAP[i % 5], color: i % 5 < 2 ? "var(--chalk)" : "var(--iron-rim)", borderRadius: 4, boxShadow: "0 2px 0 rgba(0,0,0,.35)" }}>
                {k}
              </span>
              <span className="text-[14px]" style={{ color: "var(--text-on-paper)" }}>
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/** C with nobody lifted: a camera strip. BarcodeDetector where the browser has it, zxing otherwise. */
export function CameraStrip({ onCode, onClose, tall }: { onCode: (code: string) => void; onClose?: () => void; tall?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  const last = useRef({ code: "", at: 0 });
  useEffect(() => {
    let stop = () => {};
    let alive = true;
    const hit = (code: string) => {
      const now = Date.now();
      if (code === last.current.code && now - last.current.at < 2500) return;
      last.current = { code, at: now };
      onCode(code);
    };
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!alive) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        type BD = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };
        const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BD };
        if (W.BarcodeDetector) {
          const det = new W.BarcodeDetector({ formats: ["qr_code"] });
          let raf = 0;
          const tick = async () => {
            if (!alive) return;
            try {
              const r = await det.detect(v);
              if (r[0]) hit(r[0].rawValue);
            } catch {}
            raf = window.setTimeout(tick, 180) as unknown as number;
          };
          void tick();
          stop = () => {
            clearTimeout(raf);
            stream.getTracks().forEach((t) => t.stop());
          };
        } else {
          const { BrowserQRCodeReader } = await import("@zxing/browser");
          const reader = new BrowserQRCodeReader();
          stream.getTracks().forEach((t) => t.stop());
          const ctl = await reader.decodeFromVideoDevice(undefined, v, (res) => res && hit(res.getText()));
          stop = () => ctl.stop();
        }
      } catch {
        setErr("Camera not available. Use the USB scanner or type the last 4 digits.");
      }
    })();
    return () => {
      alive = false;
      stop();
    };
  }, [onCode]);
  return (
    <div className="relative overflow-hidden" style={{ height: tall ? "100%" : 180, background: "#000" }}>
      <video ref={video} muted playsInline className="h-full w-full object-cover" aria-label="Camera" />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="size-40 border-2" style={{ borderColor: "var(--brass-hi)", boxShadow: "0 0 0 2000px rgba(0,0,0,.35)" }} />
      </div>
      {err && <p className="t-hand absolute inset-x-3 bottom-2 text-[15px]" style={{ color: "var(--hazard)" }}>{err}</p>}
      {onClose && (
        <button type="button" className="btn-iron absolute right-2 top-2" onClick={onClose}>
          Close camera
        </button>
      )}
    </div>
  );
}

/** Every renewal, payment, freeze and reversal for one member, with who did it. */
export function MemberLedger({ snap, memberId }: { snap: Snapshot; memberId: string }) {
  const staff = new Map(snap.staff.map((s) => [s.id, s.name]));
  const plans = new Map(snap.plans.map((p) => [p.id, p]));
  const lines: { at: string; text: string; tone?: string }[] = [];
  for (const ms of snap.memberships.filter((x) => x.memberId === memberId))
    lines.push({ at: ms.createdAt, text: `${ms.status === "void" ? "VOID " : ms.status === "requested" ? "REQUESTED " : ""}${plans.get(ms.planId)?.nameEn ?? "Plan"} ${fmtSpan(ms.startDate, ms.baseEndDate)}${ms.discount ? ` · disc ${rupees(ms.discount)}` : ""} · ${staff.get(ms.createdBy ?? "") ?? "member"}`, tone: ms.status === "void" ? "var(--muted-on-paper)" : undefined });
  for (const p of snap.payments.filter((x) => x.memberId === memberId))
    lines.push({
      at: p.createdAt,
      text:
        p.mode === "import"
          ? p.amount < 0
            ? `${rupees(-p.amount)} owed on the old sheet · opening balance`
            : `${rupees(p.amount)} paid before Khatabar · from the old sheet`
          : `${p.reversesId ? "REVERSAL " : ""}${rupees(p.amount)} ${p.mode.replace("_", " ")} ${p.state}${p.receiptNo ? ` · ${p.receiptNo}` : ""} · ${staff.get(p.receivedBy ?? "") ?? "member"}`,
      tone: p.reversesId || p.state === "rejected" ? "var(--margin-red)" : p.state === "pending" ? "var(--stamp-pending)" : p.mode === "import" ? "var(--carbon)" : undefined,
    });
  for (const f of snap.freezes.filter((x) => x.memberId === memberId)) lines.push({ at: f.createdAt, text: `Freeze ${f.days} days ${fmtSpan(f.fromDate, f.toDate)} · ${f.reason} · ${f.state}`, tone: "var(--stamp-freeze)" });
  lines.sort((a, b) => (a.at < b.at ? 1 : -1));
  const visits = snap.checkins.filter((c) => c.memberId === memberId);
  const today = todayIST();
  return (
    <div className="ledger mt-3 pb-2 pt-1">
      <div className="t-teko flex h-8 items-center justify-between pl-[72px] pr-3 text-[15px]" style={{ color: "var(--carbon)" }}>
        <span>Ledger</span>
        <span>
          {visits.length} visits in 8 weeks · {visits.filter((v) => v.istDate === today).length ? "in today" : "not in today"}
        </span>
      </div>
      {lines.slice(0, 12).map((l, i) => (
        <div key={i} className="flex h-8 items-center gap-2 pl-[72px] pr-3">
          <span className="t-mono w-[78px] shrink-0 text-[11px]" style={{ color: "var(--muted-on-paper)" }}>
            {fmtDate(todayIST(Date.parse(l.at)), today)}
          </span>
          <span className="t-mono truncate text-[12px]" style={{ color: l.tone ?? "var(--ink)" }}>
            {l.text}
          </span>
        </div>
      ))}
      {!lines.length && <div className="t-hand h-8 pl-[72px] text-[15px]" style={{ color: "var(--muted-on-paper)" }}>No entries yet.</div>}
    </div>
  );
}
