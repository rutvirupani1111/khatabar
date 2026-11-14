"use client";
// A narrow carbon-copy receipt slip. Shared on WhatsApp as a link or saved as a PNG.
import { useRef } from "react";
import { Stamp } from "@/components/art";
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
    const url = await toPng(ref.current, { pixelRatio: 2, backgroundColor: "#EFE5CC" });
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${r.receiptNo.replace(/\//g, "-") || "pending"}.png`;
    a.click();
  };
  const line = (k: string, v: string) => (
    <div className="flex h-8 items-center justify-between gap-3">
      <span className="t-teko text-[15px]" style={{ color: "var(--muted-on-paper)" }}>
        {k}
      </span>
      <span className="carbon carbon-ghost t-mono text-right text-[13px]" data-ghost={v}>
        {v}
      </span>
    </div>
  );
  return (
    <div className="ledger-plain grid min-h-dvh place-items-center px-3 py-6" data-theme="light">
      <div className="w-full max-w-[360px]">
        <div ref={ref} className="ledger-plain relative px-5 pb-6 pt-4" style={{ boxShadow: "0 1px 0 #c9bd9e, 0 12px 30px -16px rgba(0,0,0,.45)", borderTop: "8px dotted #cbbf9f" }}>
          {r.demo && <span className="steel-tag absolute right-2 top-2">Demo receipt</span>}
          <div className="t-stencil text-center text-[30px]" style={{ color: "var(--ink)" }}>
            {r.gym}
          </div>
          <div className="t-teko text-center text-[16px]" style={{ color: "var(--carbon)" }}>
            {r.branch}
            {r.gstin ? ` · GSTIN ${r.gstin}` : ""}
          </div>
          <div className="my-2 border-t border-dashed border-[var(--carbon)]/40" />
          {line("Receipt", r.receiptNo || "not yet numbered")}
          {line("Date", r.at)}
          {line("Member", `${r.memberNo} ${r.member}`)}
          {line("For", r.plan)}
          {r.period && line("Period", r.period)}
          {line("Paid by", r.mode + (r.utr ? ` · UTR ${r.utr}` : ""))}
          {line("Taken by", r.staff)}
          {r.validTill && line("Valid till", r.validTill)}
          <div className="mt-3 flex items-end justify-between">
            <span className="t-stencil text-[40px]" style={{ color: "var(--ink)" }}>
              {rupees(r.amount)}
            </span>
            <Stamp kind={r.state === "confirmed" ? "paid" : "pending"} word={r.state === "confirmed" ? "PAID" : "PENDING"} seed={r.receiptNo || r.at} size={0.8} drop={false} />
          </div>
          <p className="t-hand mt-2 text-[13px]" style={{ color: "var(--muted-on-paper)" }}>
            Written in the Khatabar register. Prices include GST where the plan says so.
          </p>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className="btn-ink" onClick={() => void save()}>
            Save as image
          </button>
        </div>
      </div>
    </div>
  );
}

