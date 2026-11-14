// Whole paise in, Indian-grouped rupees out (₹1,20,000).

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const rupees = (paise: number) => fmt.format(Math.round(paise / 100));
export const rupeesBare = (paise: number) => num.format(Math.round(paise / 100));
export const toPaise = (rupeesValue: number | string) => Math.round(Number(String(rupeesValue).replace(/[₹,\s]/g, "")) * 100);

/** Strips +91, spaces, dashes and a leading 0. Returns 10 digits starting 6-9, or null. */
export function cleanPhone(raw: string | number | null | undefined): string | null {
  if (raw == null) return null;
  let s = String(raw).replace(/[^\d+]/g, "");
  if (s.startsWith("+91")) s = s.slice(3);
  else if (s.startsWith("91") && s.length === 12) s = s.slice(2);
  s = s.replace(/^0+/, "");
  return /^[6-9]\d{9}$/.test(s) ? s : null;
}

export const fmtPhone = (p: string) => (p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p);

export const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function upiLink(o: { vpa: string; payee: string; amount: number; note: string }) {
  const q = new URLSearchParams({ pa: o.vpa, pn: o.payee, am: (o.amount / 100).toFixed(2), cu: "INR", tn: o.note });
  return `upi://pay?${q.toString().replace(/\+/g, "%20")}`;
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
}

/** Time-ordered random id (uuid v7 layout), safe to make offline on any device. */
export function uid(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  const t = Date.now();
  b[0] = (t / 2 ** 40) & 255;
  b[1] = (t / 2 ** 32) & 255;
  b[2] = (t >>> 24) & 255;
  b[3] = (t >>> 16) & 255;
  b[4] = (t >>> 8) & 255;
  b[5] = t & 255;
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
