// Import members from Excel: reads the gym's own sheet, with its own spellings ("naam",
// "mob no", "DOJ", "valid till"), Indian dates, and messy phone numbers.
import { addDays, diffDays, todayIST, ymd } from "./dates";
import { cleanPhone, toPaise } from "./money";
import type { Plan } from "./types";

export const FIELDS = [
  { k: "name", en: "Name" },
  { k: "phone", en: "Phone" },
  { k: "plan", en: "Plan" },
  { k: "start", en: "Start date" },
  { k: "end", en: "Expiry date" },
  { k: "paid", en: "Amount paid" },
  { k: "due", en: "Amount due" },
  { k: "notes", en: "Notes" },
  { k: "memberNo", en: "Member no." },
  { k: "gender", en: "Gender" },
  { k: "dob", en: "Date of birth" },
] as const;
export type FieldKey = (typeof FIELDS)[number]["k"];

const SYN: [FieldKey, string[]][] = [
  ["dob", ["dob", "birth", "birthday", "जन्म"]],
  ["memberNo", ["member no", "memberno", "mem no", "id", "reg no", "roll", "sr no", "card no"]],
  ["start", ["doj", "joining", "join", "start", "from", "date of joining", "शुरू"]],
  ["end", ["valid", "expiry", "exp", "till", "end", "upto", "to date", "ख़त्म", "खत्म"]],
  ["due", ["due", "baki", "baaki", "balance", "pending", "बाकी"]],
  ["paid", ["fees", "fee", "amount", "paid", "amt", "rs", "जमा", "rupees"]],
  ["phone", ["mob", "mobile", "phone", "contact", "whatsapp", "number", "cell", "फ़ोन", "फोन"]],
  ["plan", ["plan", "package", "pkg", "membership", "type", "months", "duration"]],
  ["gender", ["gender", "sex", "m/f"]],
  ["notes", ["note", "notes", "remark", "remarks", "comment"]],
  ["name", ["naam", "name", "member", "नाम", "full name"]],
];

export function guessField(header: string): FieldKey | null {
  const h = header.toLowerCase().replace(/[._:/()-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!h) return null;
  for (const [k, words] of SYN) if (words.some((w) => h === w || h.split(" ").includes(w) || (w.length > 3 && h.includes(w)))) return k;
  return null;
}

export function guessMapping(headers: string[]): Record<number, FieldKey | null> {
  const used = new Set<FieldKey>();
  const out: Record<number, FieldKey | null> = {};
  headers.forEach((h, i) => {
    const g = guessField(h);
    out[i] = g && !used.has(g) ? g : null;
    if (g) used.add(g);
  });
  return out;
}

const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12, जनवरी: 1, फ़रवरी: 2, फरवरी: 2, मार्च: 3, अप्रैल: 4, मई: 5, जून: 6, जुलाई: 7, अगस्त: 8, सितंबर: 9, सितम्बर: 9, अक्टूबर: 10, नवंबर: 11, नवम्बर: 11, दिसंबर: 12, दिसम्बर: 12 };

function valid(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? ymd(y, m, d) : null;
}
const fullYear = (y: number) => (y < 100 ? (y > 70 ? 1900 + y : 2000 + y) : y);

/** Day-first unless told otherwise. Never assumes month-first silently. */
export function parseDate(v: unknown, order: "dmy" | "mdy" = "dmy"): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" || /^\d{5}(\.\d+)?$/.test(String(v).trim())) {
    const n = Number(v);
    if (n > 20000 && n < 80000) {
      // Excel serial (1900 system, with its leap-year bug)
      const ms = Date.UTC(1899, 11, 30) + Math.round(n) * 86400000;
      const d = new Date(ms);
      return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
  }
  if (v instanceof Date) return ymd(v.getFullYear(), v.getMonth() + 1, v.getDate());
  const s = String(v).trim().toLowerCase();
  let m = /^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2,4})$/.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = fullYear(Number(m[3]));
    return order === "dmy" ? valid(y, b, a) : valid(y, a, b);
  }
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[\s\-/.]*([a-zऀ-ॿ]+)[\s\-/.,]*(\d{2,4})?$/.exec(s);
  if (m && (MON[m[2]] ?? MON[m[2].slice(0, 3)])) {
    const mon = MON[m[2]] ?? MON[m[2].slice(0, 3)];
    const y = m[3] ? fullYear(Number(m[3])) : Number(todayIST().slice(0, 4));
    return valid(y, mon, Number(m[1]));
  }
  m = /^([a-zऀ-ॿ]+)[\s\-/.]*(\d{1,2})(?:[\s\-/.,]+(\d{2,4}))?$/.exec(s);
  if (m && (MON[m[1]] ?? MON[m[1].slice(0, 3)])) {
    const mon = MON[m[1]] ?? MON[m[1].slice(0, 3)];
    const y = m[3] ? fullYear(Number(m[3])) : Number(todayIST().slice(0, 4));
    return valid(y, mon, Number(m[2]));
  }
  return null;
}

/** The header is the row in the first 10 with the most cells we recognise (and at least 3 filled), so a
 *  title line like "LOHA FITNESS - MEMBER LIST NOV 2026" above the real headers is stepped over. */
