"use client";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { fmtDay } from "@/lib/core/dates";
import { rupees } from "@/lib/core/money";
import type { MemberState } from "@/lib/core/state";
import { Plate, Portrait, SPRING } from "./index";

/** The laminated member card: the one object that travels between search,
 *  renewal, check-in and the register (layoutId card-{memberId}). */
export function IdCard({ st, gym, band, stamp, footer, layout = true, lang = "en", className }: { st: MemberState; gym: string; band: string; stamp?: ReactNode; footer?: ReactNode; layout?: boolean; lang?: "en" | "hi"; className?: string }) {
  const ring = st.daysLeft != null && st.totalDays ? Math.max(0, st.daysLeft + 1) / st.totalDays : 0;
  const days = st.daysLeft ?? 0;
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
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="line-clamp-2 font-semibold" style={{ fontSize: "5.2cqw", lineHeight: 1.1, color: "var(--text-on-paper)" }}>
            {st.m.name}
          </div>
          <div className="t-teko mt-[1cqw] truncate" style={{ fontSize: "4.4cqw", color: "var(--ink)" }}>
            {st.plan ? (lang === "hi" ? st.plan.nameHi : st.plan.nameEn) : "No plan yet"}
          </div>
          <div className="t-mono mt-[1.2cqw]" style={{ fontSize: "3.3cqw", color: "#4a463e" }}>
            {st.endDate ? (days >= 0 ? `ends ${fmtDay(st.endDate)}` : `ended ${fmtDay(st.endDate)}`) : "no term"}
          </div>
          <div className="t-mono" style={{ fontSize: "3.3cqw", color: "#4a463e" }}>
            {st.m.phone.length === 10 ? `xxxxx ${st.m.phone.slice(5)}` : ""}
          </div>
          <div className="mt-auto flex items-end gap-[2cqw]">
            {st.dues > 0 && (
              <span className="t-stencil" style={{ fontSize: "7cqw", color: "var(--stamp-due)" }}>
                {rupees(st.dues)}
              </span>
            )}
            {st.pending > 0 && (
              <span className="t-teko" style={{ fontSize: "3.6cqw", color: "var(--stamp-pending)" }}>
                {rupees(st.pending)} pending
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center" style={{ width: "24cqw" }}>
          <div style={{ width: "24cqw", height: "24cqw" }} className="[&>svg]:h-full [&>svg]:w-full">
            <Plate state={st.plate} size={96} ring={ring} frozen={!!st.frozenNow} label="" rim={`•KHATABAR•${Math.max(0, days)} DAYS•`} />
          </div>
          <div className="mt-[0.4cqw] flex items-baseline justify-center gap-[1cqw]">
            <span className="t-stencil tnum" style={{ fontSize: "7.5cqw", color: days < 0 ? "var(--stamp-due)" : "var(--text-on-paper)" }}>
              {st.daysLeft == null ? "-" : Math.abs(days)}
            </span>
            <span className="t-teko" style={{ fontSize: "3.2cqw", color: "#4a463e" }}>
              {st.daysLeft == null ? "no plan" : days >= 0 ? "days left" : "days over"}
            </span>
          </div>
        </div>
      </div>
      {footer}
      {stamp && <div className="pointer-events-none absolute right-[4cqw] bottom-[4cqw]">{stamp}</div>}
    </motion.div>
  );
}
