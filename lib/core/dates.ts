// Indian calendar dates as "YYYY-MM-DD" strings. All maths happens in UTC on the
// date parts, so a device clock in another zone never shifts a membership by a day.

const IST_MS = 330 * 60 * 1000;
const DAY = 86400000;

export function istParts(ms = Date.now()) {
  const d = new Date(ms + IST_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes() };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function todayIST(ms = Date.now()) {
  const p = istParts(ms);
  return ymd(p.y, p.m, p.d);
}

export function istHour(ms = Date.now()) {
  return istParts(ms).h;
}

export function istClock(iso: string | number) {
  const p = istParts(typeof iso === "number" ? iso : Date.parse(iso));
  return `${p.h}:${pad(p.min)}`;
}

function toMs(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromMs(ms: number) {
  const d = new Date(ms);
  return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(date: string, n: number) {
  return fromMs(toMs(date) + n * DAY);
}

export function diffDays(a: string, b: string) {
  return Math.round((toMs(a) - toMs(b)) / DAY);
}

const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Same day N months later, capped at the shorter month's last day (31 Jan + 1 = 28/29 Feb). */
export function addMonths(date: string, months: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = m - 1 + months;
  const ny = y + Math.floor(t / 12);
  const nm = ((t % 12) + 12) % 12 + 1;
  return ymd(ny, nm, Math.min(d, lastDay(ny, nm)));
}

/** A plan's last valid day: start + months (or days) - 1 day. */
export function planEnd(start: string, months: number, days: number) {
  if (months > 0) return addDays(addMonths(start, months), -1 + (days || 0));
  return addDays(start, Math.max(1, days) - 1);
}

export function planDays(start: string, months: number, days: number) {
  return diffDays(planEnd(start, months, days), start) + 1;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_HI = ["जन", "फ़र", "मार्च", "अप्रै", "मई", "जून", "जुला", "अग", "सित", "अक्टू", "नव", "दिस"];

export function fmtDay(date: string | null | undefined, lang: "en" | "hi" = "en") {
  if (!date) return "";
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${(lang === "hi" ? MON_HI : MON)[m - 1]}`;
}

/** "14 Nov", or "14 Nov 2027" when the date sits in another year or 300+ days from the reference,
 *  so a yearly term never reads like a one-day plan. */
export function fmtDate(date: string | null | undefined, ref: string = todayIST(), lang: "en" | "hi" = "en") {
  if (!date) return "";
  const y = date.slice(0, 4);
  return y !== ref.slice(0, 4) || Math.abs(diffDays(date, ref)) >= 300 ? `${fmtDay(date, lang)} ${y}` : fmtDay(date, lang);
}

/** "15 Nov to 14 Dec", or with both years when the span crosses a year or runs 300+ days. */
export function fmtSpan(a: string, b: string, lang: "en" | "hi" = "en") {
  const long = a.slice(0, 4) !== b.slice(0, 4) || diffDays(b, a) >= 300;
  const to = lang === "hi" ? "से" : "to";
  return long ? `${fmtDay(a, lang)} ${a.slice(0, 4)} ${to} ${fmtDay(b, lang)} ${b.slice(0, 4)}` : `${fmtDay(a, lang)} ${to} ${fmtDay(b, lang)}`;
}

/** 12-hour clock a member reads: "5:24 am", or "सुबह 5:24" in Hindi. */
export function istTime(iso: string | number, lang: "en" | "hi" = "en") {
  const p = istParts(typeof iso === "number" ? iso : Date.parse(iso));
  const t = `${p.h % 12 || 12}:${pad(p.min)}`;
  if (lang === "hi") return `${p.h < 12 ? "सुबह" : p.h < 16 ? "दोपहर" : "शाम"} ${t}`;
  return `${t} ${p.h < 12 ? "am" : "pm"}`;
}

export function fmtDayYear(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MON[m - 1]} ${y}`;
}

export function weekday(date: string) {
  return new Date(toMs(date)).getUTCDay();
}

/** Monday of the week that holds this date. */
export function weekStart(date: string) {
  const wd = (weekday(date) + 6) % 7;
  return addDays(date, -wd);
}

export function minDate(a: string, b: string) {
  return a < b ? a : b;
}
export function maxDate(a: string, b: string) {
  return a > b ? a : b;
}

/** Financial-year label for receipts: Apr-Mar, e.g. "26-27". */
export function fyLabel(date: string) {
  const [y, m] = date.split("-").map(Number);
  const s = m >= 4 ? y : y - 1;
  return `${String(s).slice(2)}-${String(s + 1).slice(2)}`;
}

export const MONTHS_EN = MON;
