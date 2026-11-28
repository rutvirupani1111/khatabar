"use client";
// The home page's demos share one in-memory demo gym. Nothing is read from or written to
// IndexedDB, so the street always starts from the seed, and what you do in one scene shows
// up in the next: renew Mahesh at the counter and his phone card at the door says so.
import { addDays, todayIST } from "@/lib/core/dates";
import { DEMO_KEY, demoSnapshot } from "@/lib/core/demo-seed";
import type { Snapshot } from "@/lib/core/types";
import { Store, type Repo } from "./store";

export { goToScene, streetBus, streetPicks, type StreetEvent } from "./bus";

const idle = (fn: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 400 });
  else setTimeout(fn, 0);
};

/** The street's day has already had a few cash renewals at the counter, so the night scene's
 *  drawer has real money to count (and the next morning's report shows the same day). Only the
 *  time of two small existing cash payments (monthly plans, about ₹2,400 in all, a few notes to
 *  count) moves; amounts, dues and receipts stay as seeded. */
function withTodaysCash(snap: Snapshot, now = Date.now()): Snapshot {
  const today = todayIST(now);
  const dayStart = Date.parse(`${today}T00:00:00+05:30`);
  const cutoff = addDays(today, -2);
  let moved = 0;
  for (const p of [...snap.payments].reverse()) {
    if (moved >= 2) break;
    if (p.mode !== "cash" || p.state !== "confirmed" || p.amount <= 0 || p.amount > 170000 || p.reversesId) continue;
    if (todayIST(Date.parse(p.createdAt)) >= cutoff) continue;
    const at = Math.max(dayStart + 60_000 * (moved + 1), Math.min(now - 15 * 60_000 * (moved + 1), dayStart + (6 * 60 + 10 + moved * 12) * 60_000));
    const iso = new Date(at).toISOString();
    p.createdAt = iso;
    p.confirmedAt = iso;
    moved++;
  }
  return snap;
}

export function streetRepo(code: "LP" | "LV" = "LP"): Repo {
  return {
    kind: "demo",
    cacheKey: `kb_street_${code}`,
    persist: false,
    load: () =>
      new Promise((resolve) =>
        idle(() => resolve({ snap: withTodaysCash(demoSnapshot(code)), key: DEMO_KEY, actor: { staffId: "st-ravi", role: "desk" } })),
      ),
  };
}

let main: Store | null = null;
let other: Store | null = null;

/** The one street store (Maninagar). Created on first use, never before scene 2 is near. */
export function streetStore(): Store {
  if (!main) {
    main = new Store(streetRepo("LP"));
    void main.init();
  }
  return main;
}

/** Vastrapur, built only when someone opens its tab in the morning report. */
export function streetStoreLV(): Store {
  if (!other) {
    other = new Store(streetRepo("LV"));
    void other.init();
  }
  return other;
}
