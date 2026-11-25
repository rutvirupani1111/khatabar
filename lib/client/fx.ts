"use client";
// Three motion tiers on <html data-fx>: full (default), lite (slow phones: no parallax, no petals,
// no idle loops except blinks) and calm (reduced motion or the "Less motion" switch: final poses,
// 150 ms crossfades). The tier is set before first paint by the inline script in app/layout.tsx;
// this module keeps it in sync and watches the frame time on devices that started on full.
import { useSyncExternalStore } from "react";
import { lsSet } from "./idb";

export type Fx = "full" | "lite" | "calm";
let tier: Fx = "full";
let forcedLite = false;
let booted = false;
const subs = new Set<() => void>();

function read(): Fx {
  if (typeof document === "undefined") return "full";
  const v = document.documentElement.getAttribute("data-fx");
  return v === "calm" || v === "lite" ? v : "full";
}

function apply() {
  const t = forcedLite && tier === "full" ? "lite" : tier;
  document.documentElement.setAttribute("data-fx", t);
  subs.forEach((f) => f());
}

export function bootFx() {
  if (typeof window === "undefined" || booted) return;
  booted = true;
  tier = read();
  if (tier !== "full") return apply();
  // median frame time over the first 60 frames: a phone that cannot keep up drops to lite
  const times: number[] = [];
  let last = performance.now();
  const tick = (t: number) => {
    times.push(t - last);
    last = t;
    if (times.length < 60) requestAnimationFrame(tick);
    else {
      const med = [...times].sort((a, b) => a - b)[30];
      if (med > 22 && tier === "full" && document.visibilityState === "visible") {
        tier = "lite";
        apply();
      }
    }
  };
  requestAnimationFrame(tick);
}

export function setCalm(on: boolean) {
  if (!booted) tier = read();
  tier = on ? "calm" : "full";
  lsSet("kb_fx", on ? "calm" : "full");
  apply();
}

export function toggleCalm() {
  if (!booted) tier = read();
  setCalm(tier !== "calm");
}

/** Rush hour mode forces lite while it is on. */
export function forceLite(on: boolean) {
  forcedLite = on;
  apply();
}

export function useFx(): Fx {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => (forcedLite && tier === "full" ? "lite" : booted ? tier : read()),
    () => "full",
  );
}
