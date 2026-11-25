"use client";
// The home page's demos share one in-memory demo gym. Nothing is read from or written to
// IndexedDB, so the street always starts from the seed, and what you do in one scene shows
// up in the next: renew Mahesh at the counter and his phone card at the door says so.
import { DEMO_KEY, demoSnapshot } from "@/lib/core/demo-seed";
import { Store, type Repo } from "./store";

export { goToScene, streetBus, streetPicks, type StreetEvent } from "./bus";

const idle = (fn: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 400 });
  else setTimeout(fn, 0);
};

export function streetRepo(code: "LP" | "LV" = "LP"): Repo {
  return {
    kind: "demo",
    cacheKey: `kb_street_${code}`,
    persist: false,
    load: () =>
      new Promise((resolve) =>
        idle(() => resolve({ snap: demoSnapshot(code), key: DEMO_KEY, actor: { staffId: "st-ravi", role: "desk" } })),
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
