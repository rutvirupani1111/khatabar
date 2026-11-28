"use client";
// Scene 6's demo, in two beats. At night Sunita counts the drawer against what the app expects
// (cash taken at the counter in scene 2 is in it). At 6 am Meena reads the owner report: every
// number comes from computeSlate() on the same demo gym, and every line opens the names behind it.
import { useEffect, useMemo, useRef, useState } from "react";
import { useDerived, useGym, useSnap } from "@/components/shell/Gym";
import { Icon } from "@/components/ui/Icon";
import { Chip, chipsFor } from "@/components/ui/Status";
import { useStore } from "@/lib/client/store";
import { addDays } from "@/lib/core/dates";
import { countedFrom, DENOMS, drawerFigures } from "@/lib/core/drawer";
import { rupees, uid } from "@/lib/core/money";
import { computeSlate, type Slate } from "@/lib/core/slate";
import { derive } from "@/lib/core/state";
import type { Snapshot } from "@/lib/core/types";
import { goToScene, streetBus, streetStoreLV } from "@/lib/client/street";
import { DemoFooter, StreetGym, WaPreview } from "./shared";

export default function CloseAndReportDemo() {
  return (
    <StreetGym>
      <Beats />
    </StreetGym>
  );
}

function Beats() {
  const [tab, setTab] = useState<1 | 2>(1);
  useEffect(() => {
    const sec = document.getElementById("report");
    sec?.setAttribute("data-beat", tab === 2 ? "morning" : "night");
    streetBus.emit(tab === 2 ? "morning" : "night");
  }, [tab]);
  useEffect(() => streetBus.on((e) => e === "reset" && setTab(1)), []);
  return (
    <div className="phone-frame wide-only">
      <span className="notch" aria-hidden />
      <div className="screen">
        <div className="flex flex-col gap-3 p-4 pt-6">
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Night and morning">
            {[
              [1, "1 Close the day"],
              [2, "2 Morning report"],
            ].map(([n, label]) => (
              <button key={n} type="button" role="tab" aria-selected={tab === n} className="btn !px-2" aria-pressed={tab === n} onClick={() => setTab(n as 1 | 2)}>
                {label}
              </button>
            ))}
          </div>
          {tab === 1 ? <CloseDay onSaved={() => setTimeout(() => setTab(2), 600)} /> : <Report />}
          <DemoFooter href="/demo/report" />
        </div>
      </div>
    </div>
  );
}

