"use client";
// Scene 3's demo: three chits on a string, picked from the demo gym (who owes the most, who ends in
// a day or three, who ended last week). Send reminder shows the exact message; marking it sent is
// the same honest "opened" line the app writes. WhatsApp never opens from here.
import { useEffect, useMemo, useState } from "react";
import { useDerived, useGym, useSnap } from "@/components/shell/Gym";
import { message } from "@/components/shell/links";
import { Icon } from "@/components/ui/Icon";
import { Chip, type ChipSpec } from "@/components/ui/Status";
import { diffDays, fmtDay, todayIST } from "@/lib/core/dates";
import { rupees, uid } from "@/lib/core/money";
import type { MemberState } from "@/lib/core/state";
import type { Lang, Stage } from "@/lib/core/types";
import { streetBus, streetPicks } from "@/lib/client/street";
import { DemoFooter, StreetGym, useTick, WaPreview } from "./shared";

export default function FeesDemo() {
  return (
    <StreetGym>
      <Fees />
    </StreetGym>
  );
}

interface Chit {
  st: MemberState;
  stage: Stage;
  chip: ChipSpec;
}

function stageOf(st: MemberState): Stage {
  const d = st.daysLeft ?? 0;
  if (st.dues > 0) return "dues";
  if (d < 0) return "post3";
  if (d === 0) return "day0";
  if (d <= 3) return "pre3";
  return "pre7";
}

function chipOf(st: MemberState, stage: Stage): ChipSpec {
  if (stage === "dues") return { kind: "owes", text: `Owes ${rupees(st.dues)}` };
  if (stage === "post3") return { kind: "ended", text: `Ended on ${fmtDay(st.endDate)}` };
  if (stage === "day0") return { kind: "soon", text: "Ends today" };
  return { kind: "soon", text: `Ends on ${fmtDay(st.endDate)}` };
}