export function headerRowOf(raw: unknown[][]): number {
  let best = 0;
  let bestScore = -1;
  raw.slice(0, 10).forEach((r, i) => {
    const filled = r.filter((x) => String(x ?? "").trim()).length;
    if (filled < 3) return;
    const score = new Set(r.map((x) => guessField(String(x ?? ""))).filter(Boolean)).size;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

const DMY = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/;

/** Reads the date order from every date column at once: one 30/11/2026 anywhere proves day-first. */
export function inferOrder(rows: unknown[][], cols: number[]): { order: "dmy" | "mdy" | null; sample: string | null } {
  let sample: string | null = null;
  for (const c of cols)
    for (const r of rows) {
      const v = String(r[c] ?? "").trim();
      const m = DMY.exec(v);
      if (!m) continue;
      if (Number(m[1]) > 12) return { order: "dmy", sample: v };
      if (Number(m[2]) > 12) return { order: "mdy", sample: v };
      if (!sample && m[1] !== m[2]) sample = v;
    }
  return { order: null, sample };
}

/** True when every value in the column reads both ways (every day is 12 or less). */
export function ambiguous(values: unknown[]) {
  const nums = values.map((v) => /^(\d{1,2})[/.\-](\d{1,2})[/.\-]\d{2,4}$/.exec(String(v ?? "").trim())).filter(Boolean) as RegExpExecArray[];
  return nums.length > 0 && nums.every((m) => Number(m[1]) <= 12 && Number(m[2]) <= 12) && nums.some((m) => m[1] !== m[2]);
}

// What a register writes when nothing is owed
const NIL = /^(nil+|none|na|n\/a|nahi|nahin|paid|clear|cleared|zero|[-–—.]+|0+)$/i;

export function money(v: unknown): number | null {
  if (v == null || v === "") return 0;
  if (NIL.test(String(v).trim())) return 0;
  const s = String(v).replace(/[₹,\s]|rs\.?|inr|\/-/gi, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return toPaise(s);
}

export function planFor(plans: Plan[], text: string | null, start: string | null, end: string | null, paid: number): Plan | null {
  const time = plans.filter((p) => p.kind === "time");
  if (text) {
    const t = text.toLowerCase();
    const byName = time.find((p) => t.includes(p.nameEn.toLowerCase()) || (p.nameHi && t.includes(p.nameHi)));
    if (byName) return byName;
    const months = /(\d{1,2})\s*(m|mon|month|mahine|mahina)/.exec(t)?.[1] ?? (/(year|yearly|annual|sal)/.test(t) ? "12" : /(half|6)/.test(t) ? "6" : /(quarter|3)/.test(t) ? "3" : /(month|1)/.test(t) ? "1" : null);
    if (months) {
      const p = time.find((x) => x.months === Number(months));
      if (p) return p;
    }
  }
  if (start && end) {
    const len = diffDays(end, start) + 1;
    const want = len >= 26 && len <= 33 ? 1 : len >= 84 && len <= 96 ? 3 : len >= 175 && len <= 190 ? 6 : len >= 355 && len <= 370 ? 12 : 0;
    const same = time.filter((x) => x.months === want);
    if (same.length) return same.sort((a, b) => Math.abs(a.price - paid) - Math.abs(b.price - paid))[0];
  }
  if (paid > 0) return time.slice().sort((a, b) => Math.abs(a.price - paid) - Math.abs(b.price - paid))[0] ?? null;
  return null;
}

export interface ParsedRow {
  i: number;
  name: string;
  phone: string | null;
  rawPhone: string;
  plan: Plan | null;
  start: string | null;
  end: string | null;
  paid: number | null;
  due: number | null;
  notes: string;
  gender: string;
  dob: string | null;
  problems: string[];
  dupOf: number | null;
}

export function parseRows(rows: unknown[][], map: Record<number, FieldKey | null>, plans: Plan[], order: "dmy" | "mdy", existingPhones: Set<string>): ParsedRow[] {
  const col = (k: FieldKey) => Number(Object.entries(map).find(([, v]) => v === k)?.[0] ?? -1);
  const c = Object.fromEntries(FIELDS.map((f) => [f.k, col(f.k)])) as Record<FieldKey, number>;
  const get = (r: unknown[], k: FieldKey) => (c[k] >= 0 ? r[c[k]] : undefined);
  const seen = new Map<string, number>();
  return rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.some((x) => String(x ?? "").trim()))
    // the sheet's own TOTAL line is arithmetic, not a member
    .filter(({ r }) => !(/^(grand\s*)?(total|sum|kul|कुल)(\s|:|$)/i.test(String(get(r, "name") ?? "").trim()) && !cleanPhone(String(get(r, "phone") ?? ""))))
    .map(({ r, i }) => {
      const name = String(get(r, "name") ?? "").trim();
      const rawPhone = String(get(r, "phone") ?? "").trim();
      const phone = cleanPhone(rawPhone);
      let start = parseDate(get(r, "start"), order);
      let end = parseDate(get(r, "end"), order);
      const paid = money(get(r, "paid"));
      const due = money(get(r, "due"));
      const planText = c.plan >= 0 ? String(get(r, "plan") ?? "") : null;
      const plan = planFor(plans, planText, start, end, paid ?? 0);
      if (plan && start && !end) end = addDays(start, plan.months * 30 - 1);
      if (plan && end && !start) start = null;
      const problems: string[] = [];
      if (!name) problems.push("no name");
      if (!phone) problems.push(rawPhone ? "phone is not 10 digits starting 6-9" : "no phone");
      if (start && end && end < start) problems.push("expiry before start");
      if (paid == null) problems.push("amount paid is not a number");
      if (due == null) problems.push("amount due is not a number");
      let dupOf: number | null = null;
      if (phone) {
        if (existingPhones.has(phone)) problems.push("already a member");
        else if (seen.has(phone)) dupOf = seen.get(phone)!;
        else seen.set(phone, i);
      }
      return { i, name, phone, rawPhone, plan, start, end, paid, due, notes: String(get(r, "notes") ?? "").trim(), gender: String(get(r, "gender") ?? "").trim().slice(0, 1).toUpperCase(), dob: parseDate(get(r, "dob"), order), problems, dupOf };
    });
}
