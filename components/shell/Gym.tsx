"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { todayIST } from "@/lib/core/dates";
import { derive, type Derived } from "@/lib/core/state";
import type { Lang, Snapshot } from "@/lib/core/types";
import { lsGet, lsSet } from "@/lib/client/idb";
import { useFx, type Fx } from "@/lib/client/fx";
import { Store, useStore, type Repo, type StoreState } from "@/lib/client/store";
import en, { type Dict } from "@/lib/i18n/en";
import hi from "@/lib/i18n/hi";

export interface GymCtx {
  store: Store;
  mode: "demo" | "live";
  base: string; // "/demo" or "/g/<branchId>"
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  fx: Fx;
  calm: boolean;
  today: string;
  /** true inside the home page's scenes: no WhatsApp, no UPI app, no navigation away */
  street: boolean;
}

const Ctx = createContext<GymCtx | null>(null);

export function useGym() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGym outside GymProvider");
  return c;
}

export function useGymState<T>(sel: (s: StoreState) => T): T {
  return useStore(useGym().store, sel);
}

export function useSnap(): Snapshot | null {
  return useGymState((s) => s.snap);
}

export function useDerived(): Derived | null {
  const snap = useSnap();
  const { today } = useGym();
  return useMemo(() => (snap ? derive(snap, today) : null), [snap, today]);
}

function useToday() {
  const [t, setT] = useState(() => todayIST());
  useEffect(() => {
    const id = setInterval(() => setT(todayIST()), 60000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export function GymProvider({ repo, store: given, mode, base, street = false, children }: { repo?: () => Repo; store?: Store; mode: "demo" | "live"; base: string; street?: boolean; children: ReactNode }) {
  const [store] = useState(() => given ?? new Store(repo!()));
  const [lang, setLangS] = useState<Lang>("en");
  const fx = useFx();
  const today = useToday();
  useEffect(() => {
    void store.init();
    if (!street && lsGet("kb_lang") === "hi") setLangS("hi");
    // a shared store outlives this screen; only a store made here is shut down with it
    return () => {
      if (!given) store.dispose();
    };
  }, [store, given, street]);
  useEffect(() => {
    if (!street) document.documentElement.lang = lang;
  }, [lang, street]);
  const value = useMemo<GymCtx>(
    () => ({
      store,
      mode,
      base,
      lang,
      setLang: (l) => {
        setLangS(l);
        if (!street) {
          lsSet("kb_lang", l);
          document.documentElement.setAttribute("data-lang", l);
        }
      },
      t: lang === "hi" ? hi : en,
      fx,
      calm: fx === "calm",
      today,
      street,
    }),
    [store, mode, base, lang, fx, today, street],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
