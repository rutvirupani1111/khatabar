"use client";
// Scene 2's demo: the real front desk, small. Type 4521 and Mahesh's card comes up; Renew runs the
// same three-step flow as the app on the shared demo gym. Nothing opens WhatsApp or a UPI app.
import { useEffect, useMemo, useRef, useState } from "react";
import { RenewFlow, type Landed } from "@/components/desk/RenewFlow";
import { useCheckin } from "@/components/desk/checkin";
import { useDerived, useGym, useSnap } from "@/components/shell/Gym";
import { message } from "@/components/shell/links";
import { Icon } from "@/components/ui/Icon";
import { Chip, chipsFor, DaysRing, Initials } from "@/components/ui/Status";
import { fmtDate, istClock } from "@/lib/core/dates";
import { planLabel } from "@/lib/core/state";
import { search, uniqueByLast4 } from "@/lib/core/search";
import { goToScene, streetBus, streetPicks } from "@/lib/client/street";
import { DemoFooter, StreetGym, WaPreview } from "./shared";

export default function CounterDemo() {
  return (
    <div className="phone-frame wide-only">
      <span className="notch" aria-hidden />
      <div className="screen">
        <StreetGym>
          <Counter />
        </StreetGym>
      </div>
    </div>
  );
}

function Counter() {
  const { today } = useGym();
  const snap = useSnap()!;
  const d = useDerived()!;
  const { checkIn } = useCheckin();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<"card" | "renew" | "receipt">("card");
  const [slip, setSlip] = useState<{ text: string; ok: boolean } | null>(null);
  const [landed, setLanded] = useState<Landed | null>(null);
  const box = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // scene 7 hands over an imported member's last 4 digits; Reset demo clears everything
  useEffect(() => {
    const take = () => {
      if (streetPicks.counterQ) {
        setQ(streetPicks.counterQ);
        setSel(null);
        setView("card");
        streetPicks.counterQ = undefined;
      }
    };
    take();
    return streetBus.on((e) => {
      if (e === "pick") take();
      if (e === "reset") {
        setQ("");
        setSel(null);
        setView("card");
        setSlip(null);
        setLanded(null);
      }
    });
  }, []);

  const hits = useMemo(() => (q.trim() ? search(d.list, q).slice(0, 5) : []), [d, q]);
  const one = useMemo(() => uniqueByLast4(d.list, q), [d, q]);
  useEffect(() => {
    if (one && one.m.id !== sel) {
      setSel(one.m.id);
      setView("card");
      setSlip(null);
      streetBus.emit("found");
    }
  }, [one, sel]);
  const st = sel ? d.byId.get(sel) : undefined;

  const pick = (id: string) => {
    setSel(id);
    setView("card");
    setSlip(null);
    streetBus.emit("found");
  };

  return (
    <div ref={panel} className="flex flex-col">
      <div className="on-dark flex h-11 items-center justify-between gap-2 bg-[var(--indigo)] px-4 pt-[env(safe-area-inset-top)] text-[var(--cream)]">
        <span className="truncate text-[15px] font-semibold">Front desk · {snap.branch.name}</span>
        <span className="rounded-full bg-[var(--marigold)] px-2 py-0.5 text-[12px] font-bold text-[var(--ink)]">Demo</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <label className="block">
          <span className="label">Find a member</span>
          <span className="relative mt-1 block">
            <Icon name="search" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={box}
              type="search"
              inputMode="search"
              autoComplete="off"
              className="input !min-h-[52px] !pl-10 text-[17px]"
              placeholder="Last 4 digits of phone, or name"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (!e.target.value) setSel(null);
              }}
            />
          </span>
        </label>
        {!q && (
          <button type="button" className="chip chip-filter self-start !h-10" onClick={() => setQ("4521")}>
            <Icon name="phone" size={16} /> Try 4521
          </button>
        )}
        {q && !st && hits.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] p-3 text-[15px]" role="status">
            No member with {q}. In your gym you would tap <b>+ New member</b>.
          </p>
        )}
        {q && !st && hits.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Members found">
            {hits.map((h) => (
              <li key={h.m.id}>
                <button type="button" onClick={() => pick(h.m.id)} className="panel-flat flex w-full items-center gap-3 px-3 py-2 text-left">
                  <Initials name={h.m.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{h.m.name}</span>
                    <span className="block text-[13px] text-[var(--muted-ink)]">Valid till {fmtDate(h.endDate, today)}</span>
                  </span>
                  {chipsFor(h)[0] && <Chip {...chipsFor(h)[0]} />}
                </button>
              </li>
            ))}
          </ul>
        )}

        {st && view === "card" && (
          <div className="panel flex flex-col gap-3 p-4" aria-live="polite">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="t-display text-[22px] leading-tight" style={{ fontWeight: 700 }}>
                  {st.m.name}
                </h3>
                <p className="text-[14px] text-[var(--muted-ink)]">
                  <span className="t-mono">{st.m.memberNo}</span> · {planLabel(st)}
                </p>
                <p className="mt-1 text-[15px] font-semibold">
                  Valid till {fmtDate(st.endDate, today)}
                  {st.daysLeft != null && st.daysLeft >= 0 ? ` · ${st.daysLeft} ${st.daysLeft === 1 ? "day" : "days"} left` : ""}
                </p>
              </div>
              <DaysRing left={st.daysLeft} total={st.totalDays} size={68} frozen={!!st.frozenNow} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {chipsFor(st).map((c) => (
                <Chip key={c.text} {...c} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="btn btn-primary !px-2"
                onClick={() => {
                  setView("renew");
                  setSlip(null);
                  streetBus.emit("renew-open");
                }}
              >
                <Icon name="renew" size={18} /> Renew
              </button>
              <button
                type="button"
                className="btn !px-2"
                onClick={() => {
                  const ev = checkIn(st.m.id, "desk_manual");
                  if (ev.kind === "ok") {
                    setSlip({ ok: true, text: `${st.m.name} checked in at ${istClock(Date.now())}.` });
                    streetBus.emit("checked-in");
                  } else setSlip({ ok: false, text: ev.kind === "already" ? `${st.m.name}: ${ev.text}.` : `${ev.text}. In a real gym the desk has a word first.` });
                }}
              >
                <Icon name="door" size={18} /> Check in
              </button>
              <button
                type="button"
                className="btn !px-2 !text-[14px] leading-tight"
                onClick={() => {
                  streetPicks.fees = st.m.id;
                  streetBus.emit("pick");
                  goToScene("fees");
                }}
              >
                <Icon name="chat" size={18} /> Send reminder
              </button>
            </div>
            {slip && (
              <p className={`rounded-xl border-2 border-[var(--ink)] p-2 text-[15px] font-semibold ${slip.ok ? "bg-[var(--paan)] text-white" : "bg-[var(--marigold-pale)]"}`} role="status">
                {slip.text}
              </p>
            )}
          </div>
        )}

        {st && view === "renew" && (
          <div className="panel p-4">
            <RenewFlow
              st={st}
              snap={snap}
              onCancel={() => setView("card")}
              onEvent={(e) => {
                if (e === "paid") streetBus.emit("paid");
                if (e === "waiting") streetBus.emit("waiting");
              }}
              onReceipt={(l) => {
                setLanded(l);
                setView("receipt");
              }}
            />
          </div>
        )}

        {st && view === "receipt" && landed && (
          <div className="flex flex-col gap-3">
            <WaPreview to={st.m.name} text={message(snap, "demo", st, "receipt", "en", "Ravi", { amount: landed.amount, paymentId: landed.paymentIds[0], planName: landed.planName, expiry: landed.newEnd ?? st.endDate })} note="In your gym this opens WhatsApp with the receipt typed. You press Send." />
            <button type="button" className="btn self-start" onClick={() => setView("card")}>
              <Icon name="back" size={18} /> Back to the card
            </button>
          </div>
        )}
        <DemoFooter href="/demo/desk" />
      </div>
    </div>
  );
}
