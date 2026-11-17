import { fmtDate, todayIST } from "./dates";
import { firstName, rupeesBare } from "./money";
import type { Lang, Stage, Template } from "./types";

type Key = Stage | "receipt";

export const DEFAULT_TEMPLATES: Record<Exclude<Key, "manual">, Record<Lang, string>> = {
  pre7: {
    en: "Hi {first_name}, your {plan} membership at {gym} ends on {expiry} ({days_left} days left). Renew here: {pay_link}",
    hi: "Hi {first_name}, {gym} mein aapki {plan} membership {expiry} ko khatam ho rahi hai ({days_left} din baaki). Renew karne ke liye: {pay_link}",
  },
  pre3: {
    en: "{first_name}, 3 days left on your {gym} membership (ends {expiry}). Pay ₹{amount} by UPI: {pay_link}",
    hi: "{first_name}, aapki {gym} membership mein sirf 3 din bache hain ({expiry} tak). ₹{amount} UPI se bhejiye: {pay_link}",
  },
  day0: {
    en: "{first_name}, your {gym} membership ends today. Renew to keep your slot: {pay_link}. Already paid? Please ignore this.",
    hi: "{first_name}, aaj aapki {gym} membership ka last din hai. Renew karne ke liye: {pay_link}. Pay kar diya hai to ignore kijiye.",
  },
  post3: {
    en: "{first_name}, we've missed you at {gym}. Your membership ended on {expiry}. Renew any time: {pay_link}",
    hi: "{first_name}, {gym} mein aapki kami mehsoos ho rahi hai. Membership {expiry} ko khatam hui thi. Kabhi bhi renew kijiye: {pay_link}",
  },
  dues: {
    en: "{first_name}, ₹{amount} is pending on your {gym} account. Pay by UPI: {pay_link}. Thank you!",
    hi: "{first_name}, {gym} mein ₹{amount} baaki hai. UPI se pay kijiye: {pay_link}. Dhanyavaad!",
  },
  missed: {
    en: "{first_name}, we've missed you at {gym} these last few days. Your plan runs till {expiry}. See you at the rack soon. ({staff})",
    hi: "{first_name}, kuch dino se aap {gym} nahi aaye. Aapka plan {expiry} tak hai. Jaldi milte hain. ({staff})",
  },
  receipt: {
    en: "Received ₹{amount} from {first_name} for {plan}. Valid till {expiry}. Receipt: {receipt_link} ({gym}, {staff})",
    hi: "₹{amount} mil gaye, {first_name}. {plan} ab {expiry} tak valid hai. Receipt: {receipt_link} ({gym}, {staff})",
  },
};

export const STAGE_LABEL: Record<Key, string> = {
  pre7: "7 days before",
  pre3: "3 days before",
  day0: "Ends today",
  post3: "3 days after",
  dues: "Dues",
  missed: "We miss you",
  manual: "Dues",
  receipt: "Receipt",
};

export function templateFor(list: Template[], stage: Key, lang: Lang): string {
  const k = (stage === "manual" ? "dues" : stage) as Exclude<Key, "manual">;
  return list.find((t) => t.stage === k && t.lang === lang)?.body ?? DEFAULT_TEMPLATES[k][lang];
}

export interface FillVars {
  name: string;
  gym: string;
  branch: string;
  plan: string;
  expiry: string | null;
  daysLeft: number | null;
  amount: number; // paise
  payLink: string;
  receiptLink?: string;
  staff: string;
}

export function fill(body: string, v: FillVars, lang: Lang = "en") {
  const map: Record<string, string> = {
    name: v.name,
    first_name: firstName(v.name),
    gym: v.gym,
    branch: v.branch,
    plan: v.plan,
    // a yearly renewal reads "14 Nov 2027", never a bare "14 Nov" on the 14th of November
    expiry: fmtDate(v.expiry, todayIST()),
    days_left: String(Math.max(0, v.daysLeft ?? 0)),
    amount: rupeesBare(v.amount),
    pay_link: v.payLink,
    receipt_link: v.receiptLink ?? "",
    staff: v.staff,
  };
  return body.replace(/\{(\w+)\}/g, (all, k: string) => (k in map ? map[k] : all));
}
