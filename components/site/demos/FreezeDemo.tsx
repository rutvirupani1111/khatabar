"use client";
// Scene 4's demo: the freeze whiteboard. Omkar's real request from the demo gym waits at the top;
// Approve moves his end date forward by exactly the days asked. Below, everyone ending in the next
// two weeks is a magnet you can tap to freeze (a drag is never needed).
import { useEffect, useMemo, useRef, useState } from "react";
import { useDerived, useGym, useSnap } from "@/components/shell/Gym";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Status";
import { addDays, fmtDate, fmtDay, fmtSpan, weekday } from "@/lib/core/dates";
import { firstName, initials, uid } from "@/lib/core/money";
import { freezeRules, termEnd, type MemberState } from "@/lib/core/state";
import { streetBus } from "@/lib/client/street";
import { DemoFooter, StreetGym } from "./shared";

export default function FreezeDemo() {
  return (
    <StreetGym>
      <FreezeBoard />
    </StreetGym>
  );
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REASONS = ["Travel", "Exams", "Illness", "Other"];

function magnetTone(st: MemberState) {
  if (st.frozenNow) return { bg: "var(--kingfisher)", fg: "#fff", word: "frozen" };
  if (st.status === "lapsed") return { bg: "var(--ended)", fg: "#fff", word: "ended" };
  return { bg: "var(--marigold-pale)", fg: "var(--ink)", word: "ends soon" };
}

function FreezeBoard() {
  const { store, today } = useGym();
  const snap = useSnap()!;
  const d = useDerived()!;
  const [decided, setDecided] = useState<null | { kind: "approved" | "declined"; freezeId: string; memberId: string; before: string | null }>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [form, setForm] = useState<null | { memberId: string; days: number; reason: string; from: string }>(null);
  const [err, setErr] = useState("");
  const [last, setLast] = useState<null | { freezeId: string; text: string }>(null);
  // the magnet menu and the freeze form open under the board: bring them into view, so a tap on a
  // magnet always shows its result even inside the scene's scrolling demo slot
  const opened = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (menu || form) opened.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [menu, form]);

  useEffect(
    () =>
      streetBus.on((e) => {
        if (e === "reset") {
          setDecided(null);
          setMenu(null);
          setForm(null);
          setErr("");
          setLast(null);
        }
      }),
    [],
  );

  const req = snap.freezes.find((f) => f.state === "requested");
  const reqSt = req ? d.byId.get(req.memberId) : undefined;
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const onBoard = useMemo(() => d.list.filter((x) => x.endDate && x.endDate >= today && x.endDate <= days[13]).sort((a, b) => (a.endDate! < b.endDate! ? -1 : 1)), [d, today, days]);
  const shown = onBoard.slice(0, 12);
  const frozen = useMemo(() => d.list.filter((x) => snap.freezes.some((f) => f.memberId === x.m.id && f.state === "approved" && f.toDate >= today)), [d, snap, today]);

  const approve = () => {
    if (!req || !reqSt) return;
    const before = reqSt.endDate;
    const r = store.run("freeze.decide", { id: req.id, state: "approved" });
    if (!r.ok) return setErr(r.error ?? "Not saved");
    setDecided({ kind: "approved", freezeId: req.id, memberId: req.memberId, before });
    setLast({ freezeId: req.id, text: `${reqSt.m.name}'s freeze approved` });
    streetBus.emit("freeze-approved");
  };
  const decline = () => {
    if (!req) return;
    const r = store.run("freeze.decide", { id: req.id, state: "rejected" });
    if (!r.ok) return setErr(r.error ?? "Not saved");
    setDecided({ kind: "declined", freezeId: req.id, memberId: req.memberId, before: null });
    streetBus.emit("freeze-declined");
  };
  const doFreeze = () => {
    if (!form) return;
    const st = d.byId.get(form.memberId);
    if (!st) return;
    const chk = freezeRules(snap, st, form.days);
    if (!chk.ok) return setErr(`${chk.why}.`);
    const id = uid();
    const r = store.run("freeze.set", { id, memberId: form.memberId, fromDate: form.from, days: form.days, reason: form.reason });
    if (!r.ok) return setErr(r.error ?? "Not saved");
    setErr("");
    setForm(null);
    setMenu(null);
    setLast({ freezeId: id, text: `${st.m.name} frozen for ${form.days} days` });
    streetBus.emit("freeze-approved");
  };
  const undo = () => {
    if (!last) return;
    const r = store.run("freeze.cancel", { id: last.freezeId });
    if (r.ok) {
      if (decided?.freezeId === last.freezeId) setDecided(null);
      setLast(null);
    } else setErr(r.error ?? "Could not undo");
  };

  const decidedSt = decided ? d.byId.get(decided.memberId) : undefined;
  const decidedF = decided ? snap.freezes.find((f) => f.id === decided.freezeId) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <section className="demo-panel p-4" aria-live="polite">
        <h3 className="text-[16px] font-bold">Freeze requests ({req ? 1 : 0})</h3>
        {req && reqSt && !decided && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-[15px] leading-snug">
              <b>{reqSt.m.name}</b> wants to freeze for {req.days} days, {fmtSpan(req.fromDate, req.toDate)}. Reason: {req.reason}.
            </p>
            {(() => {
              const chk = freezeRules(snap, reqSt, req.days, req.id);
              return (
                <p className="text-[14px] text-[var(--muted-ink)]">
                  {chk.maxDays ? `The ${reqSt.plan?.nameEn ?? ""} plan allows up to ${chk.maxDays} freeze days. This uses ${req.days}.` : chk.why}
                </p>
              );
            })()}
            <div className="flex gap-2">
              <button type="button" className="btn btn-success" onClick={approve}>
                <Icon name="tick" size={18} /> Approve
              </button>
              <button type="button" className="btn" onClick={decline}>
                Decline
              </button>
            </div>
          </div>
        )}
        {decided?.kind === "approved" && decidedSt && decidedF && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-[15px]">
              <b>{decidedSt.m.name}</b>: frozen {fmtSpan(decidedF.fromDate, decidedF.toDate)}. New end date: <b>{fmtDate(decidedSt.term ? termEnd(decidedSt.term, snap.freezes) : decidedSt.endDate, today)}</b>
              {decided.before ? ` (was ${fmtDate(decided.before, today)})` : ""}.
            </p>
            <Chip kind="frozen" text={`Frozen till ${fmtDay(decidedF.toDate)}`} className="self-start" />
          </div>
        )}
        {decided?.kind === "declined" && (
          <p className="mt-2">
            <Chip kind="ended" text="Declined. Omkar sees this on his card." />
          </p>
        )}
        {!req && !decided && <p className="mt-1 text-[14px] text-[var(--muted-ink)]">No requests waiting. Members ask from their phone card.</p>}
      </section>

      <section className="whiteboard p-3 pb-3" aria-label="Who ends in the next 2 weeks">
        <h3 className="mb-2 text-[15px] font-bold">Who ends in the next 2 weeks</h3>
        <div className="grid grid-cols-7 gap-1" role="list">
          {days.map((day) => {
            const here = shown.filter((x) => x.endDate === day);
            return (
              <div key={day} role="listitem" className="flex min-h-[84px] flex-col items-center gap-1 rounded-md border border-[rgba(27,26,46,.25)] bg-[rgba(255,255,255,.5)] px-0.5 pb-1 pt-0.5">
                <span className="text-[11px] font-semibold leading-tight text-[var(--muted-ink)]">
                  {day === today ? "Today" : WD[weekday(day)]}
                  <br />
                  {Number(day.slice(8))}
                </span>
                {here.map((x) => {
                  const tone = magnetTone(x);
                  return (
                    <button key={x.m.id} type="button" onClick={() => (setMenu(menu === x.m.id ? null : x.m.id), setForm(null), setErr(""))} aria-expanded={menu === x.m.id} aria-label={`${x.m.name}, ${tone.word}, ends ${fmtDay(x.endDate)}`} className="flex flex-col items-center">
                      <span className="grid size-9 place-items-center rounded-full border-2 border-[var(--ink)] text-[12px] font-bold shadow-[0_2px_0_var(--ink)]" style={{ background: tone.bg, color: tone.fg }}>
                        {initials(x.m.name)}
                      </span>
                      <span className="max-w-[52px] truncate text-[11px] font-semibold">{firstName(x.m.name)}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
        <p className="flex flex-wrap items-center gap-3 text-[12px] font-semibold">
          <span className="inline-flex items-center gap-1">
            <span className="size-3 rounded-full border-2 border-[var(--ink)] bg-[var(--marigold-pale)]" /> Ends soon
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-3 rounded-full border-2 border-[var(--ink)] bg-[var(--kingfisher)]" /> Frozen
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-3 rounded-full border-2 border-[var(--ink)] bg-[var(--ended)]" /> Ended
          </span>
          <span>Frozen now or soon: {frozen.length}</span>
        </p>
        {onBoard.length > shown.length && (
          <a href="/demo/freeze" className="inline-flex min-h-11 items-center text-[13px] font-semibold underline">
            +{onBoard.length - shown.length} more on the full board
          </a>
        )}
        </div>
      </section>

      {menu && !form && (
        <div ref={opened} className="demo-panel flex flex-wrap items-center gap-2 p-3">
          <span className="w-full text-[14px] font-bold">{d.byId.get(menu)?.m.name}</span>
          <button type="button" className="btn btn-sm !min-h-11" onClick={() => setForm({ memberId: menu, days: 7, reason: "Travel", from: today })}>
            <Icon name="snow" size={16} /> Freeze…
          </button>
          <a className="btn btn-sm !min-h-11" href={`/demo/desk?m=${menu}`}>
            Open in demo desk
          </a>
        </div>
      )}
      {form && (
        <div ref={opened} className="demo-panel flex flex-col gap-3 p-4">
          <h3 className="text-[16px] font-bold">Freeze {d.byId.get(form.memberId)?.m.name}</h3>
          <label>
            <span className="label">From</span>
            <input type="date" className="input mt-1" min={today} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value || today })} />
          </label>
          <div>
            <span className="label">How many days</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {[7, 10, 15, 30].map((n) => (
                <button key={n} type="button" className="chip chip-filter" aria-pressed={form.days === n} onClick={() => setForm({ ...form, days: n })}>
                  {n} days
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Reason</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button key={r} type="button" className="chip chip-filter" aria-pressed={form.reason === r} onClick={() => setForm({ ...form, reason: r })}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" onClick={doFreeze}>
              Freeze membership
            </button>
            <button type="button" className="btn" onClick={() => (setForm(null), setErr(""))}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {err && (
        <p role="alert" className="rounded-lg bg-[#fde2ea] p-2 text-[14px] font-semibold text-[#9b0f3f]">
          {err}
        </p>
      )}
      {last && (
        <div className="flex items-center gap-3 text-[14px] font-semibold" role="status">
          <span>{last.text}.</span>
          <button type="button" className="btn btn-sm" onClick={undo}>
            <Icon name="undo" size={16} /> Undo
          </button>
        </div>
      )}
      <DemoFooter href="/demo/freeze" />
    </div>
  );
}
