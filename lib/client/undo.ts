"use client";
// Undo a payment the desk just took. A change that has not reached the server yet is simply
// dropped; anything already saved gets a written reversal line, never a silent delete.
import { uid } from "@/lib/core/money";
import type { Store } from "./store";

export interface Taken {
  opId: string;
  paymentIds: string[];
  at: number;
}

export const UNDO_MS = 8000;

export function undoPayment(store: Store, t: Taken): { ok: boolean; text: string } {
  if (Date.now() - t.at > 60_000) return { ok: false, text: "Too late to undo here. A manager can write a reversal." };
  if (store.dropUnsynced(t.opId)) return { ok: true, text: "Undone. Nothing was saved." };
  for (const id of t.paymentIds) {
    const r = store.run("payment.reverse", { id, reversalId: uid(), undo: true });
    if (!r.ok) return { ok: false, text: r.error ?? "Could not undo" };
  }
  return { ok: true, text: "Undone. A reversal line was written in the history." };
}
