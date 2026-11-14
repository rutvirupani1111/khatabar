"use client";
// Signature 5: the whiteboard week. Every membership ending in the next 14 days
// is a magnet on its day. Drag a magnet right to freeze or extend; the freeze
// rules stop it at a peg. The eraser wipes a line stroke by stroke to undo.
import { animate, motion, useMotionValue } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Magnet, PLATE, seededAngle, SPRING, Stamp } from "@/components/art";
import { MarginNotes, TopBar } from "@/components/shell/TopBar";
import { useDerived, useGym, useSnap } from "@/components/shell/Gym";
import { addDays, diffDays, fmtDay, weekday } from "@/lib/core/dates";
import { initials, uid } from "@/lib/core/money";
import { freezeRules, type MemberState } from "@/lib/core/state";
import type { Freeze } from "@/lib/core/types";

const REASONS = ["Diwali/travel", "Exams", "Illness/injury", "Other"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WD_HI = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];

export function Board() {
  const { store, base, mode, today, lang, calm } = useGym();
  const snap = useSnap();
  const d = useDerived();
  const router = useRouter();
  const sp = useSearchParams();
  const gridRef = useRef<HTMLDivElement>(null);
  const [colW, setColW] = useState(120);
  const [focusId, setFocusId] = useState<string | null>(sp.get("m"));
  const [kbDays, setKbDays] = useState<number | null>(null);
  const [ask, setAsk] = useState<null | { id: string; days: number }>(null);
  const [erasing, setErasing] = useState<string | null>(null);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const m = () => {
      setNarrow(window.innerWidth < 760);
      if (gridRef.current) setColW(gridRef.current.getBoundingClientRect().width / 7);
    };
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, [snap]);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const onBoard = useMemo(() => {
    if (!d) return [] as MemberState[];
    const ql = q.toLowerCase();
    return d.list.filter((x) => x.endDate && x.endDate >= today && x.endDate <= days[13] && (!ql || x.m.name.toLowerCase().includes(ql) || x.m.phone.endsWith(ql)));
  }, [d, today, days, q]);
  const lapsedTray = useMemo(() => (d ? d.list.filter((x) => x.endDate && x.endDate < today && x.endDate >= addDays(today, -7)) : []), [d, today]);
  const requests = useMemo(() => (snap ? snap.freezes.filter((f) => f.state === "requested") : []), [snap]);
  const recentLines = useMemo(() => (snap ? snap.freezes.filter((f) => f.state === "approved" && diffDays(today, f.createdAt.slice(0, 10)) <= 2) : []), [snap, today]);

  // focus from the desk's F key
  const focusSt = focusId && d ? d.byId.get(focusId) : undefined;

  const confirmFreeze = (memberId: string, nDays: number, reason: string) => {
    const st = d?.byId.get(memberId);
    if (!st || nDays <= 0) return;
    const r = store.run("freeze.set", { id: uid(), memberId, fromDate: today, days: nDays, reason });
    if (!r.ok) store.note(r.error ?? "Not saved");
    else store.note(`${st.m.name}: frozen ${nDays} days, ends ${fmtDay(addDays(st.endDate!, nDays))}`, "ink");
    setAsk(null);
    setKbDays(null);
  };

  const erase = (f: Freeze) => {
    setErasing(f.id);
    setTimeout(
      () => {
        const r = store.run("freeze.cancel", { id: f.id });
        if (!r.ok) store.note(r.error ?? "Not undone");
        else store.note("Erased. The freeze is undone and written in the audit log.", "ink");
        setErasing(null);
      },
      calm ? 0 : 380,
    );
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (ask) {
        const n = Number(e.key);
        if (n >= 1 && n <= 4) confirmFreeze(ask.id, ask.days, REASONS[n - 1]);
        else if (e.key === "Enter") confirmFreeze(ask.id, ask.days, "Other");
        else if (e.key === "Escape") setAsk(null);
        else return;
        e.preventDefault();
        return;
      }
      if (!focusSt) return;
      if (e.key === "f" || e.key === "F") setKbDays(Math.max(1, focusSt.plan?.freezeMinDays ?? 1));
      else if (kbDays != null && e.key === "ArrowRight") {
        const chk = freezeRules(snap!, focusSt, kbDays + 1);
        if (kbDays + 1 <= chk.maxNow) setKbDays(kbDays + 1);
        else store.note(chk.why || "At the limit", "ink");
      } else if (kbDays != null && e.key === "ArrowLeft") setKbDays(Math.max(1, kbDays - 1));
      else if (kbDays != null && e.key === "Enter") {
        const chk = freezeRules(snap!, focusSt, kbDays);
        if (!chk.ok) store.note(chk.why);
        else setAsk({ id: focusSt.m.id, days: kbDays });
      } else if (e.key === "e" || e.key === "E") {
        const f = snap!.freezes.find((x) => x.memberId === focusSt.m.id && x.state === "approved" && x.fromDate >= addDays(today, -30));
        if (f) erase(f);
        else store.note("No freeze to erase on this magnet", "ink");
      } else if (e.key === "r" || e.key === "R") router.push(`${base}/desk?m=${focusSt.m.id}`);
      else if (e.key === "Enter" && focusSt.freezeRequest) {
        store.run("freeze.decide", { id: focusSt.freezeRequest.id, state: "approved" });
        store.note(`${focusSt.m.name}'s freeze approved`, "ink");
      } else if (e.key === "Escape") {
        setKbDays(null);
        setFocusId(null);
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  if (!snap || !d)
    return (
      <div className="floor min-h-dvh">
        <div className="h-14 iron" />
      </div>
    );

  const ghost = `/tex/board-ghost-${(Number(today.slice(-2)) % 3) + 1}.svg`;

  return (
    <div className="floor flex min-h-dvh flex-col">
      <TopBar />
      <div className="knurl-strip" />
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 sm:px-5">
        <h1 className="t-stencil text-[30px]" style={{ color: "var(--brass)" }}>
          The whiteboard
        </h1>
        <span className="t-hand text-[16px]" style={{ color: "var(--chalk-dust)" }}>
          Drag a magnet right to freeze. F then → ← Enter on the keyboard. E erases. R renews. Double-click opens the counter.
        </span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find on the board" className="field-floor ml-auto !w-48 t-mono text-[13px]" aria-label="Find a member on the board" />
      </div>
      <div className="grid flex-1 gap-4 px-3 pb-6 sm:px-5 lg:grid-cols-[220px_1fr]">
        <aside className="board p-3" aria-label="Lapsed this week and freeze requests">
          <h2 className="t-teko text-[18px]" style={{ color: "var(--margin-red)" }}>
            Lapsed this week
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {lapsedTray.map((x) => (
              <button key={x.m.id} type="button" className="flex flex-col items-center" onDoubleClick={() => router.push(`${base}/desk?m=${x.m.id}`)} onClick={() => setFocusId(x.m.id)} title={`${x.m.name}, ended ${fmtDay(x.endDate)}`}>
                <Magnet state={x.plate} text={initials(x.m.name)} size={34} />
                <span className="t-hand text-[13px]" style={{ color: "var(--ink)" }}>
                  {x.m.name.split(" ")[0]}
                </span>
              </button>
            ))}
            {!lapsedTray.length && <p className="t-hand text-[14px]" style={{ color: "var(--muted-on-paper)" }}>Nobody lapsed this week.</p>}
          </div>
          <h2 className="t-teko mt-4 text-[18px]" style={{ color: "var(--stamp-freeze)" }}>
            Freeze requests
          </h2>
          {requests.map((f) => {
            const st = d.byId.get(f.memberId);
            if (!st) return null;
            return (
              <div key={f.id} className="mt-2 flex items-center gap-2">
                <Magnet state={st.plate} text={initials(st.m.name)} size={34} pin />
                <div className="min-w-0 flex-1">
                  <div className="t-hand truncate text-[14px]" style={{ color: "var(--ink)" }}>
                    {st.m.name.split(" ")[0]}: {f.days} days from {fmtDay(f.fromDate)}
                  </div>
                  <div className="t-hand text-[13px]" style={{ color: "var(--muted-on-paper)" }}>
                    {f.reason}
                  </div>
                </div>
                <button type="button" className="btn-ink !min-h-8" onClick={() => store.run("freeze.decide", { id: f.id, state: "approved" })}>
                  OK
                </button>
                <button type="button" className="btn-ink !min-h-8" style={{ color: "var(--margin-red)", borderColor: "var(--margin-red)" }} onClick={() => store.run("freeze.decide", { id: f.id, state: "rejected" })}>
                  No
                </button>
              </div>
            );
          })}
          {!requests.length && <p className="t-hand text-[14px]" style={{ color: "var(--muted-on-paper)" }}>No requests waiting.</p>}
        </aside>

        <section className="board relative overflow-hidden p-3" aria-label="Next 14 days" style={{ backgroundImage: `url(${ghost})`, backgroundSize: "cover" }}>
          {narrow ? (
            <div className="flex flex-col">
              {days.map((day) => {
                const here = onBoard.filter((x) => x.endDate === day);
                return (
                  <div key={day} className="flex min-h-12 items-start gap-3 border-b border-[var(--ledger-rule)]/40 py-2">
                    <span className="t-hand w-16 shrink-0 text-[15px]" style={{ color: "var(--ink)" }}>
                      {(lang === "hi" ? WD_HI : WD)[weekday(day)]} {Number(day.slice(-2))}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {here.map((x) => (
                        <MagnetPin key={x.m.id} st={x} colW={56} focused={focusId === x.m.id} onFocus={() => setFocusId(x.m.id)} onDrop={(n) => n > 0 && setAsk({ id: x.m.id, days: n })} onOpen={() => router.push(`${base}/desk?m=${x.m.id}`)} snap={snap} kbDays={focusId === x.m.id ? kbDays : null} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div ref={gridRef} className="relative grid grid-cols-7">
              {days.map((day, i) => {
                const here = onBoard.filter((x) => x.endDate === day);
                return (
                  <div key={day} className="relative min-h-[210px] border-r border-[rgba(29,58,107,.12)] p-2" style={{ borderTop: i >= 7 ? "1px dashed rgba(29,58,107,.2)" : undefined }}>
                    <div className="t-hand text-[16px]" style={{ color: day === today ? "var(--margin-red)" : "var(--ink)" }}>
                      {(lang === "hi" ? WD_HI : WD)[weekday(day)]} {Number(day.slice(-2))}
                      {day === today ? " · today" : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-4">
                      {here.map((x) => (
                        <MagnetPin key={x.m.id} st={x} colW={colW} focused={focusId === x.m.id} onFocus={() => setFocusId(x.m.id)} onDrop={(n) => n > 0 && setAsk({ id: x.m.id, days: n })} onOpen={() => router.push(`${base}/desk?m=${x.m.id}`)} snap={snap} kbDays={focusId === x.m.id ? kbDays : null} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* marker lines for freezes made in the last two days, erasable */}
              <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
                <defs>
                  {recentLines.map((f) => (
                    <mask key={f.id} id={`erase-${f.id}`} maskUnits="userSpaceOnUse">
                      <rect x="-50" y="-50" width="4000" height="4000" fill="white" />
                      {erasing === f.id && [0, 1, 2, 3].map((k) => <motion.path key={k} d={`M${-20 + k * 30} ${-20} L${4000} ${600 + k * 30}`} stroke="black" strokeWidth="600" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.09, delay: k * 0.09 }} />)}
                    </mask>
                  ))}
                </defs>
                {recentLines.map((f) => {
                  const st = d.byId.get(f.memberId);
                  if (!st?.endDate) return null;
                  const endI = diffDays(st.endDate, today);
                  const fromI = endI - f.days;
                  if (endI < 0 || endI > 13) return null;
                  const pos = (k: number) => ({ x: (Math.max(0, Math.min(13, k)) % 7) * colW + 26, y: (Math.max(0, Math.min(13, k)) >= 7 ? 210 : 0) + 64 });
                  const a = pos(fromI);
                  const b = pos(endI);
                  return (
                    <g key={f.id} mask={`url(#erase-${f.id})`}>
                      <path d={`M${a.x} ${a.y} C${(a.x + b.x) / 2} ${a.y - 28} ${(a.x + b.x) / 2} ${b.y - 28} ${b.x} ${b.y}`} fill="none" stroke="var(--stamp-freeze)" strokeWidth="3" strokeLinecap="round" opacity=".8" />
                      <text x={(a.x + b.x) / 2} y={Math.min(a.y, b.y) - 18} textAnchor="middle" className="t-hand" fontSize="14" fill="var(--stamp-freeze)">
                        +{f.days} days · {f.reason}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
          {!onBoard.length && <p className="t-hand p-6 text-[18px]" style={{ color: "var(--muted-on-paper)" }}>Nobody ends in the next 14 days.</p>}
        </section>
      </div>

      {focusSt && (
        <div className="fixed bottom-4 right-4 z-30 max-w-[340px]">
          <div className="iron p-3">
            <div className="t-teko text-[17px]">{focusSt.m.name}</div>
            <FreezeHint st={focusSt} days={kbDays} />
            {focusSt.frozenNow && <Stamp kind="freeze" word="FROZEN" seed={focusSt.frozenNow.id} size={0.6} drop={false} />}
          </div>
        </div>
      )}

      {ask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={() => setAsk(null)}>
          <div className="board p-4" role="dialog" aria-modal="true" aria-label="Freeze reason" onClick={(e) => e.stopPropagation()}>
            <p className="t-hand text-[19px]" style={{ color: "var(--ink)" }}>
              {d.byId.get(ask.id)?.m.name}: freeze {ask.days} days. Why?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {REASONS.map((r, i) => (
                <button key={r} type="button" className="btn-ink" autoFocus={i === 0} onClick={() => confirmFreeze(ask.id, ask.days, r)}>
                  <span className="kbd">{i + 1}</span> {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <MarginNotes />
      {mode === "demo" && <span className="sr-only">Demo gym</span>}
    </div>
  );
}

function FreezeHint({ st, days }: { st: MemberState; days: number | null }) {
  const snap = useSnap()!;
  const chk = freezeRules(snap, st, days ?? Math.max(1, st.plan?.freezeMinDays ?? 1));
  return (
    <div className="mt-1">
      <div className="flex gap-1" aria-label={`${chk.maxCount - chk.usedCount} of ${chk.maxCount} freezes left`}>
        {Array.from({ length: Math.max(1, chk.maxCount) }, (_, i) => (
          <span key={i} className="block h-3 w-6" style={{ background: i < chk.usedCount ? "var(--iron-rim)" : "var(--steel)", border: "1px solid var(--steel-hi)" }} />
        ))}
      </div>
      <p className="t-hand mt-1 text-[14px]" style={{ color: "var(--chalk-dust)" }}>
        {chk.maxCount ? `${chk.maxCount - chk.usedCount} of ${chk.maxCount} freezes left this term, max ${chk.maxDays} days` : chk.why}
        {days != null && (chk.ok ? ` · ${days} days: expiry moves to ${fmtDay(addDays(st.endDate!, days))}. Enter.` : ` · ${chk.why}`)}
      </p>
    </div>
  );
}

function MagnetPin({ st, colW, focused, onFocus, onDrop, onOpen, snap, kbDays }: { st: MemberState; colW: number; focused: boolean; onFocus: () => void; onDrop: (days: number) => void; onOpen: () => void; snap: NonNullable<ReturnType<typeof useSnap>>; kbDays: number | null }) {
  const x = useMotionValue(0);
  const [drag, setDrag] = useState(0);
  const [stop, setStop] = useState<string | null>(null);
  const off = seededAngle(st.m.id, -3, 3);
  const chk0 = freezeRules(snap, st, 1);
  const maxDays = chk0.why && !chk0.why.startsWith("At least") ? 0 : chk0.maxNow;
  const shown = kbDays ?? drag;
  return (
    <div className="relative" style={{ transform: `translate(${off}px, ${-off}px)` }}>
      <motion.button
        type="button"
        layoutId={`magnet-${st.m.id}`}
        transition={SPRING}
        drag="x"
        dragMomentum={false}
        dragElastic={0}
        style={{ x, outline: focused ? "2px solid var(--focus)" : undefined, outlineOffset: 3, borderRadius: 999 }}
        onFocus={onFocus}
        onClick={onFocus}
        onDoubleClick={onOpen}
        onDrag={() => {
          const n = Math.max(0, Math.round(x.get() / Math.max(30, colW)));
          if (n > maxDays) {
            x.set(maxDays * colW);
            setStop(chk0.why || `Max ${chk0.maxDays} days on ${st.plan?.nameEn ?? "this plan"}`);
            setDrag(maxDays);
          } else {
            setStop(null);
            setDrag(n);
          }
        }}
        onDragEnd={() => {
          const n = drag;
          void animate(x, 0, { type: "spring", stiffness: 500, damping: 18 });
          setDrag(0);
          setStop(null);
          onDrop(n);
        }}
        className="grip relative flex flex-col items-center"
        aria-label={`${st.m.name}, ends ${fmtDay(st.endDate)}. Press F to freeze, R to renew.`}
      >
        <Magnet state={st.plate} text={initials(st.m.name)} size={30} pin={!!st.freezeRequest} />
        {shown > 0 && (
          <span className="t-stencil absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[18px]" style={{ color: "var(--stamp-freeze)" }}>
            +{shown} days
          </span>
        )}
      </motion.button>
      {shown > 0 && (
        <svg className="pointer-events-none absolute left-[15px] top-[15px] overflow-visible" width="1" height="1" aria-hidden>
          <path d={`M0 0 L${shown * colW} 0`} stroke="var(--stamp-freeze)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 0" />
          <text x={(shown * colW) / 2} y="22" textAnchor="middle" fontSize="13" className="t-hand" fill="var(--ink)" opacity=".6">
            ends {fmtDay(addDays(st.endDate!, shown))}
          </text>
        </svg>
      )}
      {stop && (
        <span className="t-hand absolute left-0 top-12 z-10 whitespace-nowrap px-1 text-[13px]" style={{ background: "var(--hazard)", color: "var(--iron-rim)" }}>
          {stop}
        </span>
      )}
      <span className="t-hand block text-center text-[13px]" style={{ color: "var(--ink)" }}>
        {st.m.name.split(" ")[0]}
      </span>
      <span className="sr-only">{PLATE[st.plate].en}</span>
    </div>
  );
}
