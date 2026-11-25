"use client";
// Sheets the menu opens from any screen: money waiting to be seen, close the day, every key.
import { useMemo, useRef, useState, type ReactNode } from "react";
import { istClock, todayIST } from "@/lib/core/dates";
import { countedFrom, DENOMS, drawerFigures } from "@/lib/core/drawer";
import { rupees, uid } from "@/lib/core/money";
import { lsGet, lsSet } from "@/lib/client/idb";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Status";
import { useGym, useGymState, useSnap } from "./Gym";
import { useFocusTrap } from "./AppShell";

export function Sheet({ title, sentence, onClose, children, wide }: { title: string; sentence?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="sheet-backdrop" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="kb-sheet-title" className={`anim-sheet relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-3xl border-2 border-[var(--ink)] bg-[var(--cream)] sm:rounded-3xl sm:shadow-[0_6px_0_var(--ink)] ${wide ? "sm:max-w-[760px]" : "sm:max-w-[560px]"}`}>
        <div className="flex items-start gap-3 border-b-2 border-[var(--ink)] bg-[var(--paper)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="kb-sheet-title" tabIndex={-1} className="t-display text-[24px] outline-none" style={{ fontWeight: 700 }}>
              {title}
            </h2>
            {sentence && <p className="text-[15px] text-[var(--muted-ink)]">{sentence}</p>}
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            <Icon name="close" size={18} /> Close
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/** UPI that a member says they paid, or that the desk left waiting. Only the desk can say it arrived. */
export function WaitingList({ onClose }: { onClose: () => void }) {
  const { store } = useGym();
  const snap = useSnap()!;
  const pend = snap.payments.filter((p) => p.state === "pending").sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const names = new Map(snap.members.map((m) => [m.id, m]));
  const act = (id: string, a: "confirm" | "reject") => {
    const r = store.run(a === "confirm" ? "payment.confirm" : "payment.reject", { id });
    if (!r.ok) store.note(r.error ?? "Not saved");
    else store.note(a === "confirm" ? "Marked paid. A receipt number was written." : "Marked as not received. They still owe it.", "ink");
  };
  return (
    <Sheet title="Waiting for money" sentence="Only press Money arrived after you see it in your bank or UPI app." onClose={onClose} wide>
      {!pend.length && <p className="py-6 text-center text-[16px]">Nothing is waiting. Every UPI payment has been checked.</p>}
      <ul className="flex flex-col gap-2">
        {pend.map((p) => {
          const m = names.get(p.memberId);
          return (
            <li key={p.id} className="panel-flat flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{m?.name}</div>
                <div className="text-[14px] text-[var(--muted-ink)]">
                  <span className="t-mono">{m?.memberNo}</span> · {p.mode === "upi_member" ? "paid from their phone card" : "paid at the desk QR"} at {istClock(p.createdAt)}
                  {p.utrLast4 ? ` · UPI ref ending ${p.utrLast4}` : ""}
                </div>
              </div>
              <Chip kind="wait" text={rupees(p.amount)} />
              <div className="flex gap-2">
                <button type="button" className="btn btn-success btn-sm" onClick={() => act(p.id, "confirm")}>
                  <Icon name="tick" size={18} /> Money arrived
                </button>
                <button type="button" className="btn btn-sm" onClick={() => act(p.id, "reject")}>
                  Not received
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/** Count the drawer against what the app expects, then save. A difference needs a reason. */
export function CloseDay({ onClose }: { onClose: () => void }) {
  const { store, today, mode } = useGym();
  const snap = useSnap()!;
  const actor = useGymState((s) => s.actor);
  const shiftKey = `kb_shift_${snap.branch.id}`;
  const since = lsGet(shiftKey) || `${today}T00:00:00+05:30`;
  const sinceIso = new Date(Date.parse(since)).toISOString();
  const sent = useMemo(() => {
    try {
      return JSON.parse(lsGet("kb_receipts_sent") ?? "[]") as string[];
    } catch {
      return [];
    }
  }, []);
  // the desk counts the whole counter's cash, not only one person's
  const fig = useMemo(() => drawerFigures(snap, null, sinceIso, sent), [snap, sinceIso, sent]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState<null | { id: string; diff: number }>(null);
  const counted = countedFrom(counts);
  const diff = counted - fig.expected;
  const bump = (k: string, by: number) => setCounts((c) => ({ ...c, [k]: Math.max(0, (c[k] ?? 0) + by) }));
  const save = () => {
    if (diff !== 0 && reason.trim().length < 8) return setErr("Write what happened, in at least 8 letters.");
    const id = uid();
    const r = store.run("close.save", { id, counts, counted, expected: fig.expected, upiTotal: fig.upi, shiftStart: since, reason: reason.trim() });
    if (!r.ok) return setErr(r.error ?? "Not saved");
    lsSet(shiftKey, new Date().toISOString());
    setDone({ id, diff });
  };
  if (done)
    return (
      <Sheet title="Day closed" onClose={onClose}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Chip kind={done.diff === 0 ? "paid" : "owes"} text={done.diff === 0 ? "Matched" : done.diff < 0 ? `${rupees(-done.diff)} short` : `${rupees(done.diff)} extra`} />
          <p className="text-[16px]">Saved at {istClock(Date.now())}. The owner sees it in tomorrow&apos;s report{done.diff !== 0 ? ", with your reason" : ""}.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const r = store.run("close.reopen", { id: done.id });
                if (!r.ok) store.note(r.error ?? "Only an owner can reopen now");
                else {
                  store.note("Day reopened.", "ink");
                  setDone(null);
                }
              }}
            >
              <Icon name="undo" size={18} /> Undo
            </button>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </Sheet>
    );
  return (
    <Sheet title="Close the day" sentence="Count the cash in the drawer. Khatabar compares it with the cash taken today." onClose={onClose}>
      <div className="panel-flat mb-3 flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
        <span className="font-semibold">The app expects</span>
        <span className="t-display text-[28px]">{rupees(fig.expected)}</span>
        <span className="w-full text-[14px] text-[var(--muted-ink)]">
          Cash taken since {istClock(sinceIso)}
          {todayIST(Date.parse(sinceIso)) !== today ? " yesterday" : ""}. UPI {rupees(fig.upi)} is in the bank, not the drawer.
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {[...DENOMS.map((d) => String(d)), "coins"].map((k) => (
          <li key={k} className="flex items-center gap-3 border-b border-[var(--line)] py-1.5">
            <span className="w-24 font-semibold">{k === "coins" ? "Coins (₹)" : `₹${k} notes`}</span>
            <button type="button" className="btn btn-sm !w-11 !px-0" aria-label={`One less ${k}`} onClick={() => bump(k, -1)}>
              −
            </button>
            <input inputMode="numeric" aria-label={k === "coins" ? "Coins in rupees" : `Number of ₹${k} notes`} className="input t-mono !min-h-11 !w-20 text-center" value={counts[k] ?? 0} onChange={(e) => setCounts((c) => ({ ...c, [k]: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) }))} />
            <button type="button" className="btn btn-sm !w-11 !px-0" aria-label={`One more ${k}`} onClick={() => bump(k, 1)}>
              +
            </button>
            <span className="t-mono ml-auto text-[15px]">{rupees((counts[k] ?? 0) * (k === "coins" ? 1 : Number(k)) * 100)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold">You counted</span>
        <span className="t-display text-[26px]">{rupees(counted)}</span>
      </div>
      <div className="mt-2" aria-live="polite">
        {diff === 0 ? <Chip kind="paid" text="Matched" /> : <Chip kind="owes" text={diff < 0 ? `${rupees(-diff)} short` : `${rupees(diff)} extra`} />}
      </div>
      {fig.suspects.length > 0 && diff !== 0 && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-[var(--ink)] bg-[var(--marigold-pale)] p-3 text-[14px]">
          <b>Things to check:</b>
          <ul className="mt-1 list-disc pl-5">
            {fig.suspects.slice(0, 4).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {diff !== 0 && (
        <label className="mt-3 block">
          <span className="label">What happened? (needed when the count does not match)</span>
          <input className="input mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Gave ₹200 change for milk, receipt in tray" />
        </label>
      )}
      {err && (
        <p role="alert" className="mt-2 font-semibold text-[var(--rani)]">
          {err}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary btn-lg" onClick={save}>
          Save the count
        </button>
        <button type="button" className="btn btn-lg" onClick={onClose}>
          Not now
        </button>
      </div>
      {mode === "demo" && <p className="mt-3 text-[14px] text-[var(--muted-ink)]">Demo: you are {snap.staff.find((s) => s.id === actor.staffId)?.name ?? "the desk"}. In a real gym this is saved for the owner&apos;s 6 am report.</p>}
    </Sheet>
  );
}

const KEYS: [string, string][] = [
  ["Ctrl K  or  /", "Go to the search box"],
  ["Type 4 digits", "Find a member by the last 4 digits of their phone"],
  ["Enter", "Open the member that matches"],
  ["↓ ↑  or  J K", "Move through the list"],
  ["R", "Renew the open member"],
  ["1 to 4", "Pick a plan (in Renew)"],
  ["Shift P", "Paid in cash (in Renew, or dues on the card)"],
  ["P", "Paid by UPI: shows the QR"],
  ["Shift S", "Part cash, part UPI"],
  ["D", "Discount (in Renew)"],
  ["T", "Add personal training (in Renew)"],
  ["C", "Check in the open member"],
  ["F", "Freeze the open member"],
  ["W", "Send a WhatsApp reminder or receipt"],
  ["N", "New member"],
  ["Q", "Rush hour mode"],
  ["G then D", "Fees due"],
  ["G then W", "Freeze"],
  ["G then O", "Owner report"],
  ["G then I", "Import members"],
  ["G then U", "Waiting for money"],
  ["Ctrl B", "Change branch"],
  ["Ctrl Z", "Undo the last payment (8 seconds)"],
  ["Ctrl Shift D", "Close the day"],
  ["Shift M", "Less motion"],
  ["?", "This list"],
  ["Esc", "Go back one step"],
];

export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Keyboard shortcuts" sentence="Optional. Every one of these is also a labelled button on the screen." onClose={onClose} wide>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {KEYS.map(([k, v]) => (
          <div key={k} className="flex min-h-10 items-center gap-3 border-b border-[var(--line)]">
            <span className="flex w-[118px] shrink-0 flex-wrap gap-1">
              {k.split(/\s{2}or\s{2}/).map((part, i) => (
                <span key={i} className="flex gap-1">
                  {i > 0 && <span className="text-[12px] text-[var(--muted-ink)]">or</span>}
                  {part.split(" then ").map((x, j) => (
                    <span key={j} className="flex items-center gap-1">
                      {j > 0 && <span className="text-[12px] text-[var(--muted-ink)]">then</span>}
                      <span className="kbd">{x}</span>
                    </span>
                  ))}
                </span>
              ))}
            </span>
            <span className="text-[14px]">{v}</span>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-sm mt-4" onClick={() => window.print()}>
        <Icon name="print" size={18} /> Print this list
      </button>
    </Sheet>
  );
}
