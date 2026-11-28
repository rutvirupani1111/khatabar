// Status is always a colour, a word and an icon. One function decides the words, so the
// desk list, the card, the fees list and the home page demos never disagree.
import { fmtDay } from "@/lib/core/dates";
import { rupees } from "@/lib/core/money";
import type { MemberState } from "@/lib/core/state";
import { Icon, type IconName } from "./Icon";

export type ChipKind = "paid" | "owes" | "wait" | "frozen" | "ended" | "soon" | "valid";
export interface ChipSpec {
  kind: ChipKind;
  text: string;
}

const ICON: Partial<Record<ChipKind, IconName>> = { paid: "tick", owes: "rupee", wait: "clock", frozen: "snow", soon: "hourglass" };

export function Chip({ kind, text, className }: ChipSpec & { className?: string }) {
  const i = ICON[kind];
  return (
    <span className={`chip chip-${kind} ${className ?? ""}`}>
      {i && <Icon name={i} size={14} stroke={2.4} />}
      {text}
    </span>
  );
}

/** Every chip that applies, most urgent first. The member's card passes its language. */
export function chipsFor(st: MemberState, lang: "en" | "hi" = "en"): ChipSpec[] {
  const out: ChipSpec[] = [];
  const hi = lang === "hi";
  const day = (s: string | null | undefined) => fmtDay(s, lang);
  if (st.frozenNow) out.push({ kind: "frozen", text: hi ? `${day(st.frozenNow.toDate)} तक फ़्रीज़` : `Frozen till ${day(st.frozenNow.toDate)}` });
  if (st.dues > 0) out.push({ kind: "owes", text: hi ? `${rupees(st.dues)} बाकी` : `Owes ${rupees(st.dues)}` });
  if (st.pending > 0) out.push({ kind: "wait", text: hi ? `${rupees(st.pending)} का इंतज़ार` : `Waiting for money ${rupees(st.pending)}` });
  if (st.status === "lapsed") out.push({ kind: "ended", text: hi ? `${day(st.endDate)} को ख़त्म` : `Ended on ${day(st.endDate)}` });
  else if (st.status === "none") out.push({ kind: "ended", text: hi ? "अभी कोई प्लान नहीं" : "No plan yet" });
  else if (st.status === "upcoming" && st.term) out.push({ kind: "valid", text: hi ? `${day(st.term.startDate)} से शुरू` : `Starts ${day(st.term.startDate)}` });
  else if (!st.frozenNow && st.daysLeft != null && st.daysLeft <= 7)
    out.push({ kind: "soon", text: st.daysLeft === 0 ? (hi ? "आज ख़त्म" : "Ends today") : hi ? `${st.daysLeft} दिन में ख़त्म` : `Ends in ${st.daysLeft} ${st.daysLeft === 1 ? "day" : "days"}` });
  else if (!st.frozenNow && st.endDate) out.push({ kind: "valid", text: hi ? `${day(st.endDate)} तक वैध` : `Valid till ${day(st.endDate)}` });
  return out;
}

export function StatusChips({ st, max = 3 }: { st: MemberState; max?: number }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {chipsFor(st)
        .slice(0, max)
        .map((c) => (
          <Chip key={c.kind + c.text} {...c} />
        ))}
    </span>
  );
}

export function Initials({ name, photo, size = 40, tone = "var(--marigold-pale)" }: { name: string; photo?: string | null; size?: number; tone?: string }) {
  const parts = name.trim().split(/\s+/);
  const ini = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  if (photo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" width={size} height={size} className="shrink-0 rounded-full border-2 border-[var(--ink)] object-cover" style={{ width: size, height: size }} />;
  return (
    <span className="grid shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] font-bold" style={{ width: size, height: size, background: tone, fontSize: Math.round(size * 0.38), color: "var(--ink)" }} aria-hidden>
      {ini}
    </span>
  );
}

/** Days left as a ring: the filled part is what is left of the current term. */
export function DaysRing({ left, total, size = 72, frozen, lang = "en" }: { left: number | null; total: number; size?: number; frozen?: boolean; lang?: "en" | "hi" }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const f = left != null && total > 0 ? Math.max(0, Math.min(1, (left + 1) / total)) : 0;
  const col = frozen ? "var(--kingfisher)" : left == null || left < 0 ? "var(--ended)" : left <= 7 ? "var(--saffron)" : "var(--paan)";
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="var(--paper)" stroke="#efe3c6" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="8" strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <circle cx={size / 2} cy={size / 2} r={r + 5} fill="none" stroke="var(--ink)" strokeWidth="2" />
        <circle cx={size / 2} cy={size / 2} r={r - 5} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center leading-none">
        <span>
          <span className="t-display block" style={{ fontSize: size * 0.3 }}>
            {left == null ? "–" : Math.max(0, left)}
          </span>
          {/* sits inside the inner ring, clear of the stroke at every size */}
          <span className="block font-semibold" style={{ fontSize: Math.max(9, Math.min(12, size * 0.13)), marginTop: 1 }}>
            {lang === "hi" ? (left != null && left < 0 ? "ख़त्म" : "दिन") : left != null && left < 0 ? "ended" : left === 1 ? "day" : "days"}
          </span>
        </span>
      </span>
    </span>
  );
}

/** The paan PAID stamp with a pre-drawn jagged edge (no filters). */
export function PaidStamp({ word = "PAID", tone = "var(--paan)", size = 1 }: { word?: string; tone?: string; size?: number }) {
  const w = 150 * size;
  const h = 64 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 150 64" className="stamp-land" aria-hidden>
      <path d="M6 8 L18 5 L30 8 L44 4 L58 7 L72 4 L86 8 L100 5 L114 8 L128 4 L144 7 L146 20 L143 32 L146 44 L144 58 L130 60 L116 57 L102 61 L88 58 L74 61 L60 57 L46 61 L32 58 L18 61 L5 58 L7 45 L4 32 L7 20 Z" fill="none" stroke={tone} strokeWidth="5" strokeLinejoin="round" />
      <path d="M14 14 H136 V50 H14 Z" fill="none" stroke={tone} strokeWidth="2" strokeDasharray="6 4" />
      <text x="75" y="44" textAnchor="middle" fontFamily="var(--font-sign)" fontSize={word.length > 5 ? 22 : 32} fill={tone} letterSpacing="2">
        {word}
      </text>
    </svg>
  );
}
