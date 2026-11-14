// Every change is an operation. applyOp is pure: the browser runs it for the
// optimistic line, the server runs the same code against its own rows, so the
// desk and the database can never compute a renewal differently.
import { addDays, diffDays, fyLabel, istHour, planEnd, todayIST } from "./dates";
import { cleanPhone } from "./money";
import { derive, freezeRules, renewalStart } from "./state";
import type { Actor, Member, Membership, Mutation, Payment, Reminder, Role, Snapshot, TableName } from "./types";

export interface Op {
  id: string; // client_op_id, unique, makes retries harmless
  kind: string;
  at: string; // ISO time the desk made it
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export type OpActor = Omit<Actor, "role"> & { role: Role | "member"; memberId?: string };

export interface ApplyCtx {
  /** Checks a manager/owner PIN typed at the desk. Server: bcrypt-style hash. Demo: seed PINs. */
  checkPin?: (pin: string, roles: Role[]) => string | null; // returns staff id
  now?: number;
}

export interface Applied {
  muts: Mutation[];
  error?: string;
  note?: string;
}

const STAFF: Role[] = ["owner", "manager", "desk"];
const MGR: Role[] = ["owner", "manager"];
const ALL: Role[] = ["owner", "manager", "desk", "trainer"];

const CAN: Record<string, (Role | "member")[]> = {
  checkin: [...ALL, "member"],
  "member.add": STAFF,
  "member.update": [...STAFF, "member"],
  "member.archive": MGR,
  "member.anonymise": ["owner"],
  renew: [...STAFF, "member"],
  pay: [...STAFF, "member"],
  "payment.confirm": STAFF,
  "payment.reject": STAFF,
  "payment.reverse": STAFF,
  "freeze.set": [...STAFF, "member"],
  "freeze.decide": STAFF,
  "freeze.cancel": [...STAFF, "member"],
  "freeze.end": STAFF,
  "reminder.add": STAFF,
  "reminder.mark": STAFF,
  "close.save": STAFF,
  "close.reopen": STAFF,
  "churn.dismiss": STAFF,
  "lapse.reason": STAFF,
  "plan.upsert": ["owner"],
  "staff.upsert": ["owner"],
  "template.upsert": MGR,
  "branch.update": ["owner"],
  "task.add": [...STAFF, "member"],
  "task.done": MGR,
  "pt.log": ALL,
};

export const OP_KINDS = Object.keys(CAN);

const ins = (table: TableName, row: Record<string, unknown> & { id: string }): Mutation => ({ table, type: "insert", row });
const upd = (table: TableName, row: Record<string, unknown> & { id: string }): Mutation => ({ table, type: "update", row });
const fail = (error: string): Applied => ({ muts: [], error });
const pad4 = (n: number) => String(n).padStart(4, "0");

function receiptNo(s: Snapshot, bump: number) {
  return `${s.branch.code}/${fyLabel(todayIST())}/${pad4(s.branch.receiptSeq + bump)}`;
}

export function applyOp(s: Snapshot, op: Op, actor: OpActor, ctx: ApplyCtx = {}): Applied {
  const allowed = CAN[op.kind];
  if (!allowed) return fail(`Unknown change "${op.kind}"`);
  if (!allowed.includes(actor.role)) return fail("Your role cannot do this. Ask a manager.");
  const now = ctx.now ?? Date.now();
  const nowIso = new Date(now).toISOString();
  const today = todayIST(now);
  const d = derive(s, today);
  const p = op.payload ?? {};
  const B = s.branch;
  const base = { orgId: s.org.id, branchId: B.id };
  const memberOnly = (memberId: string) => actor.role !== "member" || actor.memberId === memberId;

  switch (op.kind) {
    case "member.add": {
      const phone = cleanPhone(p.phone);
      if (!phone) return fail("Phone must be 10 digits starting with 6, 7, 8 or 9");
      const dup = s.members.find((m) => m.phone === phone && !m.archivedAt && !m.anonymisedAt);
      if (dup) return fail(`Already a member: ${dup.memberNo} ${dup.name}`);
      const name = String(p.name ?? "").trim();
      if (name.length < 2) return fail("Write the member's name");
      const seq = B.memberSeq + 1;
      const row: Member = {
        id: p.id,
        ...base,
        memberNo: `${B.code}-${pad4(seq)}`,
        name,
        phone,
        altPhone: cleanPhone(p.altPhone) ?? "",
        emergency: String(p.emergency ?? ""),
        gender: String(p.gender ?? ""),
        dob: p.dob ?? null,
        photo: p.photo ?? null,
        notes: String(p.notes ?? ""),
        source: p.source ?? "walk-in",
        importId: p.importId ?? null,
        waConsentAt: p.consent ? nowIso : null,
        remindersOptOut: false,
        weeklyTarget: 3,
        trainerId: p.trainerId ?? null,
        archivedAt: null,
        anonymisedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      return { muts: [ins("members", row as never), upd("branch", { id: B.id, memberSeq: seq })] };
    }

    case "member.update": {
      const m = s.members.find((x) => x.id === p.id);
      if (!m || !memberOnly(m.id)) return fail("Member not found");
      const keys = actor.role === "member" ? ["weeklyTarget", "remindersOptOut", "photo"] : ["name", "phone", "altPhone", "emergency", "gender", "dob", "photo", "notes", "weeklyTarget", "remindersOptOut", "trainerId", "waConsentAt"];
      const row: Record<string, unknown> & { id: string } = { id: m.id, updatedAt: nowIso };
      for (const k of keys) if (k in (p.fields ?? {})) row[k] = p.fields[k];
      if ("phone" in row) {
        const ph = cleanPhone(row.phone as string);
        if (!ph) return fail("Phone must be 10 digits starting with 6, 7, 8 or 9");
        if (s.members.some((x) => x.id !== m.id && x.phone === ph && !x.archivedAt)) return fail("Another member has this phone");
        row.phone = ph;
      }
      if ("weeklyTarget" in row) row.weeklyTarget = Math.min(6, Math.max(2, Number(row.weeklyTarget) || 3));
      return { muts: [upd("members", row)] };
    }

    case "member.archive": {
      const m = s.members.find((x) => x.id === p.id);
      if (!m) return fail("Member not found");
      return { muts: [upd("members", { id: m.id, archivedAt: p.archive === false ? null : nowIso, updatedAt: nowIso })] };
    }

    case "member.anonymise": {
      const m = s.members.find((x) => x.id === p.id);
      if (!m) return fail("Member not found");
      const tag = m.id.replace(/-/g, "").slice(-6);
      return { muts: [upd("members", { id: m.id, name: `Erased ${tag}`, phone: `0000${tag.replace(/\D/g, "0").padEnd(6, "0")}`.slice(0, 10), altPhone: "", emergency: "", photo: null, notes: "", dob: null, anonymisedAt: nowIso, archivedAt: nowIso, updatedAt: nowIso })] };
    }

    case "renew": {
      const st = d.byId.get(p.memberId);
      const member = s.members.find((m) => m.id === p.memberId);
      if (!member || !memberOnly(member.id)) return fail("Member not found");
      const plan = s.plans.find((x) => x.id === p.planId && x.active);
      if (!plan) return fail("Pick a plan");
      const discount = Math.max(0, Math.round(Number(p.discount) || 0));
      if (discount > plan.price) return fail("Discount is more than the price");
      let approver: string | null = null;
      if (discount > (plan.price * B.settings.discountLimitPct) / 100 && actor.role !== "owner" && actor.role !== "manager") {
        approver = p.approverPin && ctx.checkPin ? ctx.checkPin(String(p.approverPin), MGR) : null;
        if (!approver) return fail(`Discount above ${B.settings.discountLimitPct}% needs a manager PIN`);
      }
      const { start } = p.startDate && actor.role !== "member" ? { start: String(p.startDate) } : renewalStart(st, today, B.settings.backdateWithin7);
      const firstEver = !s.memberships.some((x) => x.memberId === member.id && x.status !== "void");
      const isMember = actor.role === "member";
      const main: Membership = {
        id: p.membershipId,
        ...base,
        memberId: member.id,
        planId: plan.id,
        addonOf: null,
        startDate: start,
        baseEndDate: planEnd(start, plan.months, plan.days),
        frozenDays: 0,
        price: plan.price,
        discount,
        joiningFee: firstEver ? plan.joiningFee : 0,
        status: isMember ? "requested" : "active",
        lapseReason: null,
        sessionsLeft: plan.kind === "sessions" ? plan.sessions : null,
        createdBy: actor.staffId,
        createdAt: nowIso,
      };
      const muts: Mutation[] = [ins("memberships", main as never)];
      if (p.ptPlanId && !isMember) {
        const pt = s.plans.find((x) => x.id === p.ptPlanId);
        if (pt)
          muts.push(
            ins("memberships", {
              ...main,
              id: p.ptMembershipId,
              planId: pt.id,
              addonOf: main.id,
              baseEndDate: planEnd(start, pt.months, pt.days || (pt.months ? 0 : 30)),
              price: pt.price,
              discount: 0,
              joiningFee: 0,
              sessionsLeft: pt.kind === "sessions" ? pt.sessions : null,
            } as never),
          );
      }
      const pm = paymentsFor(s, p.payments ?? [], member.id, main.id, actor, nowIso, isMember);
      if (pm.error) return fail(pm.error);
      muts.push(...pm.muts);
      return { muts, note: approver ? `Discount approved by ${s.staff.find((x) => x.id === approver)?.name ?? "manager"}` : undefined };
    }

    case "pay": {
      const member = s.members.find((m) => m.id === p.memberId);
      if (!member || !memberOnly(member.id)) return fail("Member not found");
      const pm = paymentsFor(s, p.payments ?? [], member.id, p.membershipId ?? null, actor, nowIso, actor.role === "member");
      if (pm.error) return fail(pm.error);
      return { muts: pm.muts };
    }

    case "payment.confirm": {
      const pay = s.payments.find((x) => x.id === p.id);
      if (!pay) return fail("Payment not found");
      if (pay.state !== "pending") return fail("Already settled");
      const muts: Mutation[] = [upd("payments", { id: pay.id, state: "confirmed", confirmedBy: actor.staffId, confirmedAt: nowIso, utrLast4: String(p.utr ?? pay.utrLast4 ?? "").slice(-4), receiptNo: receiptNo(s, 1) }), upd("branch", { id: B.id, receiptSeq: B.receiptSeq + 1 })];
      const ms = pay.membershipId ? s.memberships.find((x) => x.id === pay.membershipId) : null;
      if (ms && ms.status === "requested") {
        const st = d.byId.get(ms.memberId);
        const { start } = renewalStart(st, today, B.settings.backdateWithin7);
        const plan = s.plans.find((x) => x.id === ms.planId);
        muts.push(upd("memberships", { id: ms.id, status: "active", startDate: start, baseEndDate: plan ? planEnd(start, plan.months, plan.days) : ms.baseEndDate }));
      }
      return { muts };
    }

    case "payment.reject": {
      const pay = s.payments.find((x) => x.id === p.id);
      if (!pay || pay.state !== "pending") return fail("Nothing pending to reject");
      const muts: Mutation[] = [upd("payments", { id: pay.id, state: "rejected", confirmedBy: actor.staffId, confirmedAt: nowIso })];
      const ms = pay.membershipId ? s.memberships.find((x) => x.id === pay.membershipId) : null;
      if (ms && ms.status === "requested") muts.push(upd("memberships", { id: ms.id, status: "void" }));
      return { muts };
    }

    case "payment.reverse": {
      const pay = s.payments.find((x) => x.id === p.id);
      if (!pay) return fail("Payment not found");
      if (s.payments.some((x) => x.reversesId === pay.id)) return fail("Already reversed");
      const fresh = now - Date.parse(pay.createdAt) < 60_000 && pay.receivedBy === actor.staffId;
      let by = actor.staffId;
      if (!(p.undo && fresh) && actor.role === "desk") {
        by = p.approverPin && ctx.checkPin ? ctx.checkPin(String(p.approverPin), MGR) : null;
        if (!by) return fail("A reversal needs a manager or owner PIN");
      }
      const muts: Mutation[] = [];
      if (pay.state === "pending") muts.push(upd("payments", { id: pay.id, state: "rejected", confirmedBy: by, confirmedAt: nowIso }));
      else
        muts.push(
          ins("payments", {
            ...pay,
            id: p.reversalId,
            amount: -pay.amount,
            state: "confirmed",
            reversesId: pay.id,
            receivedBy: actor.staffId,
            confirmedBy: by,
            confirmedAt: nowIso,
            receiptNo: "",
            createdAt: nowIso,
          } as never),
        );
      if (p.undo && fresh && pay.membershipId) {
        const ms = s.memberships.find((x) => x.id === pay.membershipId);
        if (ms && now - Date.parse(ms.createdAt) < 60_000) {
          muts.push(upd("memberships", { id: ms.id, status: "void" }));
          for (const a of s.memberships.filter((x) => x.addonOf === ms.id)) muts.push(upd("memberships", { id: a.id, status: "void" }));
        }
      }
      return { muts };
    }

    case "checkin": {
      const member = s.members.find((m) => m.id === p.memberId);
      if (!member || !memberOnly(member.id)) return fail("Member not found");
      const at = p.at ?? op.at ?? nowIso;
      const ms = Date.parse(at);
      const date = todayIST(ms);
      const hour = istHour(ms);
      const dup = s.checkins.find((c) => c.memberId === member.id && c.istDate === date && c.istHour === hour);
      if (dup) return { muts: [], note: "Already in this hour" };
      if (p.onCredit) {
        const st = d.byId.get(member.id);
        if ((st?.creditThisMonth ?? 0) >= B.settings.creditLimit) return fail(`Credit entries used up this month (${B.settings.creditLimit})`);
      }
      return { muts: [ins("checkins", { id: p.id, branchId: B.id, memberId: member.id, at, istDate: date, istHour: hour, method: p.method ?? "desk_manual", staffId: actor.staffId, onCredit: !!p.onCredit })] };
    }

    case "freeze.set": {
      const st = d.byId.get(p.memberId);
      if (!st || !st.term || !memberOnly(st.m.id)) return fail("No running term to freeze");
      const days = Math.round(Number(p.days));
      const check = freezeRules(s, st, days);
      if (!check.ok) return fail(check.why);
      const from = String(p.fromDate ?? today);
      if (from < today && actor.role === "member") return fail("A freeze cannot start in the past");
      const needsOk = actor.role === "member" && B.settings.freezeApproval;
      const row = {
        id: p.id,
        branchId: B.id,
        membershipId: st.term.id,
        memberId: st.m.id,
        fromDate: from,
        toDate: addDays(from, days - 1),
        days,
        reason: String(p.reason ?? "Other").slice(0, 80),
        state: needsOk ? "requested" : "approved",
        requestedBy: actor.role === "member" ? "member" : "staff",
        decidedBy: needsOk ? null : actor.staffId,
        createdAt: nowIso,
      };
      const muts: Mutation[] = [ins("freezes", row)];
      if (!needsOk) muts.push(upd("memberships", { id: st.term.id, frozenDays: st.term.frozenDays + days }));
      return { muts };
    }

    case "freeze.decide": {
      const f = s.freezes.find((x) => x.id === p.id);
      if (!f || f.state !== "requested") return fail("Nothing waiting");
      const muts: Mutation[] = [upd("freezes", { id: f.id, state: p.state === "approved" ? "approved" : "rejected", decidedBy: actor.staffId })];
      if (p.state === "approved") {
        const ms = s.memberships.find((x) => x.id === f.membershipId);
        if (ms) muts.push(upd("memberships", { id: ms.id, frozenDays: ms.frozenDays + f.days }));
      }
      return { muts };
    }

    case "freeze.cancel": {
      const f = s.freezes.find((x) => x.id === p.id);
      if (!f || f.state === "cancelled" || f.state === "rejected") return fail("Nothing to undo");
      if (!memberOnly(f.memberId)) return fail("Not yours");
      const muts: Mutation[] = [upd("freezes", { id: f.id, state: "cancelled" })];
      const ms = s.memberships.find((x) => x.id === f.membershipId);
      if (ms && f.state === "approved") muts.push(upd("memberships", { id: ms.id, frozenDays: Math.max(0, ms.frozenDays - f.days) }));
      return { muts };
    }

    case "freeze.end": {
      const f = s.freezes.find((x) => x.id === p.id);
      if (!f || f.state !== "approved") return fail("No freeze running");
      const used = Math.max(0, diffDays(today, f.fromDate));
      const back = f.days - used;
      const muts: Mutation[] = [upd("freezes", used === 0 ? { id: f.id, state: "cancelled" } : { id: f.id, toDate: addDays(today, -1), days: used })];
      const ms = s.memberships.find((x) => x.id === f.membershipId);
      if (ms) muts.push(upd("memberships", { id: ms.id, frozenDays: Math.max(0, ms.frozenDays - back) }));
      return { muts, note: `${back} unused days given back` };
    }

    case "reminder.add": {
      const muts: Mutation[] = [];
      for (const r of (p.reminders ?? []) as Reminder[]) {
        if (r.stage !== "manual" && r.stage !== "missed" && s.reminders.some((x) => x.membershipId === r.membershipId && x.stage === r.stage)) continue;
        if (s.reminders.some((x) => x.id === r.id)) continue;
        muts.push(ins("reminders", { id: r.id, branchId: B.id, membershipId: r.membershipId ?? null, memberId: r.memberId, stage: r.stage, dueDate: r.dueDate ?? today, state: "queued", openedBy: null, openedAt: null, skippedReason: "" }));
      }
      return { muts };
    }

    case "reminder.mark": {
      const r = s.reminders.find((x) => x.id === p.id);
      if (!r) return fail("Reminder not found");
      const row: Record<string, unknown> & { id: string } = { id: r.id, state: p.state };
      if (p.state === "opened") Object.assign(row, { openedBy: actor.staffId, openedAt: nowIso });
      if (p.state === "queued") Object.assign(row, { openedBy: null, openedAt: null, skippedReason: "" });
      if (String(p.state).startsWith("skipped")) row.skippedReason = String(p.reason ?? "").slice(0, 120);
      return { muts: [upd("reminders", row)] };
    }

    case "close.save": {
      const counted = Math.round(Number(p.counted) || 0);
      const expected = Math.round(Number(p.expected) || 0);
      const short = expected - counted;
      if (short !== 0 && String(p.reason ?? "").trim().length < 8) return fail("Write a reason of at least 8 characters");
      return {
        muts: [
          ins("closes", { id: p.id, branchId: B.id, staffId: actor.staffId, shiftStart: p.shiftStart ?? nowIso, shiftEnd: nowIso, counts: p.counts ?? {}, expected, counted, shortfall: short, upiTotal: Number(p.upiTotal) || 0, reason: String(p.reason ?? ""), reopenedBy: null, reopenedAt: null }),
        ],
      };
    }

    case "close.reopen": {
      const c = s.closes.find((x) => x.id === p.id);
      if (!c) return fail("Close not found");
      const fresh = now - Date.parse(c.shiftEnd) < 10_000 && c.staffId === actor.staffId;
      let by = actor.staffId;
      if (!fresh && actor.role === "desk") {
        by = p.approverPin && ctx.checkPin ? ctx.checkPin(String(p.approverPin), MGR) : null;
        if (!by) return fail("Only an owner or manager can reopen a closed shift");
      }
      return { muts: [upd("closes", { id: c.id, reopenedBy: by, reopenedAt: nowIso })] };
    }

    case "churn.dismiss":
      return { muts: [ins("dismissals", { id: p.id, branchId: B.id, memberId: p.memberId, reason: String(p.reason ?? "").slice(0, 80), untilDate: addDays(today, Number(p.days) || 21), by: actor.staffId })] };

    case "lapse.reason": {
      const ms = s.memberships.find((x) => x.id === p.membershipId);
      if (!ms) return fail("Term not found");
      return { muts: [upd("memberships", { id: ms.id, lapseReason: String(p.reason).slice(0, 40) })] };
    }

    case "plan.upsert": {
      const pl = p.plan;
      if (!pl?.id || !pl.nameEn) return fail("A plan needs a name");
      const exists = s.plans.some((x) => x.id === pl.id);
      return { muts: [exists ? upd("plans", pl) : ins("plans", { ...pl, orgId: s.org.id, branchId: pl.branchId === undefined ? B.id : pl.branchId })] };
    }

    case "staff.upsert": {
      const st = p.staff;
      if (!st?.id || !st.name) return fail("Staff need a name");
      const exists = s.staff.some((x) => x.id === st.id);
      const row = { id: st.id, name: st.name, role: st.role, active: st.active !== false };
      return { muts: [exists ? upd("staff", row) : ins("staff", { ...row, orgId: s.org.id, branchId: B.id })] };
    }

    case "template.upsert": {
      const t = p.template;
      if (!t?.id || !t.body) return fail("Template is empty");
      const exists = s.templates.some((x) => x.id === t.id);
      return { muts: [exists ? upd("templates", { id: t.id, body: String(t.body).slice(0, 900) }) : ins("templates", { ...t, orgId: s.org.id })] };
    }

    case "branch.update": {
      const f = p.fields ?? {};
      const row: Record<string, unknown> & { id: string } = { id: B.id };
      for (const k of ["name", "city", "vpa", "payeeName", "gstin", "color", "settings"]) if (k in f) row[k] = k === "settings" ? { ...B.settings, ...f.settings } : f[k];
      return { muts: [upd("branch", row)] };
    }

    case "task.add":
      if (!memberOnly(p.memberId)) return fail("Not yours");
      return { muts: [ins("tasks", { id: p.id, branchId: B.id, memberId: p.memberId, kind: p.kind === "erase" ? "erase" : "export", createdAt: nowIso, doneAt: null })] };

    case "task.done":
      return { muts: [upd("tasks", { id: p.id, doneAt: nowIso })] };

    case "pt.log": {
      const ms = s.memberships.find((x) => x.id === p.membershipId);
      if (!ms || ms.sessionsLeft == null) return fail("No PT pack");
      if (ms.sessionsLeft <= 0) return fail("No sessions left");
      return { muts: [upd("memberships", { id: ms.id, sessionsLeft: ms.sessionsLeft - 1 })] };
    }
  }
  return fail("Unknown change");
}

function paymentsFor(s: Snapshot, list: Partial<Payment>[], memberId: string, membershipId: string | null, actor: OpActor, nowIso: string, isMember: boolean): Applied {
  const muts: Mutation[] = [];
  let bump = 0;
  for (const raw of list) {
    const amount = Math.round(Number(raw.amount) || 0);
    if (amount <= 0) continue;
    const mode = isMember ? "upi_member" : (raw.mode as Payment["mode"]);
    if (!["cash", "upi_desk", "upi_member", "card"].includes(mode)) return fail("Unknown payment mode");
    // Cash is confirmed by the person holding it. UPI stays pending until the desk sees the credit.
    const confirmed = !isMember && (mode === "cash" || mode === "card" || raw.state === "confirmed");
    if (confirmed) bump++;
    const row: Payment = {
      id: raw.id!,
      orgId: s.org.id,
      branchId: s.branch.id,
      memberId,
      membershipId: raw.membershipId ?? membershipId,
      amount,
      mode,
      state: confirmed ? "confirmed" : "pending",
      utrLast4: String(raw.utrLast4 ?? "").replace(/\D/g, "").slice(-4),
      receivedBy: isMember ? null : actor.staffId,
      confirmedBy: confirmed ? actor.staffId : null,
      confirmedAt: confirmed ? nowIso : null,
      reversesId: null,
      receiptNo: confirmed ? receiptNo(s, bump) : "",
      createdAt: nowIso,
    };
    muts.push(ins("payments", row as never));
  }
  if (bump) muts.push(upd("branch", { id: s.branch.id, receiptSeq: s.branch.receiptSeq + bump }));
  return { muts };
}

const KEY: Record<TableName, keyof Snapshot> = {
  members: "members",
  memberships: "memberships",
  payments: "payments",
  freezes: "freezes",
  checkins: "checkins",
  reminders: "reminders",
  closes: "closes",
  dismissals: "dismissals",
  plans: "plans",
  staff: "staff",
  templates: "templates",
  tasks: "tasks",
  branch: "branch",
};

/** Returns a new snapshot with the mutations folded in; untouched tables keep identity. */
export function applyMutations(s: Snapshot, muts: Mutation[]): Snapshot {
  if (!muts.length) return s;
  const next: Snapshot = { ...s, version: s.version + 1 };
  for (const mu of muts) {
    if (mu.table === "branch") {
      next.branch = { ...next.branch, ...(mu.row as object) } as Snapshot["branch"];
      continue;
    }
    const k = KEY[mu.table] as "members";
    const arr = [...(next[k] as { id: string }[])] as unknown as Member[];
    const i = arr.findIndex((r) => r.id === mu.row.id);
    if (mu.type === "insert" && i < 0) arr.push(mu.row as never);
    else if (i >= 0) arr[i] = { ...arr[i], ...(mu.row as object) };
    (next as unknown as Record<string, unknown>)[k] = arr;
  }
  return next;
}
