"use client";
// Three effect tiers on <html data-fx>: full (default), lite (slow devices: SVG
// filters off, springs kept), calm (reduced motion or Shift+M: 150 ms crossfades).
import { useSyncExternalStore } from "react";
import { lsGet, lsSet } from "./idb";

export type Fx = "full" | "lite" | "calm";
let tier: Fx = "full";
let forcedLite = false;
const subs = new Set<() => void>();

function apply() {
  const t = forcedLite && tier === "full" ? "lite" : tier;
  document.documentElement.dataset.fx = t;
  subs.forEach((f) => f());
}

export function bootFx() {
  if (typeof window === "undefined") return;
  const saved = lsGet("kb_fx");
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (saved === "calm" || (saved !== "full" && reduce)) {
    tier = "calm";
    return apply();
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  if ((nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4) {
    tier = "lite";
    return apply();
  }
  apply();
  // median frame time over the first 60 frames
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

export function toggleCalm() {
  tier = tier === "calm" ? "full" : "calm";
  lsSet("kb_fx", tier === "calm" ? "calm" : "full");
  apply();
}

/** Queue Mode forces lite while it is on. */
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
    () => (forcedLite && tier === "full" ? "lite" : tier),
    () => "full",
  );
}
