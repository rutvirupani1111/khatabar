"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { toggleCalm } from "@/lib/client/fx";
import { rupees } from "@/lib/core/money";
import { computeSlate } from "@/lib/core/slate";
import { useGym, useGymState, useSnap } from "./Gym";

export function DemoTag() {
  const { mode, t } = useGym();
  if (mode !== "demo") return null;
  return <span className="steel-tag whitespace-nowrap">{t.demoTag}</span>;
}

export function SyncTag() {
  const q = useGymState((s) => s.queue.length);
  const online = useGymState((s) => s.online);
  const { mode, t } = useGym();
  if (mode === "demo") return <span className="t-teko text-[14px] muted">saved in this browser</span>;
  if (!online)
    return (
      <span className="hazard px-2 py-[2px]">
        <span className="t-teko bg-[var(--iron-rim)] px-1 text-[14px] text-[var(--hazard)]">
          {t.offline}: {q} {t.unsynced}
        </span>
      </span>
    );
  if (q) return <span className="steel-tag">{q} {t.unsynced}</span>;
  return <span className="t-teko text-[14px] muted">synced</span>;
}

export function MarginNotes() {
  const notes = useGymState((s) => s.notes);
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[90] flex max-w-[min(420px,calc(100vw-32px))] flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {notes.map((n) => (
          <motion.div key={n.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="ledger-plain px-4 py-2 t-hand text-[16px]" style={{ color: n.tone === "red" ? "var(--margin-red)" : "var(--ink)", boxShadow: "0 6px 16px -8px #000", borderLeft: "3px double var(--margin-red)" }}>
            {n.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const NAV = [
  { k: "desk", href: "/desk", key: "" },
  { k: "rack", href: "/rack", key: "G D" },
  { k: "board", href: "/board", key: "G W" },
  { k: "owner", href: "/owner", key: "G O" },
  { k: "importSheet", href: "/import", key: "G I" },
  { k: "door", href: "/door", key: "" },
] as const;

export function TopBar({ right, compact }: { right?: ReactNode; compact?: boolean }) {
  const { base, t, lang, setLang, mode, calm } = useGym();
  const snap = useSnap();
  const path = usePathname();
  const router = useRouter();
  const slate = snap ? computeSlate(snap) : null;
  const [g, setG] = useState(false);

  // G then a letter jumps between screens; Ctrl+B opens the branch switcher
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input,textarea,select,[contenteditable]")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) {
        if (e.ctrlKey && e.key.toLowerCase() === "b") {
          e.preventDefault();
          document.getElementById("kb-branch")?.focus();
        }
        return;
      }
      if (e.key === "g" || e.key === "G") {
        if (e.shiftKey) return;
        setG(true);
        clearTimeout(timer);
        timer = setTimeout(() => setG(false), 1200);
        return;
      }
      if (!g) return;
      const map: Record<string, string> = { d: "/rack", w: "/board", u: "/desk?upi=1", o: "/owner", i: "/import" };
      const to = map[e.key.toLowerCase()];
      setG(false);
      if (to) {
        e.preventDefault();
        router.push(base + to + (mode === "demo" && snap?.branch.code === "LV" ? (to.includes("?") ? "&b=LV" : "?b=LV") : ""));
      }
    };
    window.addEventListener("keydown", on);
    return () => {
      window.removeEventListener("keydown", on);
      clearTimeout(timer);
    };
  }, [g, base, router, mode, snap]);

  const suffix = mode === "demo" && snap?.branch.code === "LV" ? "?b=LV" : "";
  return (
    <header className="iron relative z-30 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-4" style={{ clipPath: "none", borderWidth: "0 0 2px" }}>
      <div className="flex min-w-0 items-center gap-3">
        <Link href={mode === "demo" ? "/" : `${base}/desk`} className="t-stencil stamped text-[24px] leading-none" style={{ color: "var(--brass)" }}>
          {snap?.org.name ?? "Khatabar"}
        </Link>
        {snap && (
          <select
            id="kb-branch"
            aria-label="Branch (Ctrl+B)"
            className="t-teko h-8 bg-[var(--rubber)] px-2 text-[16px] text-[var(--chalk)]"
            value={snap.branch.id}
            onChange={(e) => {
              const b = snap.branches.find((x) => x.id === e.target.value);
              if (!b) return;
              if (mode === "demo") window.location.href = `/demo${path.replace(/^\/demo/, "")}${b.code === "LV" ? "?b=LV" : ""}`;
              else window.location.href = `/g/${b.id}${path.replace(/^\/g\/[^/]+/, "")}`;
            }}
          >
            {snap.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <DemoTag />
      </div>
      {slate && !compact && (
        <div className="hidden items-center gap-4 xl:flex" aria-label="Today at a glance">
          <span className="t-teko text-[17px]">
            <span lang="hi">{t.endingToday}</span> <b className="t-stencil text-[22px]" style={{ color: "var(--plate-15)" }}>{slate.endingToday.length}</b>
          </span>
          <span className="t-teko text-[17px]">
            {t.dues} <b className="t-stencil text-[22px]" style={{ color: "var(--plate-25)" }}>{rupees(slate.dues.total)}</b>
          </span>
          {slate.drawer.state === "open" ? (
            <span className="hazard px-1 py-[2px]">
              <span className="t-teko bg-[var(--iron-rim)] px-1 text-[15px] text-[var(--hazard)]">Drawer not closed</span>
            </span>
          ) : (
            <span className="t-teko text-[15px] muted">{slate.checkinsToday} in today</span>
          )}
        </div>
      )}
      <nav className="ml-auto flex flex-wrap items-center gap-1" aria-label="Screens">
        {NAV.map((n) => {
          const on = path.endsWith(n.href);
          return (
            <Link key={n.k} href={`${base}${n.href}${suffix}`} aria-current={on ? "page" : undefined} className="t-teko px-2 py-1 text-[16px]" style={{ color: on ? "var(--brass-hi)" : "var(--chalk-dust)", borderBottom: on ? "2px solid var(--brass)" : "2px solid transparent" }} title={n.key ? `${t[n.k]} (${n.key})` : t[n.k]}>
              {t[n.k]}
            </Link>
          );
        })}
        {mode === "live" && (
          <Link href={`${base}/settings`} className="t-teko px-2 py-1 text-[16px]" style={{ color: "var(--chalk-dust)" }}>
            {t.settings}
          </Link>
        )}
        <button type="button" className="t-teko px-2 py-1 text-[15px] muted" onClick={() => setLang(lang === "en" ? "hi" : "en")}>
          {lang === "en" ? "हिंदी" : "EN"}
        </button>
        <button type="button" className="t-teko px-2 py-1 text-[15px] muted" aria-pressed={calm} onClick={toggleCalm} title="Calm mode (Shift+M)">
          {calm ? "Calm on" : "Calm"}
        </button>
        <SyncTag />
        {right}
      </nav>
      {g && <span className="absolute right-3 top-full mt-1 steel-tag">G then D, W, U, O or I</span>}
    </header>
  );
}

/** Blank ruled lines at the exact final row height while the register loads. */
export function RegisterSkeleton({ rows = 14 }: { rows?: number }) {
  return (
    <div className="ledger h-full" aria-busy="true" aria-label="Loading the register">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-8 items-center gap-3 pl-[72px] pr-4">
          <span className="skeleton block h-[3px] rounded" style={{ width: `${30 + ((i * 37) % 50)}%`, background: "var(--chalk-dust)" }} />
        </div>
      ))}
    </div>
  );
}
