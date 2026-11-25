// What the cash drawer should hold. Used by "Close the day" at the desk and by the home page's
// night scene. staffId null counts every person at the desk (the whole branch since `since`).
import { istClock } from "./dates";
import { rupees } from "./money";
import type { Snapshot } from "./types";

export const DENOMS = [500, 200, 100, 50, 20, 10] as const;

export interface DrawerFigures {
  expected: number;
  upi: number;
  counted: number;
  counts: Record<string, number>;
  suspects: string[];
}

export function drawerFigures(snap: Snapshot, staffId: string | null, since: string, sentReceipts: string[] = []): Omit<DrawerFigures, "counted" | "counts"> {
  const mine = snap.payments.filter((p) => (staffId == null || p.receivedBy === staffId || p.confirmedBy === staffId) && p.mode !== "import" && p.createdAt >= since);
  const expected = mine.filter((p) => p.mode === "cash" && p.state === "confirmed").reduce((a, p) => a + p.amount, 0);
  const upi = mine.filter((p) => p.mode.startsWith("upi") && p.state === "confirmed").reduce((a, p) => a + p.amount, 0);
  const names = new Map(snap.members.map((m) => [m.id, m.name]));
  const suspects = [
    ...mine.filter((p) => p.state === "pending").map((p) => `UPI ${rupees(p.amount)} from ${names.get(p.memberId)} at ${istClock(p.createdAt)} is still waiting. Was it taken as cash?`),
    ...mine.filter((p) => p.reversesId).map((p) => `Reversed ${rupees(-p.amount)} for ${names.get(p.memberId)} at ${istClock(p.createdAt)}`),
    ...mine.filter((p) => p.mode === "cash" && p.state === "confirmed" && p.amount > 0 && !sentReceipts.includes(p.id)).map((p) => `Cash ${rupees(p.amount)} from ${names.get(p.memberId)} at ${istClock(p.createdAt)}, no receipt sent`),
  ];
  return { expected, upi, suspects };
}

export function countedFrom(counts: Record<string, number>) {
  return DENOMS.reduce((a, d) => a + d * (counts[d] ?? 0), 0) * 100 + (counts.coins ?? 0) * 100;
}
