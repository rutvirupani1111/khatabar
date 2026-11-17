"use client";
// The 6 am Slate: one chalk slate on the owner's phone. Every line is a real
// number from derive()/computeSlate(), and tapping it opens the exact members behind it.
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { forwardRef, useMemo, useRef, useState } from "react";
import { ChalkPath, Plate, SPRING } from "@/components/art";
import { useWhatsApp, WaProvider } from "@/components/desk/WaSheet";
import { MarginNotes, TopBar } from "@/components/shell/TopBar";
import { useDerived, useGym, useGymState, useSnap } from "@/components/shell/Gym";
import { message } from "@/components/shell/links";
import { addDays, fmtDay, todayIST } from "@/lib/core/dates";
import { rupees, uid } from "@/lib/core/money";
import { computeSlate, type Slate as SlateT } from "@/lib/core/slate";
import type { Derived, MemberState } from "@/lib/core/state";
import type { Snapshot } from "@/lib/core/types";

export function Owner() {
  return (
    <WaProvider>
      <OwnerInner />
    </WaProvider>
  );
}

type LineKey = "today" | "week" | "dues" | "takings" | "upi" | "drawer" | "churn" | "renewal" | "lapsed";

function OwnerInner() {
  const { base, mode } = useGym();
  const snap = useSnap();
  const d = useDerived();
  const [open, setOpen] = useState<LineKey | null>(null);
  const slateRef = useRef<HTMLDivElement>(null);
  const slate = useMemo(() => (snap ? computeSlate(snap) : null), [snap]);
  const share = async () => {
    if (!slateRef.current) return;
    const { toPng } = await import("html-to-image");
    const url = await toPng(slateRef.current, { pixelRatio: 2, backgroundColor: "#2b2f2c" });
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], `slate-${todayIST()}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: object) => boolean };
    if (nav.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Today's slate" }).catch(() => {});
    else {
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
    }
  };
  return (
    <div className="ledger-plain flex min-h-dvh flex-col" data-theme="light">
      <TopBar compact />
      <main className="mx-auto w-full max-w-[680px] px-3 py-4 sm:px-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="t-stencil text-[34px]" style={{ color: "var(--ink)" }}>
            6 am slate
          </h1>
          <span className="t-hand text-[16px]" style={{ color: "var(--muted-on-paper)" }}>
            {snap?.branch.name} · {fmtDay(todayIST())}
          </span>
          <div className="ml-auto flex gap-2">
            <Link href={mode === "demo" ? "/demo/o" : "/o"} className="btn-ink">
              All branches
            </Link>
            <button type="button" className="btn-ink" onClick={() => void share()}>
              Share slate
            </button>
          </div>
        </div>
        {!slate || !d || !snap ? <div className="skeleton h-[520px] w-full" style={{ background: "#2b2f2c" }} /> : <SlateBoard ref={slateRef} slate={slate} d={d} snap={snap} open={open} setOpen={setOpen} />}
        <p className="t-hand mt-3 text-[15px]" style={{ color: "var(--muted-on-paper)" }}>
          Every number on this slate is counted from the register. Tap a line to see the members behind it. <Link className="underline" href={`${base}/desk`}>Open the desk</Link>
        </p>
      </main>
      <MarginNotes />
    </div>
  );
}

const SlateBoard = forwardRef<HTMLDivElement, { slate: SlateT; d: Derived; snap: Snapshot; open: LineKey | null; setOpen: (k: LineKey | null) => void }>(function SlateBoard({ slate, d, snap, open, setOpen }, ref) {
  const { lang } = useGym();
  const names = (ids: string[], n = 4) => ids.slice(0, n).map((id) => d.byId.get(id)?.m.name.split(" ")[0]).filter(Boolean).join(", ") + (ids.length > n ? ` +${ids.length - n}` : "");
  const lines: { k: LineKey; hi: string; en: string; big: string; small: string; ids: string[]; warn?: boolean }[] = [
    { k: "today", hi: "आज ख़त्म", en: "Ending today", big: String(slate.endingToday.length), small: names(slate.endingToday) || "nobody", ids: slate.endingToday },
    { k: "week", hi: "इस हफ़्ते", en: "Ending this week", big: String(slate.endingWeek.length), small: slate.endingWeekByPlan.map((p) => `${p.plan} ${p.n}`).join(" · ") || "none", ids: slate.endingWeek },
    { k: "dues", hi: "बाकी", en: "Dues", big: rupees(slate.dues.total), small: `${slate.dues.ids.length} members owe${slate.dues.oldest ? ` · oldest ${slate.dues.oldest.m.name.split(" ")[0]} since ${fmtDay(slate.dues.oldest.oldestDue)}` : ""}`, ids: slate.dues.ids },
    { k: "takings", hi: "कल जमा", en: "Yesterday's takings", big: rupees(slate.yesterday.total), small: `cash ${rupees(slate.yesterday.byMode.cash)} · UPI ${rupees(slate.yesterday.byMode.upi_desk + slate.yesterday.byMode.upi_member)} · card ${rupees(slate.yesterday.byMode.card)}`, ids: slate.yesterday.ids },
    // UPI not yet seen in the gym's account is today's job, not yesterday's money
    ...(slate.pendingUpi.total ? [{ k: "upi" as const, hi: "UPI मिलान बाकी", en: "Waiting to match now", big: rupees(slate.pendingUpi.total), small: `${slate.pendingUpi.paymentIds.length} UPI ${slate.pendingUpi.paymentIds.length === 1 ? "payment" : "payments"} not yet seen in the gym's account`, ids: slate.pendingUpi.ids }] : []),
    { k: "drawer", hi: "गल्ला", en: "Drawer", big: slate.drawer.state === "matched" ? "matched" : slate.drawer.state === "short" ? `short ${rupees(Math.abs(slate.drawer.shortfall))}` : slate.drawer.state === "open" ? "not closed" : "no close yet", small: slate.drawer.state === "short" ? `${slate.drawer.staff}: "${slate.drawer.reason}"` : slate.drawer.state === "matched" ? `closed by ${slate.drawer.staff}` : slate.drawer.state === "open" ? "cash taken but no count signed" : "", ids: [], warn: slate.drawer.state === "open" },
    { k: "churn", hi: "दूर हो रहे", en: "Drifting away", big: String(slate.churn.length), small: "paid up and regular, but broke their own rhythm", ids: slate.churn.map((c) => c.st.m.id) },
    { k: "renewal", hi: "रिन्यू", en: "Renewed last month", big: `${slate.renewal.renewed} / ${slate.renewal.ended}`, small: "renewed within 7 days of their term ending", ids: slate.renewal.ids },
    { k: "lapsed", hi: "ख़त्म, रिन्यू नहीं", en: "Lapsed, not renewed", big: String(slate.lapsed.ids.length), small: "pick a reason for each", ids: slate.lapsed.ids },
  ];
  return (
    <div ref={ref} className="relative overflow-hidden p-4 sm:p-6" style={{ background: "radial-gradient(ellipse at 30% 20%, #3a403c, #2b2f2c 60%, #232724)", border: "10px solid #7a5a36", borderImage: "linear-gradient(135deg,#8a6a43,#5e4326,#8a6a43) 10", color: "var(--chalk)" }}>
      <div className="pointer-events-none absolute inset-0 opacity-[.07]" style={{ backgroundImage: "url(/tex/board-ghost-2.svg)", backgroundSize: "cover", filter: "invert(1)" }} />
      <ul className="relative flex flex-col">
        {lines.map((l, i) => (
          <li key={l.k} className="border-b border-white/10 last:border-0">
            <motion.button layout="position" type="button" className="flex w-full items-baseline gap-3 py-3 text-left" onClick={() => setOpen(open === l.k ? null : l.k)} aria-expanded={open === l.k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
              <span className="min-w-0 flex-1">
                <span className="t-hand block text-[19px] leading-tight" lang={lang === "hi" ? "hi" : undefined}>
                  {lang === "hi" ? l.hi : l.en}
                  {l.warn && <span className="hazard ml-2 inline-block h-3 w-10 align-middle" />}
                </span>
                <span className="t-hand block text-[14px] leading-snug" style={{ color: "var(--chalk-dust)" }}>
                  {l.small}
                </span>
              </span>
              <span className="t-stencil tnum shrink-0 text-right text-[clamp(28px,8vw,44px)]" style={{ color: l.k === "dues" ? "#ff9b8a" : "var(--chalk)" }}>
                {l.big}
              </span>
            </motion.button>
            {l.k === "churn" && <ChurnFade items={slate.churn} />}
            <AnimatePresence initial={false}>
              {open === l.k && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.36 }} className="overflow-hidden">
                  <LineList k={l.k} ids={l.ids} d={d} snap={snap} slate={slate} />
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
      <svg className="pointer-events-none absolute bottom-2 right-3 h-6 w-28" viewBox="0 0 112 24" aria-hidden>
        <ChalkPath d="M4 16 C30 6 60 22 108 10" width={2} color="var(--chalk-dust)" delay={0.8} />
      </svg>
    </div>
  );
});

/** Members drifting away: a chalk tally that fades to dust as the days since their last visit grow. */
function ChurnFade({ items }: { items: SlateT["churn"] }) {
  if (!items.length) return null;
  return (
    <div className="-mt-1 mb-2 flex flex-wrap gap-x-4 gap-y-1">
      {items.slice(0, 10).map((c) => {
        const fade = Math.max(0.25, 1 - Math.min(c.daysSince, 30) / 36);
        return (
          <span key={c.st.m.id} className="t-hand flex items-center gap-1 text-[14px]" style={{ opacity: fade }} title={c.why}>
            <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden>
              {[2, 6, 10, 14].map((x) => (
                <path key={x} d={`M${x} 1 L${x + 0.6} 13`} stroke="var(--chalk)" strokeWidth="1.8" />
              ))}
            </svg>
            {c.st.m.name.split(" ")[0]} {c.daysSince < 99 ? `${c.daysSince}d` : ""}
          </span>
        );
      })}
    </div>
  );
}

function LineList({ k, ids, d, snap, slate }: { k: LineKey; ids: string[]; d: Derived; snap: Snapshot; slate: SlateT }) {
  const { base, store, mode, lang, today } = useGym();
  const actor = useGymState((s) => s.actor);
  const wa = useWhatsApp();
  const [peek, setPeek] = useState<string | null>(null);
  const staffName = snap.staff.find((s) => s.id === actor.staffId)?.name ?? snap.staff.find((s) => s.role === "owner")?.name ?? "Owner";
  if (k === "drawer") {
    const closes = [...snap.closes].sort((a, b) => (a.shiftEnd < b.shiftEnd ? 1 : -1)).slice(0, 5);
    return (
      <div className="ledger mb-3 pb-1 text-[var(--text-on-paper)]">
        {closes.map((c) => (
          <div key={c.id} className="flex h-8 items-center gap-2 pl-[72px] pr-3 text-[13px]">
            <span className="t-mono w-16">{fmtDay(todayIST(Date.parse(c.shiftEnd)))}</span>
            <span className="t-mono w-24">{rupees(c.counted)}</span>
            <span className="truncate" style={{ color: c.shortfall ? "var(--margin-red)" : "var(--ink)" }}>
              {c.shortfall ? `short ${rupees(c.shortfall)}: ${c.reason}` : "matched"} · {snap.staff.find((s) => s.id === c.staffId)?.name}
            </span>
          </div>
        ))}
        {!closes.length && <div className="t-hand h-8 pl-[72px]">No closes in the last two weeks.</div>}
      </div>
    );
  }
  const list = ids.map((id) => d.byId.get(id)).filter((x): x is MemberState => !!x);
  const churnWhy = new Map(slate.churn.map((c) => [c.st.m.id, c.why]));
  return (
    <div className="ledger mb-3 pb-1 text-[var(--text-on-paper)]">
      {k === "upi" && list.length > 0 && (
        <div className="flex h-8 items-center pl-[72px]">
          <Link href={`${base}/desk?upi=1`} className="btn-ink !min-h-7">
            Match them at the desk
          </Link>
        </div>
      )}
      {k === "today" && list.length > 0 && (
        <div className="flex h-8 items-center pl-[72px]">
          <Link href={`${base}/rack?load=today`} className="btn-ink !min-h-7">
            Remind all {list.length}
          </Link>
        </div>
      )}
      {list.map((x) => (
        <div key={x.m.id}>
          <button type="button" className="grid h-8 w-full items-center gap-2 pl-[72px] pr-3 text-left text-[13px]" style={{ gridTemplateColumns: "22px 1fr auto" }} onClick={() => setPeek(peek === x.m.id ? null : x.m.id)}>
            <Plate state={x.plate} size={18} label="" />
            <span className="truncate" style={{ color: "var(--ink)" }}>
              {x.m.memberNo} {x.m.name}
              {k === "churn" && <span className="t-hand ml-2 text-[13px]" style={{ color: "var(--margin-red)" }}>{churnWhy.get(x.m.id)}</span>}
            </span>
            <span className="t-mono text-[12px]">{k === "dues" ? rupees(x.dues) : k === "upi" ? rupees(x.pending) : fmtDay(x.endDate)}</span>
          </button>
          {peek === x.m.id && (
            <div className="flex flex-wrap items-center gap-2 py-1 pl-[72px] pr-3">
              <VisitStrip snap={snap} memberId={x.m.id} today={today} />
              {k === "churn" && (
                <>
                  <button type="button" className="btn-ink !min-h-7" onClick={() => wa({ phone: x.m.phone, text: message(snap, mode, x, "missed", lang, staffName), to: x.m.name })}>
                    We miss you
                  </button>
                  <button type="button" className="btn-ink !min-h-7" onClick={() => { store.run("churn.dismiss", { id: uid(), memberId: x.m.id, reason: "called", days: 7 }); store.note(`Marked as called: ${x.m.name}`, "ink"); }}>
                    Mark as called
                  </button>
                  {["exams", "travel", "injury"].map((r) => (
                    <button key={r} type="button" className="btn-ink !min-h-7" onClick={() => store.run("churn.dismiss", { id: uid(), memberId: x.m.id, reason: r, days: 21 })}>
                      Dismiss: {r}
                    </button>
                  ))}
                </>
              )}
              {k === "lapsed" && x.term && (
                <select aria-label="Why they lapsed" className="field !h-8 !w-44" value={x.term.lapseReason ?? ""} onChange={(e) => store.run("lapse.reason", { membershipId: x.term!.id, reason: e.target.value })}>
                  <option value="">Why? pick one</option>
                  {["moved", "cost", "injury", "joined another gym", "unknown"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              )}
              <Link className="btn-ink !min-h-7" href={`${base}/desk?m=${x.m.id}`}>
                Open at the desk
              </Link>
            </div>
          )}
        </div>
      ))}
      {!list.length && <div className="t-hand h-8 pl-[72px]" style={{ color: "var(--muted-on-paper)" }}>Nobody on this line.</div>}
    </div>
  );
}

/** 8 weeks of visits as chalk tallies; missed weeks smudge instead of resetting to zero. */
export function VisitStrip({ snap, memberId, today }: { snap: Snapshot; memberId: string; today: string }) {
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = addDays(today, -7 * i);
    const start = addDays(end, -6);
    return snap.checkins.filter((c) => c.memberId === memberId && c.istDate >= start && c.istDate <= end).length;
  }).reverse();
  return (
    <span className="inline-flex items-end gap-1" aria-label={`Visits per week, oldest first: ${weeks.join(", ")}`}>
      {weeks.map((n, i) => (
        <span key={i} className="inline-block w-3" style={{ height: 4 + n * 5, background: n ? "var(--ink)" : "transparent", borderBottom: "2px solid var(--ink)", opacity: n ? 0.8 : 0.35 }} />
      ))}
    </span>
  );
}

/** Small slates side by side for an owner with several branches. */
export function MiniSlate({ snap, href }: { snap: Snapshot; href: string }) {
  const s = computeSlate(snap);
  return (
    <motion.a href={href} layout transition={SPRING} className="block p-4" style={{ background: "#2b2f2c", border: "6px solid #7a5a36", color: "var(--chalk)" }}>
      <div className="t-stencil text-[26px]" style={{ color: "var(--brass-hi)" }}>
        {snap.branch.name}
      </div>
      <div className="t-hand mt-2 grid grid-cols-2 gap-x-3 text-[15px]">
        <span>Ending today</span>
        <span className="t-stencil text-right text-[22px]">{s.endingToday.length}</span>
        <span>Dues</span>
        <span className="t-stencil text-right text-[22px]">{rupees(s.dues.total)}</span>
        <span>Yesterday</span>
        <span className="t-stencil text-right text-[22px]">{rupees(s.yesterday.total)}</span>
        <span>Drawer</span>
        <span className="text-right">{s.drawer.state}</span>
        <span>In today</span>
        <span className="t-stencil text-right text-[22px]">{s.checkinsToday}</span>
      </div>
    </motion.a>
  );
}
