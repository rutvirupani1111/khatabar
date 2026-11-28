// Find a member at the counter: the last 4 digits of the phone, a name, or a member number.
// Digits match the phone's end first, so 4521 finds the one member whose number ends 4521.
import type { MemberState } from "./state";

export function search(list: MemberState[], q: string): MemberState[] {
  const s = q.replace(/^\//, "").trim().toLowerCase();
  if (!s) return list;
  const digits = s.replace(/\D/g, "");
  if (/^\d{3,}$/.test(s.replace(/[\s+-]/g, ""))) {
    const d = digits.length > 10 ? digits.slice(-10) : digits;
    const ends = list.filter((x) => x.m.phone.endsWith(d));
    const byNo = (x: MemberState) => x.m.memberNo.replace(/\D/g, "").endsWith(d.padStart(4, "0"));
    // 3 or 4 digits are the end of a phone (or a member number), never "somewhere in the phone":
    // a mistyped last 4 shows "No member matches", not a list of strangers
    if (d.length <= 4) return [...ends, ...list.filter((x) => !x.m.phone.endsWith(d) && byNo(x))];
    const has = list.filter((x) => !x.m.phone.endsWith(d) && (x.m.phone.includes(d) || byNo(x)));
    return [...ends, ...has];
  }
  if (/^[a-z]{2}-?\d+$/.test(s)) return list.filter((x) => x.m.memberNo.toLowerCase().replace("-", "") === s.replace("-", "") || x.m.memberNo.toLowerCase().startsWith(s));
  const toks = s.split(/\s+/);
  return list.filter((x) => {
    const n = x.m.name.toLowerCase();
    return toks.every((t) => n.split(/\s+/).some((w) => w.startsWith(t)) || n.includes(t));
  });
}

/** The one member a 4-digit query points at, or null when none or several phones end that way. */
export function uniqueByLast4(list: MemberState[], q: string): MemberState | null {
  if (!/^\d{4}$/.test(q.trim())) return null;
  const hits = list.filter((x) => x.m.phone.endsWith(q.trim()));
  return hits.length === 1 ? hits[0] : null;
}
