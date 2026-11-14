"use client";
// Signature 4 logic shared by the desk, the door phone and the demo. A normal
// check-in never blocks the line; each exception stops only that member.
import { useCallback } from "react";
import { istClock } from "@/lib/core/dates";
import { uid } from "@/lib/core/money";
import { parseCode, verify } from "@/lib/core/qr";
import { derive, type MemberState } from "@/lib/core/state";
import type { CheckinMethod } from "@/lib/core/types";
import { useGym } from "@/components/shell/Gym";

export type ScanKind = "ok" | "dues" | "frozen" | "lapsed" | "already" | "old" | "bad" | "photo" | "branch" | "unknown";

export interface ScanEvent {
  id: string;
  kind: ScanKind;
  st?: MemberState;
  time: string;
  text: string;
}

export function useCheckin() {
  const { store } = useGym();

  const checkIn = useCallback(
    (memberId: string, method: CheckinMethod, opts: { force?: boolean; onCredit?: boolean } = {}): ScanEvent => {
      const snap = store.state.snap;
      const ev = (kind: ScanKind, text: string, st?: MemberState): ScanEvent => ({ id: uid(), kind, st, time: istClock(Date.now()), text });
      if (!snap) return ev("bad", "Still loading");
      const st = derive(snap).byId.get(memberId);
      if (!st) return ev("unknown", "No such member here");
      if (st.visitsToday) return ev("already", `Already in at ${istClock(st.visitsToday)}`, st);
      if (!opts.force) {
        if (st.status === "lapsed" || st.status === "none" || st.status === "upcoming") return ev("lapsed", st.endDate ? `Lapsed ${Math.abs(st.daysLeft ?? 0)} days ago` : "No running plan", st);
        if (st.frozenNow) return ev("frozen", `Frozen till ${st.frozenNow.toDate}`, st);
        if (st.dues > 0) return ev("dues", "Dues pending", st);
      }
      const r = store.run("checkin", { id: uid(), memberId, method, onCredit: !!opts.onCredit });
      if (!r.ok) return ev("bad", r.error ?? "Not saved", st);
      return ev("ok", opts.onCredit ? "Let in on credit" : "Present", st);
    },
    [store],
  );

  const scan = useCallback(
    async (raw: string, method: CheckinMethod = "desk_scan"): Promise<ScanEvent> => {
      const snap = store.state.snap;
      const ev = (kind: ScanKind, text: string, st?: MemberState): ScanEvent => ({ id: uid(), kind, st, time: istClock(Date.now()), text });
      const c = parseCode(raw);
      if (!c || !snap) return ev("bad", "Not a Khatabar code");
      const st = derive(snap).byNo.get(c.memberNo.toUpperCase());
      if (!st) return ev("unknown", `${c.memberNo} is not a member here`);
      if (!store.checkinKey) return ev("bad", "Check-in key missing. Unlock the desk again.", st);
      const v = await verify(store.checkinKey, snap.branch.code, st.m.id, c);
      if (v === "branch") return ev("branch", "Card from another branch", st);
      if (v === "bad") return ev("bad", "This code is not genuine", st);
      if (v === "old") return ev("old", "Old screenshot. Ask them to open the card again.", st);
      if (v === "photo") return ev("photo", "Photo check: compare the face, then Enter", st);
      return checkIn(st.m.id, method);
    },
    [store, checkIn],
  );

  return { checkIn, scan };
}
