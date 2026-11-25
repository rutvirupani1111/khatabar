"use client";
// A receipt the gym sends on WhatsApp as a link: paper, money in a fixed-width face, a PAID stamp
// only when the money was confirmed by the desk.
import { useRef } from "react";
import { Chip, PaidStamp } from "@/components/ui/Status";
import { KbMark } from "@/components/ui/Icon";
import { rupees } from "@/lib/core/money";

export interface ReceiptData {
  gym: string;
  branch: string;
  gstin: string;
  receiptNo: string;
  member: string;
  memberNo: string;
  plan: string;
  period: string;
  amount: number;
  mode: string;
  utr: string;
  staff: string;
  validTill: string;
  at: string;
  state: string;
  demo?: boolean;
}

export function ReceiptSlip({ r }: { r: ReceiptData }) {
  const ref = useRef<HTMLDivElement>(null);
  const save = async () => {
    if (!ref.current) return;
    const { toPng } = await import("html-to-image");
    const url = await toPng(ref.current, { pixelRatio: 2, backgroundColor: "#FFFBF2" });
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${r.receiptNo.replace(/\//g, "-") || "pending"}.png`;
    a.click();
  };
  const line = (k: string, v: string) => (
    <div className="flex min-h-9 items-center justify-between gap-3 border-b border-dashed border-[var(--line)]">
      <span className="text-[14px] text-[var(--muted-ink)]">{k}</span>
      <span className="t-mono text-right text-[14px]">{v}</span>
    </div>
  );
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--cream)] px-3 py-6">
      <div className="w-full max-w-[380px]">
        <div ref={ref} className="panel relative px-5 pb-5 pt-4">
          {r.demo && <span className="absolute right-3 top-3 rounded-full bg-[var(--marigold)] px-2 py-0.5 text-[12px] font-bold">Demo receipt</span>}
          <div className="flex items-center gap-2">
            <KbMark size={26} />
            <div>
              <div className="t-display text-[22px] leading-tight">{r.gym}</div>
              <div className="text-[13px] text-[var(--muted-ink)]">
                {r.branch}
                {r.gstin ? ` · GSTIN ${r.gstin}` : ""}
              </div>
            </div>
          </div>
          <div className="mt-3">
            {line("Receipt", r.receiptNo || "Number given when the desk confirms")}
            {line("Date", r.at)}
            {line("Member", `${r.member} (${r.memberNo})`)}
            {line("For", r.plan)}
            {r.period && line("Period", r.period)}
            {line("Paid by", r.mode + (r.utr ? ` · UPI ref ${r.utr}` : ""))}
            {line("Taken by", r.staff)}
            {r.validTill && line("Valid till", r.validTill)}
          </div>
          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="t-mono text-[34px] font-medium">{rupees(r.amount)}</span>
            {r.state === "confirmed" ? <PaidStamp size={0.8} /> : <Chip kind="wait" text="Waiting for money" />}
          </div>
          <p className="mt-2 text-[13px] text-[var(--muted-ink)]">Prices include GST where the plan says so.</p>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className="btn" onClick={() => void save()}>
            Save as image
          </button>
        </div>
      </div>
    </div>
  );
}
