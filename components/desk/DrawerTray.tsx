"use client";
// Shutter Down, part one: count the drawer. Notes stack up one per count; the
// expected figure is only confirmed cash taken by this person this shift.
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { istClock } from "@/lib/core/dates";
import { rupees } from "@/lib/core/money";
import type { Snapshot } from "@/lib/core/types";
import { lsGet } from "@/lib/client/idb";

const DENOMS = [500, 200, 100, 50, 20, 10] as const;
const NOTE_COLOR: Record<number, string> = { 500: "#9a9d93", 200: "#d9a441", 100: "#8f86b8", 50: "#6fb4b8", 20: "#b9c46a", 10: "#b48a5c" };

export interface DrawerFigures {
  expected: number;
  upi: number;
  counted: number;
  counts: Record<string, number>;
  suspects: string[];
}

export function drawerFigures(snap: Snapshot, staffId: string | null, since: string): Omit<DrawerFigures, "counted" | "counts"> {
  const mine = snap.payments.filter((p) => (p.receivedBy === staffId || p.confirmedBy === staffId) && p.createdAt >= since);
  const expected = mine.filter((p) => p.mode === "cash" && p.state === "confirmed").reduce((a, p) => a + p.amount, 0);
  const upi = mine.filter((p) => p.mode.startsWith("upi") && p.state === "confirmed").reduce((a, p) => a + p.amount, 0);
  const names = new Map(snap.members.map((m) => [m.id, m.name]));
  let sent: string[] = [];
  try {
    sent = JSON.parse(lsGet("kb_receipts_sent") ?? "[]");
  } catch {}
  const suspects = [
    ...mine.filter((p) => p.state === "pending").map((p) => `UPI ${rupees(p.amount)} from ${names.get(p.memberId)} at ${istClock(p.createdAt)} was never confirmed. Taken as cash?`),
    ...mine.filter((p) => p.reversesId).map((p) => `Reversed ${rupees(-p.amount)} for ${names.get(p.memberId)} at ${istClock(p.createdAt)}`),
    ...mine.filter((p) => p.mode === "cash" && p.state === "confirmed" && p.amount > 0 && !sent.includes(p.id)).map((p) => `Cash ${rupees(p.amount)} from ${names.get(p.memberId)} at ${istClock(p.createdAt)}, no receipt sent`),
  ];
  return { expected, upi, suspects };
}

