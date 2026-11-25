"use client";
// The owner report, ready at 6 am: yesterday's money, who ends today, who owes, the cash drawer and
// who stopped coming. Every number is counted from the members list, and every line opens the
// names behind it.
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { AppScreen, useShell } from "@/components/shell/AppShell";
import { useDerived, useGym, useSnap } from "@/components/shell/Gym";
import { Sheet } from "@/components/shell/Overlays";
import { Icon } from "@/components/ui/Icon";
import { Chip, chipsFor } from "@/components/ui/Status";
import { fmtDay } from "@/lib/core/dates";
import { rupees, uid } from "@/lib/core/money";
import { computeSlate } from "@/lib/core/slate";

type Line = "today" | "week" | "dues" | "yesterday" | "upi" | "churn" | "renewed" | "lapsed";

export function Report() {
  const { store, base, mode, today } = useGym();
  const snap = useSnap();
  const d = useDerived();
  const [line, setLine] = useState<Line | null>(null);
  const [share, setShare] = useState(false);
  const slate = useMemo(() => (snap ? computeSlate(snap, today) : null), [snap, today]);
  const sentence = "Ready at 6 am every day: yesterday's money and who needs a call.";
  if (!snap || !d || !slate)
    return (
      <AppScreen screen="report" title="Owner report" sentence={sentence} vignette="report">
        <div className="island-skel mx-auto w-full max-w-[760px]" aria-hidden>
          <i style={{ height: 420 }} />
        </div>
      </AppScreen>
    );
  const empty = !snap.payments.length && !d.list.length;
  const lv = (code: string) => (mode === "demo" && code === "LV" ? "?b=LV" : "");
  const ids: Record<Line, string[]> = {
    today: slate.endingToday,
    week: slate.endingWeek,
    dues: slate.dues.ids,
    yesterday: slate.yesterday.ids,
    upi: slate.pendingUpi.ids,
    churn: slate.churn.map((c) => c.st.m.id),
    renewed: slate.renewal.ids,
    lapsed: slate.lapsed.ids,
  };
  const dr = slate.drawer;
  const drawerText = dr.state === "matched" ? `Matched, closed by ${dr.staff}` : dr.state === "short" ? `${rupees(Math.abs(dr.shortfall))} ${dr.shortfall > 0 ? "short" : "extra"}, closed by ${dr.staff}: "${dr.reason}"` : dr.state === "open" ? "Cash was taken but the drawer was not counted" : "No count yet";
  const summary = `Good morning. ${snap.org.name}, ${snap.branch.name}: ${slate.endingToday.length} ending today, ${rupees(slate.dues.total)} owed by ${slate.dues.ids.length} members, yesterday's takings ${rupees(slate.yesterday.total)}, ${rupees(slate.pendingUpi.total)} waiting for money. Cash drawer: ${drawerText}. ${slate.churn.length} regulars stopped coming.`;

  const row = (k: Line | null, label: string, value: string, detail: string, extra?: ReactNode) => (
    <li className="border-b border-white/15 py-3 last:border-0">
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold leading-snug">{label}</span>
          {detail && <span className="block text-[14px] leading-snug opacity-80">{detail}</span>}
        </span>
        <span className="slate-num min-w-[110px] text-[clamp(22px,5vw,30px)]">{value}</span>
      </div>
      {(k || extra) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {k && ids[k].length > 0 && (
            <button type="button" className="btn btn-ondark btn-sm !min-h-10" aria-expanded={line === k} onClick={() => setLine(line === k ? null : k)}>
              See names
            </button>
          )}
          {extra}
        </div>
      )}
      {k && line === k && (
        <ul className="mt-2 flex flex-col gap-1.5 rounded-xl bg-white/10 p-2">
          {ids[k].slice(0, 30).map((id) => {
            const st = d.byId.get(id);
            if (!st) return null;
            const c = chipsFor(st)[0];
            const churn = slate.churn.find((x) => x.st.m.id === id);
            return (
              <li key={id} className="flex flex-wrap items-center gap-2 text-[15px]">
                <span className="font-semibold">{st.m.name}</span>
                {c && <Chip {...c} />}
                {churn && <span className="text-[13px] opacity-80">{churn.why}</span>}
                <Link href={`${base}/desk?m=${id}${mode === "demo" && snap.branch.code === "LV" ? "&b=LV" : ""}`} className="underline">
                  Open
                </Link>
                {k === "churn" &&
                  (mode === "live" ? (
                    <a className="underline" href={`tel:+91${st.m.phone}`}>
                      Call
                    </a>
                  ) : null)}
                {k === "churn" && (
                  <button
                    type="button"
                    className="btn btn-ondark btn-sm !min-h-8"
                    onClick={() => {
                      store.run("churn.dismiss", { id: uid(), memberId: id, reason: "called", days: 7 });
                      store.note(`Marked as called: ${st.m.name}`, "ink");
                    }}
                  >
                    Called
                  </button>
                )}
                {k === "lapsed" && st.term && (
                  <select aria-label={`Why ${st.m.name} left`} className="rounded-lg border-2 border-[var(--cream)] bg-[var(--slate)] px-2 py-1 text-[14px] text-[var(--cream)]" value={st.term.lapseReason ?? ""} onChange={(e) => store.run("lapse.reason", { membershipId: st.term!.id, reason: e.target.value })}>
                    <option value="">Why did they leave?</option>
                    <option value="moved">Moved away</option>
                    <option value="cost">Cost</option>
                    <option value="joined another gym">Joined another gym</option>
                    <option value="injury">Injury</option>
                    <option value="unknown">Not known</option>
                  </select>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );

  return (
    <AppScreen screen="report" title="Owner report" sentence={sentence} vignette="report">
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-3 py-4 md:px-6">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Branch">
          <Link href={mode === "demo" ? "/demo/o" : "/o"} className="btn btn-sm !min-h-11" role="tab" aria-selected={false}>
            All branches
          </Link>
          {snap.branches.map((b) => (
            <Link key={b.id} href={mode === "demo" ? `/demo/report${lv(b.code)}` : `/g/${b.id}/report`} className="btn btn-sm !min-h-11" role="tab" aria-selected={b.id === snap.branch.id} aria-pressed={b.id === snap.branch.id}>
              {b.name}
            </Link>
          ))}
        </div>
        {empty ? (
          <div className="panel p-6 text-center">
            <p className="text-[17px] font-semibold">No numbers yet. They appear after your first renewal.</p>
          </div>
        ) : (
          <div className="slate on-dark p-4 sm:p-6">
            <p className="t-sign text-[13px] opacity-80">
              {snap.branch.name} · {fmtDay(today)} · 6:00 AM
            </p>
            <ul className="mt-1">
              {row("today", "Ending today", String(slate.endingToday.length), "")}
              {row("week", "Ending this week", String(slate.endingWeek.length), slate.endingWeekByPlan.map((p) => `${p.plan} ${p.n}`).join(" · "))}
              {row(
                "dues",
                "Owes money",
                rupees(slate.dues.total),
                `${slate.dues.ids.length} members${slate.dues.oldest ? `, oldest since ${fmtDay(slate.dues.oldest.oldestDue)}` : ""}`,
                <Link href={`${base}/fees${lv(snap.branch.code)}`} className="btn btn-ondark btn-sm !min-h-10">
                  Send reminders
                </Link>,
              )}
              {row("yesterday", "Yesterday's takings", rupees(slate.yesterday.total), `cash ${rupees(slate.yesterday.byMode.cash)} · UPI ${rupees(slate.yesterday.byMode.upi_desk + slate.yesterday.byMode.upi_member)} · card ${rupees(slate.yesterday.byMode.card)}${slate.yesterday.byStaff.length ? ` · ${slate.yesterday.byStaff.map((s) => `${s.name} ${rupees(s.amount)}`).join(", ")}` : ""}`)}
              {row(
                "upi",
                "Waiting for money",
                rupees(slate.pendingUpi.total),
                `${slate.pendingUpi.paymentIds.length} UPI ${slate.pendingUpi.paymentIds.length === 1 ? "payment" : "payments"} not yet seen in the bank`,
                slate.pendingUpi.total ? (
                  <CheckNow />
                ) : undefined,
              )}
              {row(null, "Cash drawer last night", dr.state === "matched" ? "Matched" : dr.state === "short" ? rupees(Math.abs(dr.shortfall)) : "–", drawerText)}
              {row("churn", "Regulars who stopped coming", String(slate.churn.length), "Paid up and regular, but not seen lately")}
              {row("renewed", "Renewed last month", `${slate.renewal.renewed} of ${slate.renewal.ended}`, "Renewed within 7 days of their plan ending")}
              {row("lapsed", "Ended, not renewed", String(slate.lapsed.ids.length), "Pick a reason for each, so you learn why people leave")}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (mode === "live") window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, "_blank", "noopener");
              else setShare(true);
            }}
          >
            <Icon name="chat" size={18} /> Share on WhatsApp
          </button>
          <Link href={`${base}/desk${lv(snap.branch.code)}`} className="btn">
            Open the front desk
          </Link>
        </div>
      </div>
      {share && (
        <Sheet title="Share the report" sentence="Demo preview. In your gym this opens WhatsApp with the summary typed." onClose={() => setShare(false)}>
          <p className="rounded-[14px_14px_14px_4px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-[15px]">{summary}</p>
        </Sheet>
      )}
    </AppScreen>
  );
}

/** Opens the shell's "Waiting for money" list; it has to live inside the screen to reach the shell. */
function CheckNow() {
  const { open } = useShell();
  return (
    <button type="button" className="btn btn-ondark btn-sm !min-h-10" onClick={() => open("upi")}>
      Check now
    </button>
  );
}
