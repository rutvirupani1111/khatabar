// Lohapuri Iron Gym, Maninagar: a made-up gym. Same members every time
// (seedrandom "lohapuri-v1"), dates laid out relative to today so there is
// always someone ending today. Phones are fake: 90000 0xxxx.
import seedrandom from "seedrandom";
import { addDays, addMonths, istHour, planEnd, todayIST } from "./dates";
import { buildReminders } from "./slate";
import type { Branch, BranchSettings, CashClose, Checkin, Freeze, Member, Membership, Payment, Plan, Snapshot, Staff } from "./types";

export const DEMO_KEY = "lohapuri-demo-checkin-key-not-secret";
export const DEMO_PINS: Record<string, string> = { "st-owner": "9999", "st-sunita": "4321", "st-ravi": "1234", "st-imran": "5555" };

const FIRST = ["Aarav", "Bhavesh", "Chirag", "Deepa", "Farhan", "Gurpreet", "Hetal", "Ishaan", "Jignesh", "Kavya", "Lakshmi", "Manoj", "Nirali", "Omkar", "Pooja", "Rahul", "Sneha", "Tanvi", "Uday", "Vaishali", "Yash", "Zoya", "Anjali", "Bhargav", "Darshan", "Ekta", "Gaurav", "Harpreet", "Imran", "Janhavi", "Karthik", "Meera", "Nikhil", "Parth", "Riya", "Sanjay", "Tejal", "Vikram", "Arjun", "Divya", "Fatima", "Hardik", "Komal", "Mihir", "Nandini", "Pranav", "Rutuja", "Siddharth", "Urvashi", "Varun", "Anand", "Bindu", "Dhruv", "Gita", "Jayesh", "Kiran", "Mahesh", "Neha", "Prakash", "Rekha", "Suresh", "Trupti", "Vivek", "Asha", "Dev", "Ilesh", "Kunal", "Lata", "Mohan", "Payal", "Rohan", "Sejal", "Tushar", "Yamini", "Naveen", "Selvi", "Anirban", "Sharmila"];
const LAST = ["Patel", "Shah", "Desai", "Joshi", "Iyer", "Nair", "Reddy", "Kulkarni", "Deshmukh", "Gill", "Sandhu", "Banerjee", "Chatterjee", "Khan", "Qureshi", "Mehta", "Trivedi", "Parmar", "Rao", "Menon", "Pillai", "Bhatt", "Chauhan", "Solanki", "Pandya", "Mukherjee", "Sheikh", "Pawar", "Jadeja", "Vaghela"];

export const DEFAULT_SETTINGS: BranchSettings = {
  backdateWithin7: true,
  discountLimitPct: 10,
  creditLimit: 3,
  rushHours: [
    ["05:30", "09:30"],
    ["17:30", "21:30"],
  ],
  stages: { pre7: { on: true, days: 7 }, pre3: { on: true, days: 3 }, day0: { on: true, days: 0 }, post3: { on: true, days: 3 }, dues: { on: true, days: 3 } },
  drawerCount: true,
  selfCheckin: true,
  geofence: null,
  freezeApproval: true,
  lang: "en",
};

export function defaultPlans(orgId: string, branchId: string | null, idf: (k: string) => string): Plan[] {
  const p = (k: string, nameEn: string, nameHi: string, months: number, price: number, fz: [number, number, number], plate: Plan["plate"], sort: number, extra: Partial<Plan> = {}): Plan => ({
    id: idf(k),
    orgId,
    branchId,
    kind: "time",
    nameEn,
    nameHi,
    months,
    days: 0,
    sessions: 0,
    price: price * 100,
    joiningFee: 50000,
    gstInclusive: true,
    gstRate: 18,
    freezeMaxCount: fz[0],
    freezeMaxDays: fz[1],
    freezeMinDays: fz[2],
    plate,
    active: true,
    sort,
    ...extra,
  });
  return [
    p("monthly", "Monthly", "मासिक", 1, 1200, [1, 7, 3], "p10", 1),
    p("quarterly", "Quarterly", "तिमाही", 3, 3200, [3, 30, 5], "p15", 2),
    p("half", "Half-yearly", "छमाही", 6, 5800, [3, 45, 5], "p20", 3),
    p("yearly", "Yearly", "सालाना", 12, 9999, [3, 60, 7], "p25", 4),
    p("pt12", "PT 12 sessions", "पीटी 12 सेशन", 0, 6000, [0, 0, 1], "p5", 5, { kind: "sessions", days: 45, sessions: 12, joiningFee: 0 }),
    p("ptm", "PT monthly", "पीटी मासिक", 1, 4000, [0, 0, 1], "p5", 6, { kind: "addon", joiningFee: 0 }),
  ];
}

