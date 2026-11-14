import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiptSlip } from "@/components/member/ReceiptSlip";
import { fmtDay, fmtDayYear, istClock, todayIST } from "@/lib/core/dates";
import { db, hasDb } from "@/lib/server/db";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };
export const dynamic = "force-dynamic";

// A receipt is found by its payment id: a uuid v7 with 74 random bits, shared only by the gym.
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDb() || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [r] = await db.query<Record<string, unknown>>(
    `select p.*, m.name as member_name, m.member_no, o.name as gym, b.name as branch_name, b.gstin,
            pl.name_en as plan_name, ms.start_date, ms.end_date, s.name as staff_name
       from payments p
       join members m on m.id = p.member_id
       join branches b on b.id = p.branch_id
       join orgs o on o.id = b.org_id
       left join memberships ms on ms.id = p.membership_id
       left join plans pl on pl.id = ms.plan_id
       left join staff s on s.id = p.received_by
      where p.id = $1`,
    [id],
  );
  if (!r) notFound();
  const at = r.created_at as string;
  return (
    <ReceiptSlip
      r={{
        gym: r.gym as string,
        branch: r.branch_name as string,
        gstin: (r.gstin as string) ?? "",
        receiptNo: (r.receipt_no as string) ?? "",
        member: r.member_name as string,
        memberNo: r.member_no as string,
        plan: (r.plan_name as string) ?? "Dues",
        period: r.start_date ? `${fmtDay(r.start_date as string)} to ${fmtDay(r.end_date as string)}` : "",
        amount: Number(r.amount),
        mode: r.mode === "cash" ? "Cash" : r.mode === "card" ? "Card" : "UPI",
        utr: (r.utr_last4 as string) ?? "",
        staff: (r.staff_name as string) ?? "Member",
        validTill: r.end_date ? fmtDayYear(r.end_date as string) : "",
        at: `${fmtDay(todayIST(Date.parse(at)))} ${istClock(at)}`,
        state: r.state as string,
      }}
    />
  );
}