function CloseDay({ onSaved }: { onSaved: () => void }) {
  const { store, today } = useGym();
  const snap = useSnap()!;
  const since = new Date(Date.parse(`${today}T00:00:00+05:30`)).toISOString();
  const fig = useMemo(() => drawerFigures(snap, null, since), [snap, since]);
  const mahesh = snap.members.find((m) => m.memberNo === "LP-0042");
  const maheshCash = mahesh ? snap.payments.filter((p) => p.memberId === mahesh.id && p.mode === "cash" && p.state === "confirmed" && p.createdAt >= since && p.amount > 0).reduce((a, p) => a + p.amount, 0) : 0;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const counted = countedFrom(counts);
  const diff = counted - fig.expected;
  const bump = (k: string, by: number) => setCounts((c) => ({ ...c, [k]: Math.max(0, (c[k] ?? 0) + by) }));
  const save = () => {
    if (diff !== 0 && reason.trim().length < 8) return setErr("Write what happened, in at least 8 letters.");
    const was = store.state.actor;
    store.setActor({ staffId: "st-sunita", role: "manager" });
    const r = store.run("close.save", { id: uid(), counts, counted, expected: fig.expected, upiTotal: fig.upi, shiftStart: since, reason: reason.trim() });
    store.setActor(was);
    if (!r.ok) return setErr(r.error ?? "Not saved");
    setErr("");
    streetBus.emit("close-saved", { matched: diff === 0 });
    onSaved();
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="panel-flat p-3">
        <p className="text-[15px] font-semibold">The app expects</p>
        <p className="t-display text-[30px] leading-none">{rupees(fig.expected)}</p>
        <p className="mt-1 text-[13px] text-[var(--muted-ink)]">cash in the drawer. You are Sunita, the manager, closing tonight.</p>
        {maheshCash > 0 && <p className="mt-1 text-[14px] font-semibold">Includes Mahesh&apos;s {rupees(maheshCash)} from this morning.</p>}
        {fig.expected > 0 ? (
          <p className="mt-1 text-[14px] font-semibold">Count the notes below. Make it {rupees(fig.expected)} to see Matched, or {rupees(Math.max(0, fig.expected - 20000))} to see what a short drawer looks like.</p>
        ) : (
          <p className="mt-1 text-[14px] font-semibold">No cash was taken today. Count ₹500 to see what a mismatch looks like.</p>
        )}
      </div>
      <ul className="flex flex-col">
        {[...DENOMS.map(String), "coins"].map((k) => (
          <li key={k} className="flex items-center gap-2 border-b border-[var(--line)] py-1">
            <span className="w-[76px] text-[14px] font-semibold">{k === "coins" ? "Coins (₹)" : `₹${k}`}</span>
            <button type="button" className="btn btn-sm !h-11 !w-11 !px-0" aria-label={`One less ${k === "coins" ? "rupee in coins" : `₹${k} note`}`} onClick={() => bump(k, -1)}>
              −
            </button>
            <span className="t-mono w-8 text-center text-[16px]" aria-live="polite">
              {counts[k] ?? 0}
            </span>
            <button type="button" className="btn btn-sm !h-11 !w-11 !px-0" aria-label={`One more ${k === "coins" ? "rupee in coins" : `₹${k} note`}`} onClick={() => bump(k, 1)}>
              +
            </button>
            <span className="t-mono ml-auto text-[14px]">{rupees((counts[k] ?? 0) * (k === "coins" ? 1 : Number(k)) * 100)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between">
        <span className="font-semibold">You counted</span>
        <span className="t-display text-[24px]">{rupees(counted)}</span>
      </div>
      <div aria-live="polite">{diff === 0 ? <Chip kind="paid" text="Matched" /> : diff < 0 ? <Chip kind="owes" text={`${rupees(-diff)} short. Write what happened.`} /> : <Chip kind="owes" text={`${rupees(diff)} extra. Write what happened.`} />}</div>
      {diff !== 0 && (
        <label>
          <span className="label">What happened? (needed when it does not match)</span>
          <input className="input mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Gave ₹200 change for milk" />
        </label>
      )}
      {err && (
        <p role="alert" className="text-[14px] font-semibold text-[#9b0f3f]">
          {err}
        </p>
      )}
      <button type="button" className="btn btn-primary btn-lg" onClick={save}>
        Save the count
      </button>
    </div>
  );
}

function useCountUp(target: number, run: boolean) {
  const { calm } = useGym();
  const [v, setV] = useState(run && !calm ? 0 : target);
  const raf = useRef(0);
  useEffect(() => {
    if (!run || calm) return setV(target);
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, run, calm]);
  return v;
}

type Line = "today" | "dues" | "upi" | "churn";

/** The owner reads this at 6 am the next morning, so its "yesterday" is the day just counted. */
function Report() {
  const { today: closing } = useGym();
  const today = addDays(closing, 1);
  const snap = useSnap()!;
  const [branch, setBranch] = useState<"all" | "LP" | "LV">("LP");
  const lv = useMemo(() => (branch === "LP" ? null : streetStoreLV()), [branch]);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-1" role="tablist" aria-label="Branch">
        {(
          [
            ["all", "All branches"],
            ["LP", "Maninagar"],
            ["LV", "Vastrapur"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={branch === k} aria-pressed={branch === k} className="btn btn-sm !min-h-11 !px-1 !text-[13px]" onClick={() => setBranch(k)}>
            {label}
          </button>
        ))}
      </div>
      {branch === "LP" || !lv ? <SlateView snaps={[snap]} today={today} /> : <WithLV lv={lv} main={snap} only={branch === "LV"} today={today} />}
    </div>
  );
}

function WithLV({ lv, main, only, today }: { lv: ReturnType<typeof streetStoreLV>; main: Snapshot; only: boolean; today: string }) {
  const s2 = useStore(lv, (s) => s.snap);
  if (!s2) return <div className="skeleton h-[300px]" />;
  return <SlateView snaps={only ? [s2] : [main, s2]} today={today} />;
}

function SlateView({ snaps, today }: { snaps: Snapshot[]; today: string }) {
  const d = useDerived()!;
  const slates = useMemo(() => snaps.map((s) => computeSlate(s, today)), [snaps, today]);
  const sum = (f: (s: Slate) => number) => slates.reduce((a, s) => a + f(s), 0);
  const [open, setOpen] = useState<Line | null>(null);
  const [share, setShare] = useState(false);
  const ending = useCountUp(sum((s) => s.endingToday.length), true);
  const dues = useCountUp(sum((s) => s.dues.total), true);
  const takings = useCountUp(sum((s) => s.yesterday.total), true);
  const upi = useCountUp(sum((s) => s.pendingUpi.total), true);
  const churn = useCountUp(sum((s) => s.churn.length), true);
  const cash = sum((s) => s.yesterday.byMode.cash);
  const upiY = sum((s) => s.yesterday.byMode.upi_desk + s.yesterday.byMode.upi_member);
  const drawers = slates.map((s) => s.drawer);
  const drawerText = drawers.map((dr) => (dr.state === "matched" ? `Matched, closed by ${dr.staff}` : dr.state === "short" ? `${rupees(Math.abs(dr.shortfall))} ${dr.shortfall > 0 ? "short" : "extra"}, closed by ${dr.staff}: "${dr.reason}"` : dr.state === "open" ? "Cash taken but not counted" : "No count yet")).join(" · ");
  const ids = (l: Line) => (l === "today" ? slates.flatMap((s) => s.endingToday) : l === "dues" ? slates.flatMap((s) => s.dues.ids) : l === "upi" ? slates.flatMap((s) => s.pendingUpi.ids) : slates.flatMap((s) => s.churn.map((c) => c.st.m.id)));
  const allD = useMemo(() => snaps.map((s) => derive(s, today)), [snaps, today]);
  const find = (id: string) => allD.map((x) => x.byId.get(id)).find(Boolean) ?? d.byId.get(id);
  const summary = `Good morning. ${snaps.length > 1 ? "All branches" : snaps[0].branch.name}: ${sum((s) => s.endingToday.length)} ending today, ${rupees(sum((s) => s.dues.total))} owed, yesterday's takings ${rupees(sum((s) => s.yesterday.total))}, ${rupees(sum((s) => s.pendingUpi.total))} waiting for money. Drawer: ${drawerText}.`;

  const row = (label: string, value: string, line?: Line, extra?: React.ReactNode) => (
    <li className="border-b border-white/15 py-2.5 last:border-0">
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{label}</span>
        <span className="slate-num min-w-[96px] text-[20px]">{value}</span>
      </div>
      {(line || extra) && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {line && (
            <button type="button" className="btn btn-ondark btn-sm !min-h-9" aria-expanded={open === line} onClick={() => setOpen(open === line ? null : line)}>
              See names
            </button>
          )}
          {extra}
        </div>
      )}
      {line && open === line && (
        <ul className="mt-2 flex flex-col gap-1 rounded-lg bg-white/10 p-2">
          {ids(line).length === 0 && <li className="text-[14px]">Nobody here today.</li>}
          {ids(line)
            .slice(0, 8)
            .map((id) => {
              const st = find(id);
              if (!st) return null;
              const c = chipsFor(st)[0];
              return (
                <li key={id} className="flex flex-wrap items-center gap-2 text-[14px]">
                  <span className="font-semibold">{st.m.name}</span>
                  {c && <Chip {...c} />}
                  <a href={`/demo/desk?m=${id}${st.m.memberNo.startsWith("LV") ? "&b=LV" : ""}`} className="underline">
                    Open in demo desk
                  </a>
                </li>
              );
            })}
        </ul>
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="slate on-dark p-4">
        <p className="t-sign text-[13px] opacity-80">6:00 AM next morning · Owner report</p>
        <ul className="mt-1">
          {row("Ending today", String(ending), "today")}
          {row(
            "Owes money",
            rupees(dues),
            "dues",
            <button type="button" className="btn btn-ondark btn-sm !min-h-9" onClick={() => goToScene("fees")}>
              Send reminders (back at stop 3)
            </button>,
          )}
          {row(`Yesterday's takings (cash ${rupees(cash)}, UPI ${rupees(upiY)})`, rupees(takings))}
          {row("Waiting for money", rupees(upi), "upi")}
          <li className="border-b border-white/15 py-2.5">
            <span className="text-[15px] font-semibold">Cash drawer last night</span>
            <p className="mt-0.5 text-[14px]">{drawerText}</p>
          </li>
          {row("Regulars who stopped coming", String(churn), "churn")}
        </ul>
      </div>
      <button type="button" className="btn self-start" onClick={() => setShare((v) => !v)} aria-expanded={share}>
        <Icon name="chat" size={18} /> Share on WhatsApp
      </button>
      {share && <WaPreview to="Meena (owner)" text={summary} />}
    </div>
  );
}