interface Spec {
  days: number; // days left on the chain end; negative = overdue
  plan: "monthly" | "quarterly" | "half" | "yearly";
  dues?: number; // rupees still owed
  frozen?: boolean;
  freezeReq?: boolean;
  pendingUpi?: boolean;
  churn?: number; // days since last visit
  rhythm: number; // visits a week
}

export function demoSnapshot(branchCode: "LP" | "LV" = "LP", now = Date.now()): Snapshot {
  const rng = seedrandom(`lohapuri-v1-${branchCode}`);
  const pick = <T>(a: T[]) => a[Math.floor(rng() * a.length)];
  const int = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  let n = 0;
  const id = (k: string) => `${branchCode.toLowerCase()}-${k}-${(n++).toString(36)}`;
  const today = todayIST(now);
  const nowIso = new Date(now).toISOString();
  const orgId = "org-lohapuri";
  const branchId = branchCode === "LP" ? "br-maninagar" : "br-vastrapur";
  const branch: Branch = {
    id: branchId,
    orgId,
    name: branchCode === "LP" ? "Maninagar" : "Vastrapur",
    code: branchCode,
    city: "Ahmedabad",
    vpa: "demo@khatabar",
    payeeName: "Lohapuri Iron Gym",
    gstin: "24ABCDE1234F1Z5",
    color: branchCode === "LP" ? "#B5372A" : "#1F4C8A",
    settings: { ...DEFAULT_SETTINGS },
    memberSeq: 0,
    receiptSeq: 0,
  };
  const staff: Staff[] = [
    { id: "st-owner", orgId, branchId: null, name: "Harish Lohar", role: "owner", active: true },
    { id: "st-sunita", orgId, branchId, name: "Sunita", role: "manager", active: true },
    { id: "st-ravi", orgId, branchId, name: "Ravi", role: "desk", active: true },
    { id: "st-imran", orgId, branchId, name: "Imran", role: "trainer", active: true },
  ];
  const plans = defaultPlans(orgId, null, (k) => `pl-${k}`);
  const planBy = Object.fromEntries(plans.map((p) => [p.id.slice(3), p]));

  const specs: Spec[] = [];
  const add = (count: number, f: () => Spec) => {
    for (let i = 0; i < count; i++) specs.push(f());
  };
  const plan4 = () => pick(["monthly", "monthly", "monthly", "quarterly", "quarterly", "half", "yearly"] as const);
  const big = branchCode === "LP";
  add(big ? 3 : 1, () => ({ days: 0, plan: plan4(), rhythm: int(3, 5) }));
  add(big ? 5 : 2, () => ({ days: int(1, 3), plan: plan4(), rhythm: int(2, 5), dues: rng() < 0.3 ? 400 : 0 }));
  add(big ? 5 : 2, () => ({ days: int(4, 7), plan: plan4(), rhythm: int(2, 5) }));
  add(big ? 6 : 2, () => ({ days: int(8, 14), plan: plan4(), rhythm: int(2, 5) }));
  add(big ? 22 : 8, () => ({ days: int(15, 300), plan: pick(["quarterly", "half", "yearly", "monthly"] as const), rhythm: int(2, 6), dues: rng() < 0.2 ? pick([600, 1000, 1500]) : 0 }));
  add(big ? 8 : 3, () => ({ days: -int(1, 14), plan: plan4(), rhythm: int(2, 4), dues: rng() < 0.4 ? 1200 : 0 }));
  add(big ? 6 : 2, () => ({ days: -int(15, 70), plan: plan4(), rhythm: int(1, 3) }));
  add(big ? 3 : 1, () => ({ days: int(20, 80), plan: "quarterly", frozen: true, rhythm: 3 }));
  add(big ? 1 : 0, () => ({ days: int(30, 70), plan: "half", freezeReq: true, rhythm: 3 }));
  add(big ? 2 : 1, () => ({ days: int(20, 60), plan: "quarterly", pendingUpi: true, rhythm: 3 }));
  add(big ? 3 : 1, () => ({ days: int(20, 120), plan: "half", churn: int(10, 19), rhythm: 4 }));
  // shuffle so member numbers do not group by state
  for (let i = specs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [specs[i], specs[j]] = [specs[j], specs[i]];
  }

  const members: Member[] = [];
  const memberships: Membership[] = [];
  const payments: Payment[] = [];
  const freezes: Freeze[] = [];
  const checkins: Checkin[] = [];
  const usedPhones = new Set<string>(["4521"]);
  let receipt = 0;
  const pay = (memberId: string, msId: string | null, amount: number, mode: Payment["mode"], at: string, state: Payment["state"] = "confirmed", by = pick(["st-ravi", "st-ravi", "st-sunita"])) => {
    payments.push({
      id: id("pay"),
      orgId,
      branchId,
      memberId,
      membershipId: msId,
      amount,
      mode,
      state,
      utrLast4: mode.startsWith("upi") ? String(int(1000, 9999)) : "",
      receivedBy: mode === "upi_member" ? null : by,
      confirmedBy: state === "confirmed" ? by : null,
      confirmedAt: state === "confirmed" ? at : null,
      reversesId: null,
      receiptNo: state === "confirmed" ? `${branchCode}/26-27/${String(++receipt).padStart(4, "0")}` : "",
      createdAt: at,
    });
  };
  const at = (date: string, h: number, m: number) => new Date(Date.parse(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`)).toISOString();

  specs.forEach((sp, i) => {
    const no = i + 1;
    const memberId = id("m");
    let last4: string;
    if (branchCode === "LP" && no === 42) last4 = "4521";
    else {
      do last4 = String(int(1000, 9999));
      while (usedPhones.has(last4));
    }
    usedPhones.add(last4);
    const first = FIRST[(i * 7 + (branchCode === "LP" ? 3 : 11)) % FIRST.length];
    const name = `${first} ${pick(LAST)}`;
    const plan = planBy[sp.plan];
    sp.days = Math.min(sp.days, plan.months * 30 - 3);
    const chainEnd = addDays(today, sp.days);
    const start = addMonths(addDays(chainEnd, 1), -plan.months);
    // one earlier term so the timeline has history
    const prevStart = addMonths(start, -plan.months);
    const joined = rng() < 0.5 ? prevStart : start;
    members.push({
      id: memberId,
      orgId,
      branchId,
      memberNo: `${branchCode}-${String(no).padStart(4, "0")}`,
      name,
      phone: `900000${last4}`,
      altPhone: "",
      emergency: "",
      gender: pick(["M", "F", "M"]),
      dob: null,
      photo: null,
      notes: rng() < 0.12 ? pick(["Knee injury, no heavy squats", "Prefers evening batch", "Brother also a member", "Pays on 5th, salary day"]) : "",
      source: pick(["walk-in", "walk-in", "referral", "instagram"]),
      importId: null,
      waConsentAt: at(joined, 7, 10),
      remindersOptOut: false,
      weeklyTarget: Math.min(6, Math.max(2, sp.rhythm)),
      trainerId: rng() < 0.2 ? "st-imran" : null,
      archivedAt: null,
      anonymisedAt: null,
      createdAt: at(joined, 7, 10),
      updatedAt: at(joined, 7, 10),
    });
    const terms: [string, boolean][] = joined === prevStart ? [[prevStart, false], [start, true]] : [[start, true]];
    for (const [s0, current] of terms) {
      const msId = id("ms");
      const ms: Membership = {
        id: msId,
        orgId,
        branchId,
        memberId,
        planId: plan.id,
        addonOf: null,
        startDate: s0,
        baseEndDate: planEnd(s0, plan.months, 0),
        frozenDays: 0,
        price: plan.price,
        discount: 0,
        joiningFee: s0 === joined ? plan.joiningFee : 0,
        status: "active",
        lapseReason: !current ? null : sp.days < -15 ? pick(["moved", "cost", "unknown", "joined another gym"]) : null,
        sessionsLeft: null,
        createdBy: "st-ravi",
        createdAt: at(addDays(s0, -1 * int(0, 2)), 7, 30),
      };
      if (current && sp.frozen) {
        const fd = int(6, 12);
        const from = addDays(today, -int(1, 4));
        ms.baseEndDate = addDays(ms.baseEndDate, -fd);
        ms.frozenDays = fd;
        freezes.push({ id: id("fz"), branchId, membershipId: msId, memberId, fromDate: from, toDate: addDays(from, fd - 1), days: fd, reason: pick(["Diwali/travel", "Exams", "Illness/injury"]), state: "approved", requestedBy: "staff", decidedBy: "st-ravi", createdAt: at(from, 8, 0) });
      }
      if (current && sp.freezeReq) {
        const from = addDays(today, 2);
        freezes.push({ id: id("fz"), branchId, membershipId: msId, memberId, fromDate: from, toDate: addDays(from, 9), days: 10, reason: "Exams", state: "requested", requestedBy: "member", decidedBy: null, createdAt: at(today, 6, 5) });
      }
      memberships.push(ms);
      const bill = ms.price + ms.joiningFee;
      const paidAt = ms.createdAt;
      const owed = current ? (sp.dues ?? 0) * 100 : 0;
      if (current && sp.pendingUpi) {
        pay(memberId, msId, bill, "cash", paidAt);
      } else {
        pay(memberId, msId, bill - owed, rng() < 0.55 ? "upi_desk" : "cash", paidAt);
      }
    }
    if (sp.pendingUpi) {
      // member pressed "Yes, paid" on their card: renewal waiting for the desk
      const msId = id("ms");
      const s1 = addDays(chainEnd, 1);
      memberships.push({ id: msId, orgId, branchId, memberId, planId: plan.id, addonOf: null, startDate: s1, baseEndDate: planEnd(s1, plan.months, 0), frozenDays: 0, price: plan.price, discount: 0, joiningFee: 0, status: "requested", lapseReason: null, sessionsLeft: null, createdBy: null, createdAt: at(today, 6, 20) });
      pay(memberId, msId, plan.price, "upi_member", at(today, 6, int(21, 50)), "pending");
    }

    // 8 weeks of visits, honest to each spec
    const firstDay = addDays(today, -56);
    const lastActive = sp.days < 0 ? chainEnd : today;
    const stopAt = sp.churn ? addDays(today, -sp.churn) : lastActive;
    const evening = rng() < 0.4;
    for (let dd = 0; dd <= 56; dd++) {
      const date = addDays(firstDay, dd);
      if (date < joined || date > stopAt) continue;
      const fr = freezes.find((f) => f.memberId === memberId && f.state === "approved" && f.fromDate <= date && f.toDate >= date);
      if (fr) continue;
      if (rng() > sp.rhythm / 7) continue;
      const h = evening ? int(17, 20) : int(5, 8);
      const mm = int(0, 59);
      const iso = at(date, h, mm);
      if (date === today && Date.parse(iso) > now) continue;
      checkins.push({ id: id("ci"), branchId, memberId, at: iso, istDate: date, istHour: h, method: rng() < 0.7 ? "desk_scan" : "desk_manual", staffId: "st-ravi", onCredit: false });
    }
  });

  // a few renewals were taken at the counter yesterday, so the slate has takings
  const yd = addDays(today, -1);
  let moved = 0;
  for (const p of [...payments].reverse()) {
    if (moved >= (big ? 5 : 2) || p.state !== "confirmed" || p.mode === "upi_member") continue;
    const ms = memberships.find((x) => x.id === p.membershipId);
    if (!ms || ms.startDate < addDays(today, -20)) continue;
    const t = at(yd, int(6, 20), int(0, 59));
    p.createdAt = t;
    p.confirmedAt = t;
    moved++;
  }

  // yesterday's close matched; the one before was ₹200 short with a reason
  const y = addDays(today, -1);
  const closes: CashClose[] = [
    { id: id("cl"), branchId, staffId: "st-sunita", shiftStart: at(addDays(today, -2), 5, 30), shiftEnd: at(addDays(today, -2), 22, 5), counts: { "500": 6, "100": 9, "50": 2 }, expected: 410000, counted: 390000, shortfall: 20000, upiTotal: 640000, reason: "Gave Rs 200 change from drawer for milk, receipt in tray", reopenedBy: null, reopenedAt: null },
    { id: id("cl"), branchId, staffId: "st-ravi", shiftStart: at(y, 5, 30), shiftEnd: at(y, 22, 2), counts: { "500": 4, "200": 3, "100": 6 }, expected: 320000, counted: 320000, shortfall: 0, upiTotal: 520000, reason: "", reopenedBy: null, reopenedAt: null },
  ];

  const snap: Snapshot = {
    version: 1,
    org: { id: orgId, name: "Lohapuri Iron Gym", slug: "lohapuri" },
    branch: { ...branch, memberSeq: members.length, receiptSeq: receipt },
    branches: [
      { id: "br-maninagar", name: "Maninagar", code: "LP", city: "Ahmedabad" },
      { id: "br-vastrapur", name: "Vastrapur", code: "LV", city: "Ahmedabad" },
    ],
    staff,
    plans,
    members,
    memberships,
    payments,
    freezes,
    checkins,
    reminders: [],
    templates: [],
    closes,
    dismissals: [],
    imports: [],
    tasks: [],
  };
  // the 06:00 job has already run today, and yesterday's queue was partly worked
  let r = 0;
  const built = buildReminders(snap, today, () => `${branchCode.toLowerCase()}-rm-${r++}`);
  snap.reminders = built.add;
  if (istHour(now) < 6) snap.reminders = [];
  return snap;
}
