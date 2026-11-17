// The one source for every number. Every list, count, plate and stamp in the app
// reads derive(); a count and the list behind it can never disagree.
import { addDays, diffDays, todayIST } from "./dates";
import type { Freeze, Member, Membership, Plan, PlateKey, Snapshot } from "./types";

export type Status = "none" | "upcoming" | "active" | "frozen" | "ending" | "lapsed";

export interface MemberState {
  m: Member;
  term: Membership | null; // covers today, else the last one that ended, else the next one
  plan: Plan | null;
  /** the plan of the term the paid-up chain ends on (after a renewal, the new plan) */
  endPlan: Plan | null;
  /** the day they joined: their first term's start (an imported member joined long before the import), else the day they were added */
  joinedOn: string;
  termEnd: string | null; // this term's end, freezes included
  endDate: string | null; // end of the paid-up chain (a renewal extends it)
  daysLeft: number | null; // endDate - today; negative means overdue days
  totalDays: number;
  plate: PlateKey;
  status: Status;
  frozenNow: Freeze | null;
  freezeRequest: Freeze | null;
  dues: number;
  pending: number;
  oldestDue: string | null;
  lastVisit: string | null;
  lastVisitAt: string | null;
  visitsToday: string | null; // time of today's first check-in
  visits14: number;
  visitsPrev56: number;
  creditThisMonth: number;
}

export interface Derived {
  today: string;
  list: MemberState[];
  byId: Map<string, MemberState>;
  byNo: Map<string, MemberState>;
}

export function plateFor(daysLeft: number | null): PlateKey {
  if (daysLeft == null) return "iron";
  if (daysLeft <= -15) return "p25";
  if (daysLeft <= -1) return "p20";
  if (daysLeft <= 3) return "p15";
  if (daysLeft <= 7) return "p10";
  if (daysLeft <= 14) return "p5";
  return "iron";
}

export const PLATE_ORDER: PlateKey[] = ["p25", "p20", "p15", "p10", "p5", "iron"];

export function frozenDaysFor(ms: Membership, freezes: Freeze[]) {
  return freezes.filter((f) => f.membershipId === ms.id && f.state === "approved").reduce((s, f) => s + f.days, 0);
}

export function termEnd(ms: Membership, freezes: Freeze[]) {
  return addDays(ms.baseEndDate, frozenDaysFor(ms, freezes));
}

const cache = new WeakMap<Snapshot, Map<string, Derived>>();

export function derive(s: Snapshot, today = todayIST()): Derived {
  let per = cache.get(s);
  if (!per) cache.set(s, (per = new Map()));
  const hit = per.get(today);
  if (hit) return hit;

  const plans = new Map(s.plans.map((p) => [p.id, p]));
  const msBy = new Map<string, Membership[]>();
  for (const ms of s.memberships) {
    if (ms.status === "void") continue;
    const arr = msBy.get(ms.memberId) ?? [];
    arr.push(ms);
    msBy.set(ms.memberId, arr);
  }
  const payBy = new Map<string, typeof s.payments>();
  for (const p of s.payments) {
    const arr = payBy.get(p.memberId) ?? [];
    arr.push(p);
    payBy.set(p.memberId, arr);
  }
  const frBy = new Map<string, Freeze[]>();
  for (const f of s.freezes) {
    const arr = frBy.get(f.memberId) ?? [];
    arr.push(f);
    frBy.set(f.memberId, arr);
  }
  const ciBy = new Map<string, typeof s.checkins>();
  for (const c of s.checkins) {
    const arr = ciBy.get(c.memberId) ?? [];
    arr.push(c);
    ciBy.set(c.memberId, arr);
  }
  const monthPrefix = today.slice(0, 7);
  const d14 = addDays(today, -13);
  const d70 = addDays(today, -69);

  const list: MemberState[] = [];
  for (const m of s.members) {
    if (m.archivedAt) continue;
    const freezes = frBy.get(m.id) ?? [];
    const all = (msBy.get(m.id) ?? []).filter((x) => x.status === "active");
    const terms = all.filter((x) => (plans.get(x.planId)?.kind ?? "time") !== "addon").sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    const ends = new Map(terms.map((t) => [t.id, termEnd(t, freezes)]));
    let term: Membership | null = terms.find((t) => t.startDate <= today && ends.get(t.id)! >= today) ?? null;
    if (!term) {
      const past = terms.filter((t) => ends.get(t.id)! < today);
      term = past[past.length - 1] ?? terms.find((t) => t.startDate > today) ?? null;
    }
    let endDate: string | null = null;
    let endTerm: Membership | null = term;
    if (term) {
      endDate = ends.get(term.id)!;
      let grew = true;
      while (grew) {
        grew = false;
        for (const t of terms) {
          const e = ends.get(t.id)!;
          if (t.startDate <= addDays(endDate, 1) && e > endDate) {
            endDate = e;
            endTerm = t;
            grew = true;
          }
        }
      }
    }
    const tEnd = term ? ends.get(term.id)! : null;
    const daysLeft = endDate ? diffDays(endDate, today) : null;
    const frozenNow = freezes.find((f) => f.state === "approved" && f.fromDate <= today && f.toDate >= today) ?? null;
    const freezeRequest = freezes.find((f) => f.state === "requested") ?? null;
    let status: Status = "none";
    if (term) {
      if (term.startDate > today) status = "upcoming";
      else if (daysLeft! < 0) status = "lapsed";
      else if (frozenNow) status = "frozen";
      else if (daysLeft! <= 7) status = "ending";
      else status = "active";
    }

    const pays = payBy.get(m.id) ?? [];
    let owed = 0;
    let oldestDue: string | null = null;
    for (const ms of msBy.get(m.id) ?? []) {
      if (ms.status !== "active") continue;
      const bill = ms.price - ms.discount + ms.joiningFee;
      const paid = pays.filter((p) => p.membershipId === ms.id && p.state === "confirmed").reduce((a, p) => a + p.amount, 0);
      if (bill - paid > 0) {
        owed += bill - paid;
        if (!oldestDue || ms.startDate < oldestDue) oldestDue = ms.startDate;
      } else owed += bill - paid;
    }
    owed -= pays.filter((p) => !p.membershipId && p.state === "confirmed").reduce((a, p) => a + p.amount, 0);
    const pending = pays.filter((p) => p.state === "pending").reduce((a, p) => a + p.amount, 0);

    const cis = ciBy.get(m.id) ?? [];
    let lastVisitAt: string | null = null;
    let visits14 = 0;
    let visitsPrev56 = 0;
    let visitsToday: string | null = null;
    let credit = 0;
    for (const c of cis) {
      if (!lastVisitAt || c.at > lastVisitAt) lastVisitAt = c.at;
      if (c.istDate >= d14) visits14++;
      else if (c.istDate >= d70) visitsPrev56++;
      if (c.istDate === today && (!visitsToday || c.at < visitsToday)) visitsToday = c.at;
      if (c.onCredit && c.istDate.startsWith(monthPrefix)) credit++;
    }
    const lastVisit = lastVisitAt ? cis.reduce((a, c) => (c.istDate > a ? c.istDate : a), "") : null;

    list.push({
      m,
      term,
      plan: term ? plans.get(term.planId) ?? null : null,
      endPlan: endTerm ? plans.get(endTerm.planId) ?? null : null,
      joinedOn: [terms[0]?.startDate, m.createdAt ? todayIST(Date.parse(m.createdAt)) : ""].filter(Boolean).sort()[0] ?? today,
      termEnd: tEnd,
      endDate,
      daysLeft,
      totalDays: term && tEnd ? diffDays(tEnd, term.startDate) + 1 : 0,
      plate: plateFor(daysLeft),
      status,
      frozenNow,
      freezeRequest,
      dues: Math.max(0, owed),
      pending,
      oldestDue: owed > 0 ? oldestDue : null,
      lastVisit,
      lastVisitAt,
      visitsToday,
      visits14,
      visitsPrev56,
      creditThisMonth: credit,
    });
  }
  list.sort(urgency);
  const out: Derived = { today, list, byId: new Map(list.map((x) => [x.m.id, x])), byNo: new Map(list.map((x) => [x.m.memberNo.toUpperCase(), x])) };
  per.set(today, out);
  return out;
}

