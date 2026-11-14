"use client";
import { useSnap } from "@/components/shell/Gym";
import { fmtDay, fmtDayYear, istClock, todayIST } from "@/lib/core/dates";
import { termEnd } from "@/lib/core/state";
import { ReceiptSlip } from "./ReceiptSlip";

/** Demo: the receipt is read from this browser's demo register. */
export function Receipt({ paymentId }: { paymentId: string }) {
  const snap = useSnap();
  if (!snap) return <div className="ledger-plain min-h-dvh" />;
  const p = snap.payments.find((x) => x.id === paymentId);
  if (!p) return <div className="ledger-plain grid min-h-dvh place-items-center t-hand text-[20px]">This receipt is not in this browser&apos;s demo register.</div>;
  const m = snap.members.find((x) => x.id === p.memberId);
  const ms = snap.memberships.find((x) => x.id === p.membershipId);
  const plan = ms ? snap.plans.find((x) => x.id === ms.planId) : null;
  const end = ms ? termEnd(ms, snap.freezes) : "";
  return (
    <ReceiptSlip
      r={{
        demo: true,
        gym: snap.org.name,
        branch: snap.branch.name,
        gstin: snap.branch.gstin,
        receiptNo: p.receiptNo,
        member: m?.name ?? "",
        memberNo: m?.memberNo ?? "",
        plan: plan?.nameEn ?? "Dues",
        period: ms ? `${fmtDay(ms.startDate)} to ${fmtDay(end)}` : "",
        amount: p.amount,
        mode: p.mode === "cash" ? "Cash" : p.mode === "card" ? "Card" : "UPI",
        utr: p.utrLast4,
        staff: snap.staff.find((s) => s.id === p.receivedBy)?.name ?? "Member",
        validTill: end ? fmtDayYear(end) : "",
        at: `${fmtDay(todayIST(Date.parse(p.createdAt)))} ${istClock(p.createdAt)}`,
        state: p.state,
      }}
    />
  );
}
