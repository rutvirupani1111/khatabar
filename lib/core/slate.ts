// The 6 am slate. Each line carries the exact member ids behind its number.
import { addDays, diffDays, todayIST } from "./dates";
import { derive, termEnd, type MemberState } from "./state";
import type { PayMode, Reminder, Snapshot, Stage } from "./types";

export interface SlateLine {
  key: string;
  ids: string[];
}

export interface Slate {
  today: string;
  endingToday: string[];
  endingWeek: string[];
  endingWeekByPlan: { plan: string; n: number }[];
  dues: { total: number; ids: string[]; oldest: MemberState | null };
  yesterday: { total: number; byMode: Record<PayMode, number>; byStaff: { name: string; amount: number }[]; ids: string[] };
  pendingUpi: { total: number; ids: string[]; paymentIds: string[] };
  drawer: { state: "matched" | "short" | "open" | "none"; shortfall: number; reason: string; staff: string };
  churn: { st: MemberState; daysSince: number; why: string }[];
  renewal: { renewed: number; ended: number; ids: string[] };
  lapsed: { ids: string[] };
  takingsToday: number;
  checkinsToday: number;
}

export function churnRule(st: MemberState, today: string): string | null {
  if (st.status !== "active" && st.status !== "ending") return null;
  // "paid up" means it: anyone who owes belongs on the dues line, not here
  if (st.dues > 0) return null;
  // a rhythm needs a baseline; a fresh import has no visit history yet
  if (st.visitsPrev56 < 6) return null;
  if (st.m.importId && diffDays(today, todayIST(Date.parse(st.m.createdAt))) < 14) return null;
  const since = st.lastVisit ? diffDays(today, st.lastVisit) : st.term ? diffDays(today, st.term.startDate) : 0;
  if (since >= 10) return `No visit for ${since} days`;
  if (st.visitsPrev56 >= 6) {
    const avg = st.visitsPrev56 / 4;
    if (st.visits14 < avg / 2) return `${st.visits14} visits in 14 days, usually ${Math.round(avg)}`;
  }
  return null;
}

export function computeSlate(s: Snapshot, today = todayIST()): Slate {
  const d = derive(s, today);
  const plans = new Map(s.plans.map((p) => [p.id, p]));
  const staff = new Map(s.staff.map((x) => [x.id, x.name]));
  const yest = addDays(today, -1);
  const week = addDays(today, 6);

  const endingToday = d.list.filter((x) => x.endDate === today).map((x) => x.m.id);
  const wk = d.list.filter((x) => x.endDate && x.endDate >= today && x.endDate <= week);
  const byPlan = new Map<string, number>();
  for (const x of wk) byPlan.set(x.plan?.nameEn ?? "No plan", (byPlan.get(x.plan?.nameEn ?? "No plan") ?? 0) + 1);

  const owing = d.list.filter((x) => x.dues > 0);
  const oldest = owing.reduce<MemberState | null>((a, x) => (!a || (x.oldestDue ?? "9") < (a.oldestDue ?? "9") ? x : a), null);

  const dayOf = (iso: string | null) => (iso ? todayIST(Date.parse(iso)) : "");
  // opening balances copied from the old sheet are not takings
  const yPays = s.payments.filter((p) => p.state === "confirmed" && p.mode !== "import" && dayOf(p.confirmedAt) === yest);
  const byMode = { cash: 0, upi_desk: 0, upi_member: 0, card: 0, import: 0 } as Record<PayMode, number>;
  const byStaffM = new Map<string, number>();
  for (const p of yPays) {
    byMode[p.mode] += p.amount;
    const n = staff.get(p.receivedBy ?? p.confirmedBy ?? "") ?? "Member";
    byStaffM.set(n, (byStaffM.get(n) ?? 0) + p.amount);
  }
  const pend = s.payments.filter((p) => p.state === "pending");

  const lastClose = [...s.closes].sort((a, b) => (a.shiftEnd < b.shiftEnd ? 1 : -1))[0];
  const cashSince = lastClose ? lastClose.shiftEnd : "";
  const openCash = s.payments.some((p) => p.state === "confirmed" && p.mode === "cash" && (p.confirmedAt ?? "") > cashSince && dayOf(p.confirmedAt) < today);
  const drawer: Slate["drawer"] = openCash
    ? { state: "open", shortfall: 0, reason: "", staff: "" }
    : lastClose
      ? { state: lastClose.shortfall === 0 ? "matched" : "short", shortfall: lastClose.shortfall, reason: lastClose.reason, staff: staff.get(lastClose.staffId) ?? "" }
      : { state: "none", shortfall: 0, reason: "", staff: "" };

  const dismissed = new Set(s.dismissals.filter((x) => x.untilDate >= today).map((x) => x.memberId));
  const churn = d.list
    .filter((x) => !dismissed.has(x.m.id))
    .map((st) => ({ st, why: churnRule(st, today), daysSince: st.lastVisit ? diffDays(today, st.lastVisit) : 99 }))
    .filter((x): x is { st: MemberState; why: string; daysSince: number } => !!x.why)
    .sort((a, b) => b.daysSince - a.daysSince);

  // Renewal rate for last calendar month, as a fraction.
  const [ty, tm] = today.split("-").map(Number);
  const lm = tm === 1 ? `${ty - 1}-12` : `${ty}-${String(tm - 1).padStart(2, "0")}`;
  let renewed = 0;
  let ended = 0;
  const rIds: string[] = [];
  const terms = s.memberships.filter((m) => m.status === "active" && (plans.get(m.planId)?.kind ?? "time") !== "addon");
  for (const t of terms) {
    const e = termEnd(t, s.freezes);
    if (!e.startsWith(lm)) continue;
    ended++;
    const next = terms.find((n) => n.memberId === t.memberId && n.id !== t.id && n.startDate > t.startDate && n.createdAt.slice(0, 10) <= addDays(e, 7));
    if (next) {
      renewed++;
      rIds.push(t.memberId);
    }
  }

  const todayPays = s.payments.filter((p) => p.state === "confirmed" && p.mode !== "import" && dayOf(p.confirmedAt) === today);
  return {
    today,
    endingToday,
    endingWeek: wk.map((x) => x.m.id),
    endingWeekByPlan: [...byPlan].map(([plan, n]) => ({ plan, n })),
    dues: { total: owing.reduce((a, x) => a + x.dues, 0), ids: owing.map((x) => x.m.id), oldest },
    yesterday: { total: yPays.reduce((a, p) => a + p.amount, 0), byMode, byStaff: [...byStaffM].map(([name, amount]) => ({ name, amount })), ids: [...new Set(yPays.map((p) => p.memberId))] },
    pendingUpi: { total: pend.reduce((a, p) => a + p.amount, 0), ids: [...new Set(pend.map((p) => p.memberId))], paymentIds: pend.map((p) => p.id) },
    drawer,
    churn,
    renewal: { renewed, ended, ids: rIds },
    lapsed: { ids: d.list.filter((x) => x.status === "lapsed").map((x) => x.m.id) },
    takingsToday: todayPays.reduce((a, p) => a + p.amount, 0),
    checkinsToday: s.checkins.filter((c) => c.istDate === today).length,
  };
}