/** "Monthly", or "Monthly then Yearly" once a renewal has queued a different plan after this term. */
export function planLabel(st: MemberState, lang: "en" | "hi" = "en") {
  const nm = (p: Plan | null) => (p ? (lang === "hi" ? p.nameHi || p.nameEn : p.nameEn) : "");
  if (!st.plan) return "";
  if (st.endPlan && st.endPlan.id !== st.plan.id) return `${nm(st.plan)} ${lang === "hi" ? "फिर" : "then"} ${nm(st.endPlan)}`;
  return nm(st.plan);
}

/** Register order: what needs the desk first. */
function urgency(a: MemberState, b: MemberState) {
  const ra = PLATE_ORDER.indexOf(a.plate);
  const rb = PLATE_ORDER.indexOf(b.plate);
  if (ra !== rb) return ra - rb;
  if (b.dues !== a.dues) return b.dues - a.dues;
  return a.m.name.localeCompare(b.m.name);
}

/** Where a renewal starts, and the words that explain it on the back of the card. */
export function renewalStart(st: MemberState | undefined, today: string, backdate: boolean): { start: string; rule: string } {
  if (!st?.endDate) return { start: today, rule: "today" };
  const over = diffDays(today, st.endDate);
  if (over <= 0) return { start: addDays(st.endDate, 1), rule: "after" };
  if (over <= 7 && backdate) return { start: addDays(st.endDate, 1), rule: "lapse" };
  return { start: today, rule: "today" };
}

export interface FreezeCheck {
  ok: boolean;
  usedCount: number;
  usedDays: number;
  maxCount: number;
  maxDays: number;
  minDays: number;
  maxNow: number; // most days this freeze may take
  why: string;
}

export function freezeRules(s: Snapshot, st: MemberState, days: number, ignoreId?: string): FreezeCheck {
  const plan = st.plan;
  const maxCount = plan?.freezeMaxCount ?? 0;
  const maxDays = plan?.freezeMaxDays ?? 0;
  const minDays = plan?.freezeMinDays ?? 1;
  const used = st.term ? s.freezes.filter((f) => f.membershipId === st.term!.id && f.id !== ignoreId && (f.state === "approved" || f.state === "requested")) : [];
  const usedDays = used.reduce((a, f) => a + f.days, 0);
  const maxNow = Math.max(0, maxDays - usedDays);
  const name = plan?.nameEn ?? "this plan";
  let why = "";
  if (!st.term || st.status === "lapsed" || st.status === "none") why = "No running term to freeze";
  else if (maxCount === 0 || maxDays === 0) why = `${name} has no freezes`;
  else if (used.length >= maxCount) why = `${maxCount} of ${maxCount} freezes used on ${name}`;
  else if (days > maxNow) why = `Max ${maxDays} days on ${name}`;
  else if (days < minDays) why = `At least ${minDays} days per freeze`;
  return { ok: !why, usedCount: used.length, usedDays, maxCount, maxDays, minDays, maxNow, why };
}

export function isRushHour(rush: [string, string][], ms = Date.now()) {
  const d = new Date(ms + 330 * 60000);
  const hm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return rush.some(([a, b]) => hm >= a && hm < b);
}