function Fees() {
  const { store, today } = useGym();
  const snap = useSnap()!;
  const d = useDerived()!;
  useTick();
  const [picked, setPicked] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [walk, setWalk] = useState<number | null>(null);

  useEffect(() => {
    const take = () => {
      if (streetPicks.fees) {
        setPicked(streetPicks.fees);
        setOpen(streetPicks.fees);
        streetPicks.fees = undefined;
      }
    };
    take();
    return streetBus.on((e) => {
      if (e === "pick") take();
      if (e === "reset") {
        setPicked(null);
        setOpen(null);
        setWalk(null);
      }
    });
  }, []);

  const chits = useMemo<Chit[]>(() => {
    const out: Chit[] = [];
    const used = new Set<string>();
    const add = (st: MemberState | undefined, stage?: Stage) => {
      if (!st || used.has(st.m.id)) return;
      used.add(st.m.id);
      const sg = stage ?? stageOf(st);
      out.push({ st, stage: sg, chip: chipOf(st, sg) });
    };
    if (picked) add(d.byId.get(picked));
    const owes = [...d.list].filter((x) => x.dues > 0 && !x.frozenNow).sort((a, b) => b.dues - a.dues || a.m.memberNo.localeCompare(b.m.memberNo));
    add(owes.find((x) => !used.has(x.m.id)), "dues");
    const soon = d.list.filter((x) => x.dues === 0 && x.daysLeft != null && x.daysLeft >= 1 && x.daysLeft <= 3 && !x.frozenNow).sort((a, b) => a.m.memberNo.localeCompare(b.m.memberNo));
    add(soon.find((x) => !used.has(x.m.id)), "pre3");
    const ended = d.list.filter((x) => x.dues === 0 && x.daysLeft != null && x.daysLeft <= -1 && x.daysLeft >= -14).sort((a, b) => a.m.memberNo.localeCompare(b.m.memberNo));
    add(ended.find((x) => !used.has(x.m.id)), "post3");
    return out.slice(0, 3);
  }, [d, picked]);

  const lastSent = (memberId: string) => {
    const at = snap.reminders.filter((r) => r.memberId === memberId && r.openedAt).sort((a, b) => ((a.openedAt ?? "") < (b.openedAt ?? "") ? 1 : -1))[0]?.openedAt;
    if (!at) return "Not sent yet";
    const days = diffDays(today, todayIST(Date.parse(at)));
    if (days <= 0) {
      const mins = Math.round((Date.now() - Date.parse(at)) / 60000);
      return mins < 1 ? "Sent just now" : `Sent ${mins} min ago`;
    }
    return `Sent ${days} ${days === 1 ? "day" : "days"} ago`;
  };

  const markSent = (c: Chit) => {
    const queued = snap.reminders.find((r) => r.memberId === c.st.m.id && r.state === "queued");
    let id = queued?.id;
    if (!id) {
      id = uid();
      const r = store.run("reminder.add", { reminders: [{ id, memberId: c.st.m.id, membershipId: c.st.term?.id ?? null, stage: "manual", dueDate: today }] });
      if (!r.ok) return;
    }
    const r = store.run("reminder.mark", { id, state: "opened" });
    if (r.ok) streetBus.emit("reminded");
  };

  const cur = open ? chits.find((c) => c.st.m.id === open) : walk != null ? chits[walk] : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <svg viewBox="0 0 440 40" className="pointer-events-none absolute inset-x-0 -top-1 hidden h-10 w-full sm:block" preserveAspectRatio="none" aria-hidden>
          <path d="M4 10 Q220 58 436 10" fill="none" stroke="#1B1A2E" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <ul className="grid grid-cols-1 gap-3 pt-0 sm:grid-cols-3 sm:gap-2.5 sm:pt-7" aria-label="Members to remind">
          {chits.map((c, i) => (
            <li key={c.st.m.id} className="relative flex" style={{ transform: `rotate(${[-1.5, 0, 1.5][i]}deg)` }}>
              <span aria-hidden className="absolute -top-5 left-1/2 hidden h-8 w-2.5 -translate-x-1/2 rounded-sm border-2 border-[var(--ink)] bg-[var(--wood)] sm:block" />
              <div className="flex w-full flex-col gap-2 rounded-lg border-2 border-[var(--ink)] bg-[var(--paper)] p-3 shadow-[0_3px_0_var(--ink)]">
                <div className="min-h-[44px] text-[15px] font-bold leading-tight">{c.st.m.name}</div>
                <Chip {...c.chip} className="self-start !text-[12px]" />
                <div className="text-[12px] font-semibold text-[var(--muted-ink)]">Last reminder: {lastSent(c.st.m.id)}</div>
                <button type="button" className="btn btn-sm mt-auto !min-h-11 !px-2 !text-[14px]" onClick={() => (setOpen(c.st.m.id), setWalk(null))} aria-expanded={open === c.st.m.id}>
                  <Icon name="chat" size={16} /> Send reminder
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {cur && (
        <div className="demo-panel flex flex-col gap-3 p-4">
          {walk != null && (
            <p className="text-[14px] font-bold">
              {walk + 1} of {chits.length}: {cur.st.m.name}
            </p>
          )}
          <div className="flex gap-1" role="radiogroup" aria-label="Message language">
            {(["en", "hi"] as Lang[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={lang === l} className="btn btn-sm" aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l === "en" ? "English" : "Hinglish"}
              </button>
            ))}
          </div>
          <WaPreview to={cur.st.m.name} text={message(snap, "demo", cur.st, cur.stage, lang, "Ravi")} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-success"
              onClick={() => {
                markSent(cur);
                if (walk != null) setWalk(walk + 1 < chits.length ? walk + 1 : null);
                else setOpen(null);
              }}
            >
              <Icon name="tick" size={18} /> Mark as sent (demo)
            </button>
            {walk != null ? (
              <>
                <button type="button" className="btn" onClick={() => setWalk(walk + 1 < chits.length ? walk + 1 : null)}>
                  Skip
                </button>
                <button type="button" className="btn" onClick={() => setWalk(null)}>
                  Stop
                </button>
              </>
            ) : (
              <button type="button" className="btn" onClick={() => setOpen(null)}>
                Close
              </button>
            )}
          </div>
        </div>
      )}
      {!cur && (
        <button type="button" className="btn btn-primary self-start" onClick={() => (setOpen(null), setWalk(0))}>
          <Icon name="chat" size={18} /> Send all {chits.length}, one by one
        </button>
      )}
      <DemoFooter href="/demo/fees" />
    </div>
  );
}