/** The 06:00 job: one reminder per membership per stage. Same code runs in the cron and the demo. */
export function buildReminders(s: Snapshot, today: string, makeId: () => string): { add: Reminder[]; skip: { id: string; state: Reminder["state"]; reason: string }[] } {
  const d = derive(s, today);
  const st = s.branch.settings.stages;
  const add: Reminder[] = [];
  const skip: { id: string; state: Reminder["state"]; reason: string }[] = [];
  const has = new Set(s.reminders.map((r) => `${r.membershipId}|${r.stage}`));
  for (const x of d.list) {
    if (!x.term || x.m.remindersOptOut || x.m.archivedAt) continue;
    const dl = x.daysLeft ?? 0;
    const want: Stage[] = [];
    if (st.pre7?.on && dl === (st.pre7.days || 7)) want.push("pre7");
    if (st.pre3?.on && dl === (st.pre3.days || 3)) want.push("pre3");
    if (st.day0?.on && dl === 0) want.push("day0");
    if (st.post3?.on && dl === -(st.post3.days || 3)) want.push("post3");
    if (st.dues?.on && x.dues > 0 && x.oldestDue && diffDays(today, x.oldestDue) > 3) want.push("dues");
    for (const stage of want) {
      if (has.has(`${x.term.id}|${stage}`)) continue;
      if (x.frozenNow) continue;
      add.push({ id: makeId(), branchId: s.branch.id, membershipId: x.term.id, memberId: x.m.id, stage, dueDate: today, state: "queued", openedBy: null, openedAt: null, skippedReason: "" });
    }
  }
  for (const r of s.reminders) {
    if (r.state !== "queued") continue;
    const x = d.byId.get(r.memberId);
    if (!x) continue;
    if (diffDays(today, r.dueDate) > 3) skip.push({ id: r.id, state: "expired_unsent", reason: "Not sent within 3 days" });
    else if (x.frozenNow) skip.push({ id: r.id, state: "skipped_frozen", reason: "Frozen" });
    else if (r.stage === "dues" ? x.dues === 0 : (x.daysLeft ?? -99) > 7) skip.push({ id: r.id, state: "skipped_paid", reason: "Paid" });
  }
  return { add, skip };
}
