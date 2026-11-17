"use client";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { fmtDate, todayIST } from "@/lib/core/dates";
import { rupees } from "@/lib/core/money";
import { planLabel, type MemberState } from "@/lib/core/state";
import { Plate, Portrait, SPRING } from "./index";

/** The printed barcode strip along the bottom of a laminated gym card, cut from the member number. */
function Barcode({ text }: { text: string }) {
  let h = 2166136261;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of `*${text}*`) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    for (let k = 0; k < 5; k++) {
      const w = ((h >>> (k * 3)) & 3) === 0 ? 2.4 : 1;
      bars.push({ x, w });
      x += w + (((h >>> (k * 2 + 1)) & 1) ? 1.8 : 1);
    }
    x += 2;
  }
  return (
    <svg viewBox={`0 0 ${x} 20`} preserveAspectRatio="none" className="block h-full w-full" aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="20" fill="#2a2823" />
      ))}
    </svg>
  );
}

/** The laminated member card: the one object that travels between search,
 *  renewal, check-in and the register (layoutId card-{memberId}). */
export function IdCard({ st, gym, band, stamp, footer, layout = true, lang = "en", className }: { st: MemberState; gym: string; band: string; stamp?: ReactNode; footer?: ReactNode; layout?: boolean; lang?: "en" | "hi"; className?: string }) {
  const ring = st.daysLeft != null && st.totalDays ? Math.max(0, st.daysLeft + 1) / st.totalDays : 0;
  const days = st.daysLeft ?? 0;
  const today = todayIST();
  // printed labels never drop under 11 px, even on a 360 px phone
  const small = "clamp(11px, 2.8cqw, 14px)";
  return (
    <motion.div
      layoutId={layout ? `card-${st.m.id}` : undefined}
      transition={SPRING}
      className={`pvc relative w-full select-none overflow-hidden ${className ?? ""}`}
      style={{ aspectRatio: "3.375 / 2.125", borderRadius: "3.2% / 5%", containerType: "inline-size", boxShadow: "0 1px 0 rgba(255,255,255,.7) inset, 0 10px 24px -12px rgba(0,0,0,.6), 0 2px 0 #bdb8aa" }}
    >
      <div className="absolute inset-x-0 top-0" style={{ height: "1.6cqw", background: band }} />
      <div className="absolute left-1/2 top-[3.2cqw] -translate-x-1/2 rounded-full" style={{ width: "6cqw", height: "1.7cqw", background: "var(--rubber)", boxShadow: "inset 0 1px 1px #000" }} aria-hidden />
      <div className="absolute inset-x-0 top-[1.6cqw] h-px bg-white/80" aria-hidden />
      <div className="absolute flex items-center justify-between t-teko" style={{ left: "5cqw", right: "5cqw", top: "3cqw", fontSize: "3.4cqw", color: "#6a655a" }}>
        <span className="truncate">{gym}</span>
        <span className="t-mono" style={{ fontSize: "3cqw" }}>
          {st.m.memberNo}
        </span>
      </div>
      <div className="absolute flex gap-[4cqw]" style={{ left: "5cqw", right: "5cqw", top: "10cqw", bottom: "6cqw" }}>
        <div className="shrink-0" style={{ width: "21cqw" }}>
          <div style={{ width: "21cqw" }} className="[&>span]:!h-auto [&>span]:!w-full [&>span]:aspect-[1/1.2]">
            <Portrait name={st.m.name} photo={st.m.photo} size={84} />
          </div>
          {/* printed under the photo on every laminated card: since when, and the member's own signature */}
          <div className="t-teko mt-[1.6cqw]" style={{ fontSize: small, color: "#5d584e", lineHeight: 1.1 }}>
            {lang === "hi" ? "सदस्य" : "Since"} {fmtDate(st.joinedOn, today, lang)}
          </div>
          <div className="t-hand truncate" style={{ fontSize: "4.2cqw", color: "var(--ink)", lineHeight: 1.2, borderBottom: "1px solid #9d988a", transform: "rotate(-3deg)", transformOrigin: "left bottom" }} aria-label="Member signature">
            {st.m.name.split(" ")[0]}
          </div>
          <div className="t-teko" style={{ fontSize: small, color: "#6a655a" }}>
            {lang === "hi" ? "हस्ताक्षर" : "Signature"}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="line-clamp-2 font-semibold" style={{ fontSize: "5.2cqw", lineHeight: 1.1, color: "var(--text-on-paper)" }}>
            {st.m.name}
          </div>
          {/* after a renewal the card names both terms: the one running and the one the end date belongs to */}
          <div className="t-teko mt-[1cqw] line-clamp-2" style={{ fontSize: st.endPlan && st.plan && st.endPlan.id !== st.plan.id ? "3.6cqw" : "4.4cqw", color: "var(--ink)", lineHeight: 1.05 }}>
            {st.plan ? planLabel(st, lang) : lang === "hi" ? "अभी कोई प्लान नहीं" : "No plan yet"}
          </div>
          <div className="t-mono mt-[1.2cqw]" style={{ fontSize: "max(11px, 3.3cqw)", color: "#4a463e" }}>
            {st.endDate ? (days >= 0 ? `${lang === "hi" ? "ख़त्म" : "ends"} ${fmtDate(st.endDate, today, lang)}` : `${lang === "hi" ? "ख़त्म हुआ" : "ended"} ${fmtDate(st.endDate, today, lang)}`) : lang === "hi" ? "कोई टर्म नहीं" : "no term"}
          </div>
          <div className="t-mono" style={{ fontSize: "max(11px, 3.3cqw)", color: "#4a463e" }}>
            {st.m.phone.length === 10 ? `xxxxx ${st.m.phone.slice(5)}` : ""}
          </div>
          {st.dues === 0 && st.pending === 0 && (
            <div className="mt-auto" aria-hidden>
              <div style={{ height: "7cqw", width: "92%" }}>
                <Barcode text={st.m.memberNo} />
              </div>
              <div className="t-mono" style={{ fontSize: small, color: "#5d584e", letterSpacing: "0.3em" }}>
                {st.m.memberNo}
              </div>
            </div>
          )}
          <div className="mt-auto flex items-end gap-[2cqw]">
            {st.dues > 0 && (
              <span className="t-stencil" style={{ fontSize: "7cqw", color: "var(--stamp-due)" }}>
                {rupees(st.dues)}
              </span>
            )}
            {/* PENDING alone is stamped on the card; the amount is written here only beside dues */}
            {st.pending > 0 && st.dues > 0 && (
              <span className="t-teko" style={{ fontSize: "3.6cqw", color: "var(--stamp-pending)" }}>
                {rupees(st.pending)} pending
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center" style={{ width: "24cqw" }}>
          <div style={{ width: "24cqw", height: "24cqw" }} className="[&>svg]:h-full [&>svg]:w-full">
            <Plate state={st.plate} size={96} ring={ring} frozen={!!st.frozenNow} halfFrozen={!st.frozenNow && !!st.freezeRequest} label="" rim={lang === "hi" ? `${Math.max(0, days)} दिन · खाताबार ·` : `${Math.max(0, days)} DAYS · KHATABAR ·`} />
          </div>
          <div className="mt-[0.4cqw] flex items-baseline justify-center gap-[1cqw]">
            <span className="t-teko tnum" style={{ fontSize: "8.5cqw", fontWeight: 600, lineHeight: 0.9, color: days < 0 ? "var(--stamp-due)" : "var(--text-on-paper)" }}>
              {st.daysLeft == null ? "-" : Math.abs(days)}
            </span>
            <span className="t-teko" style={{ fontSize: "max(11px, 3.2cqw)", color: "#4a463e" }}>
              {st.daysLeft == null ? (lang === "hi" ? "प्लान नहीं" : "no plan") : days >= 0 ? (lang === "hi" ? "दिन बाकी" : "days left") : lang === "hi" ? "दिन ऊपर" : "days over"}
            </span>
          </div>
        </div>
      </div>
      {footer}
      {stamp && <div className="pointer-events-none absolute right-[4cqw] bottom-[4cqw]">{stamp}</div>}
    </motion.div>
  );
}
