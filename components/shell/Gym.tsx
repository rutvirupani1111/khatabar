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

export function GymProvider({ repo, mode, base, children }: { repo: () => Repo; mode: "demo" | "live"; base: string; children: ReactNode }) {
  const [store] = useState(() => new Store(repo()));
  const [lang, setLangS] = useState<Lang>("en");
  const fx = useFx();
  const today = useToday();
  useEffect(() => {
    void store.init();
    const saved = lsGet("kb_lang");
    if (saved === "hi") setLangS("hi");
    return () => store.dispose();
  }, [store]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo<GymCtx>(
    () => ({
      store,
      mode,
      base,
      lang,
      setLang: (l) => {
        setLangS(l);
        lsSet("kb_lang", l);
      },
      t: lang === "hi" ? hi : en,
      fx,
      calm: fx === "calm",
      today,
    }),
    [store, mode, base, lang, fx, today],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