export function DrawerTray({ snap, staffId, since, onCount, onCancel }: { snap: Snapshot; staffId: string | null; since: string; onCount: (f: DrawerFigures) => void; onCancel: () => void }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [coins, setCoins] = useState(0);
  const [row, setRow] = useState(0);
  const typed = useRef("");
  const fig = useMemo(() => drawerFigures(snap, staffId, since), [snap, staffId, since]);
  const counted = DENOMS.reduce((a, d) => a + d * (counts[d] ?? 0), 0) * 100 + coins * 100;

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input")) return;
      const max = DENOMS.length; // last row = coins
      if (e.key === "ArrowDown" || e.key === "j") {
        setRow((r) => Math.min(max, r + 1));
        typed.current = "";
      } else if (e.key === "ArrowUp" || e.key === "k") {
        setRow((r) => Math.max(0, r - 1));
        typed.current = "";
      } else if (/^\d$/.test(e.key)) {
        typed.current = (typed.current + e.key).slice(-4);
        const n = Number(typed.current);
        if (row === max) setCoins(n);
        else setCounts((c) => ({ ...c, [DENOMS[row]]: n }));
      } else if (e.key === "+" || e.key === "=") {
        if (row === max) setCoins((c) => c + 1);
        else setCounts((c) => ({ ...c, [DENOMS[row]]: (c[DENOMS[row]] ?? 0) + 1 }));
      } else if (e.key === "-") {
        if (row === max) setCoins((c) => Math.max(0, c - 1));
        else setCounts((c) => ({ ...c, [DENOMS[row]]: Math.max(0, (c[DENOMS[row]] ?? 0) - 1) }));
      } else if (e.key === "Backspace") {
        typed.current = typed.current.slice(0, -1);
        const n = Number(typed.current || 0);
        if (row === max) setCoins(n);
        else setCounts((c) => ({ ...c, [DENOMS[row]]: n }));
      } else if (e.key === "Enter") {
        onCount({ ...fig, counted, counts: { ...Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v])), coins } });
      } else if (e.key === "Escape") onCancel();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, [row, fig, counted, counts, coins, onCount, onCancel]);

  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapRow = (d: number, i: number) => ({
    onPointerDown: () => {
      setRow(i);
      press.current = setTimeout(() => {
        setCounts((c) => ({ ...c, [d]: Math.max(0, (c[d] ?? 0) - 1) }));
        press.current = null;
      }, 450);
    },
    onPointerUp: () => {
      if (press.current) {
        clearTimeout(press.current);
        press.current = null;
        setCounts((c) => ({ ...c, [d]: (c[d] ?? 0) + 1 }));
      }
    },
  });

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div role="dialog" aria-modal="true" aria-label="Drawer count" className="iron w-full max-w-[760px] p-4 sm:p-5" initial={{ y: 80 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 420, damping: 32 }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="t-stencil text-[30px]" style={{ color: "var(--brass)" }}>
            Count the drawer
          </h2>
          <span className="t-teko text-[15px] muted">↑ ↓ rows · type a count · + − step · tap a stack, long-press to remove · Enter</span>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_220px]">
          <div className="flex flex-col">
            {DENOMS.map((d, i) => (
              <div key={d} className="flex h-10 items-center gap-3 px-2" style={{ outline: row === i ? "2px solid var(--focus)" : undefined, outlineOffset: -2 }}>
                <span className="t-stencil w-14 text-[22px]">₹{d}</span>
                <button type="button" aria-label={`Add one ₹${d} note (now ${counts[d] ?? 0})`} className="relative h-8 flex-1 touch-none overflow-hidden" {...tapRow(d, i)}>
                  {Array.from({ length: Math.min(40, counts[d] ?? 0) }, (_, k) => (
                    <motion.span key={k} className="absolute top-1 block h-6 w-[22px]" style={{ left: k * 7, background: NOTE_COLOR[d], border: "1px solid rgba(0,0,0,.4)", boxShadow: "1px 0 0 rgba(255,255,255,.3) inset" }} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                  ))}
                </button>
                <span className="t-mono w-10 text-right text-[15px]">{counts[d] ?? 0}</span>
                <span className="t-mono w-24 text-right text-[14px] muted">{rupees(d * (counts[d] ?? 0) * 100)}</span>
              </div>
            ))}
            <div className="flex h-10 items-center gap-3 px-2" style={{ outline: row === DENOMS.length ? "2px solid var(--focus)" : undefined, outlineOffset: -2 }}>
              <span className="t-stencil w-14 text-[20px]">Coins</span>
              <input aria-label="Coins in rupees" inputMode="numeric" className="field-floor t-mono h-8 w-28" value={coins || ""} onFocus={() => setRow(DENOMS.length)} onChange={(e) => setCoins(Number(e.target.value.replace(/\D/g, "")) || 0)} />
              <span className="t-mono ml-auto w-24 text-right text-[14px] muted">{rupees(coins * 100)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <div className="t-teko text-[15px] muted">Expected cash (yours, this shift)</div>
              <div className="t-mono text-[22px]">{rupees(fig.expected)}</div>
            </div>
            <div>
              <div className="t-teko text-[15px] muted">Counted</div>
              <div className="t-mono text-[22px]" style={{ color: counted === fig.expected ? "var(--plate-10)" : "var(--chalk)" }}>
                {rupees(counted)}
              </div>
            </div>
            <div>
              <div className="t-teko text-[15px] muted">UPI received (read only)</div>
              <div className="t-mono text-[17px] muted">{rupees(fig.upi)}</div>
            </div>
            <div className="mt-auto flex gap-2">
              <button type="button" className="btn-brass" onClick={() => onCount({ ...fig, counted, counts: { ...counts, coins } as Record<string, number> })}>
                Close shift
              </button>
              <button type="button" className="btn-iron" onClick={onCancel}>
                Esc
              </button>
            </div>
          </div>
        </div>
        <p className="t-hand mt-3 text-[14px]" style={{ color: "var(--chalk-dust)" }}>
          The count protects the desk: if it matches, nobody can question this shift later.
        </p>
      </motion.div>
    </motion.div>
  );
}
