// A tiny emitter: the home page's demos say what happened, the drawn characters react.
// Kept apart from the street store so the page's first script never pulls in the demo engine.
export type StreetEvent = "found" | "renew-open" | "paid" | "waiting" | "reminded" | "freeze-approved" | "freeze-declined" | "checked-in" | "close-saved" | "imported" | "reset" | "night" | "morning" | "pick";

type Fn = (e: StreetEvent, data?: unknown) => void;
const subs = new Set<Fn>();

/** Hand-offs between scenes: "Send reminder" at the counter picks Mahesh on the fees wall; an
 *  imported member's last 4 digits wait in the counter's search box. Read once, then cleared. */
export const streetPicks: { fees?: string; counterQ?: string } = {};

export const streetBus = {
  emit(e: StreetEvent, data?: unknown) {
    subs.forEach((f) => f(e, data));
  },
  on(fn: Fn) {
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  },
};

export function goToScene(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const calm = document.documentElement.getAttribute("data-fx") === "calm";
  el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
}
