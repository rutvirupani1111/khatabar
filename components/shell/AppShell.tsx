"use client";
// One labelled menu on every app screen, the same in the demo and in a real gym.
// Desktop: an indigo bar (gym, branch, money waiting, close the day, help) over a row of tabs.
// Phone: a slim top bar and a bottom tab bar, with everything else in "More". No sideways scrolling.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toggleCalm } from "@/lib/client/fx";
import { lsSet, ssSet } from "@/lib/client/idb";
import { rupees } from "@/lib/core/money";
import type { Dict } from "@/lib/i18n/en";
import { Icon, KbMark, type IconName } from "@/components/ui/Icon";
import { Vignette, type VignetteKind } from "@/components/world/Vignettes";
import { WorldDefs } from "@/components/world/kit";
import { useGym, useGymState, useSnap } from "./Gym";
import { CloseDay, ShortcutSheet, WaitingList } from "./Overlays";

export type ScreenKey = "desk" | "fees" | "freeze" | "report" | "import" | "door" | "settings";
type Overlay = null | "upi" | "close" | "keys" | "more" | "help" | "acct" | "deskmore";

const SCREENS: { k: ScreenKey; path: string; label: keyof Dict; icon: IconName; mgr?: boolean }[] = [
  { k: "desk", path: "/desk", label: "desk", icon: "home" },
  { k: "fees", path: "/fees", label: "rack", icon: "chat" },
  { k: "freeze", path: "/freeze", label: "board", icon: "snow" },
  { k: "report", path: "/report", label: "owner", icon: "chart", mgr: true },
  { k: "import", path: "/import", label: "importSheet", icon: "upload", mgr: true },
  { k: "door", path: "/door", label: "door", icon: "door" },
  { k: "settings", path: "/settings", label: "settings", icon: "settings", mgr: true },
];

interface ShellCtx {
  open: (o: "upi" | "close" | "keys") => void;
}
const Ctx = createContext<ShellCtx>({ open: () => {} });
export const useShell = () => useContext(Ctx);

function useLinks() {
  const { base, mode } = useGym();
  const snap = useSnap();
  const actor = useGymState((s) => s.actor);
  const suffix = mode === "demo" && snap?.branch.code === "LV" ? "?b=LV" : "";
  // the demo shows every screen; a real gym shows owner screens to owners and managers only
  const canMgr = mode === "demo" || actor.role === "owner" || actor.role === "manager";
  const list = SCREENS.filter((s) => !s.mgr || canMgr).map((s) => ({ ...s, href: `${base}${s.path}${suffix}` }));
  return { list, suffix };
}

export function AppScreen({ screen, title, sentence, vignette, actions, children, headerless }: { screen: ScreenKey; title: string; sentence: string; vignette?: VignetteKind; actions?: ReactNode; children: ReactNode; headerless?: boolean }) {
  const { mode, t, base } = useGym();
  const snap = useSnap();
  const router = useRouter();
  const params = useSearchParams();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const { list, suffix } = useLinks();
  const pending = snap ? snap.payments.filter((p) => p.state === "pending") : [];
  const close = useCallback(() => setOverlay(null), []);
  const open = useCallback((o: "upi" | "close" | "keys") => setOverlay(o), []);

  // ?upi=1 opens the "Waiting for money" list (G then U from any screen)
  useEffect(() => {
    if (params.get("upi") === "1") setOverlay("upi");
  }, [params]);

  // G then a letter jumps between screens; Ctrl+B focuses the branch; ? lists every key
  useEffect(() => {
    let g = 0;
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const inField = !!el.closest("input,textarea,select,[contenteditable]");
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        return setOverlay("close");
      }
      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        return document.getElementById("kb-branch")?.focus();
      }
      if (inField || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "M" && e.shiftKey) return toggleCalm();
      if (e.key === "?") {
        e.preventDefault();
        return setOverlay((o) => (o === "keys" ? null : "keys"));
      }
      if (e.key === "g" || e.key === "G") {
        if (e.shiftKey) return;
        g = Date.now();
        return;
      }
      if (Date.now() - g > 1200) return;
      const map: Record<string, string> = { d: "/fees", w: "/freeze", o: "/report", i: "/import", u: "/desk?upi=1" };
      const to = map[e.key.toLowerCase()];
      g = 0;
      if (!to) return;
      e.preventDefault();
      if (to.includes("upi")) setOverlay("upi");
      else router.push(base + to + suffix);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [router, base, suffix]);

  const ctx = useMemo(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={ctx}>
      <div className="has-tabbar flex min-h-dvh flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        <WorldDefs />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-[var(--paper)] focus:p-2">
          Skip to the screen
        </a>
        <header className="on-dark sticky top-0 z-40 text-[var(--cream)]" style={{ background: "var(--indigo)" }}>
          <div className="flex h-[52px] items-center gap-3 px-3 md:h-14 md:px-5">
            <Link href={mode === "demo" ? `/demo/desk${suffix}` : `${base}/desk`} className="flex min-w-0 items-center gap-2" style={{ viewTransitionName: "kb-logo" }}>
              <KbMark size={28} onDark />
              <span className="t-display truncate text-[18px] font-bold md:text-[20px]" style={{ fontWeight: 700 }}>
                {snap?.org.name ?? "Khatabar"}
              </span>
            </Link>
            {snap && <BranchPicker />}
            <div className="ml-auto flex items-center gap-2">
              {pending.length > 0 && (
                <button type="button" className="chip chip-wait hidden !h-9 lg:inline-flex" onClick={() => setOverlay("upi")}>
                  <Icon name="clock" size={14} /> {t.upiToMatch} ({pending.length})
                </button>
              )}
              <button type="button" className="btn btn-ondark btn-sm hidden lg:inline-flex" onClick={() => setOverlay("close")}>
                {t.closeShift}
              </button>
              <Menu label={t.help} icon="help" open={overlay === "help"} onOpen={() => setOverlay(overlay === "help" ? null : "help")} onClose={close}>
                {mode === "demo" && (
                  <MenuItem
                    onClick={() => {
                      lsSet("kb_tour_desk_done", "");
                      ssSet("kb_tour_desk_done", "");
                      window.location.href = `/demo/desk?tour=1${suffix ? "&b=LV" : ""}`;
                    }}
                    icon="spark"
                  >
                    {t.tourAgain}
                  </MenuItem>
                )}
                <MenuItem onClick={() => setOverlay("keys")} icon="keyboard">
                  {t.shortcuts}
                </MenuItem>
                <MenuItem onClick={() => (toggleCalm(), close())} icon="spark">
                  {t.calm}
                </MenuItem>
                <MenuItem href="/#how" icon="help">
                  How Khatabar works
                </MenuItem>
              </Menu>
              <LangButton />
              {mode === "live" ? (
                <Menu label="Account" icon="user" open={overlay === "acct"} onOpen={() => setOverlay(overlay === "acct" ? null : "acct")} onClose={close} iconOnly>
                  <MenuItem href={`${base}/settings`} icon="settings">
                    {t.settings}
                  </MenuItem>
                  <MenuItem
                    icon="out"
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
                      window.location.href = "/login";
                    }}
                  >
                    {t.signOut}
                  </MenuItem>
                </Menu>
              ) : (
                <Link href="/" className="btn btn-ondark btn-sm hidden xl:inline-flex">
                  {t.exitDemo}
                </Link>
              )}
            </div>
          </div>
          {/* tablet and desktop tabs */}
          <nav aria-label="Screens" className="hidden h-12 items-stretch gap-1 border-t border-white/15 px-3 md:flex md:px-5">
            {list.map((s, i) => (
              <Tab key={s.k} href={s.href} on={s.k === screen} icon={s.icon} cls={i >= 3 ? (s.k === "report" ? "hidden lg:flex" : "hidden xl:flex") : ""}>
                {t[s.label]}
              </Tab>
            ))}
            <MoreTab list={list} screen={screen} t={t} />
          </nav>
        </header>
        {mode === "demo" && (
          <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1 text-[14px] font-semibold md:px-5" style={{ background: "var(--marigold)", color: "var(--ink)", borderBottom: "2px solid var(--ink)" }} role="note">
            <span>{t.demoBanner}</span>
            <span className="ml-auto flex gap-2">
              <Link href="/start" className="btn btn-sm !min-h-8 !bg-[var(--paper)]">
                {t.startMine}
              </Link>
              <Link href="/" className="btn btn-sm !min-h-8 !bg-[var(--paper)] xl:hidden">
                {t.exitDemo}
              </Link>
            </span>
          </div>
        )}
        {!headerless && (
          <div className="border-b-2 border-[var(--ink)] bg-[var(--paper)]">
            <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-4 py-3 md:min-h-[88px] md:px-6">
              <div className="min-w-0 flex-1">
                <h1 className="t-display text-[22px] md:text-[28px]" style={{ fontWeight: 700 }}>
                  {title}
                </h1>
                <p className="text-[15px] leading-snug text-[var(--muted-ink)]">{sentence}</p>
              </div>
              {actions && <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>}
              {vignette && (
                <div className="hidden h-[72px] w-[180px] shrink-0 overflow-hidden rounded-xl border-2 border-[var(--ink)] lg:block">
                  <Vignette kind={vignette} />
                </div>
              )}
            </div>
          </div>
        )}
        <main id="main" className="flex min-h-0 flex-1 flex-col">
          {children}
        </main>
        <BottomTabs list={list} screen={screen} onMore={() => setOverlay("more")} t={t} />
        <Toasts />
        {overlay === "more" && <MoreSheet list={list} screen={screen} onClose={close} onOpen={(o) => setOverlay(o)} pending={pending.length} />}
        {overlay === "upi" && snap && <WaitingList onClose={close} />}
        {overlay === "close" && snap && <CloseDay onClose={close} />}
        {overlay === "keys" && <ShortcutSheet onClose={close} />}
      </div>
    </Ctx.Provider>
  );
}

function BranchPicker() {
  const { mode, t } = useGym();
  const snap = useSnap()!;
  const path = usePathname();
  if (snap.branches.length < 2)
    return (
      <span className="hidden text-[14px] font-semibold opacity-90 sm:inline">
        {t.branch}: {snap.branch.name}
      </span>
    );
  return (
    <label className="flex items-center gap-2 text-[14px] font-semibold">
      <span className="hidden sm:inline">{t.branch}</span>
      <select
        id="kb-branch"
        aria-label={t.branch}
        className="h-9 max-w-[140px] rounded-lg border-2 border-[var(--cream)] bg-[var(--indigo)] px-2 text-[15px] font-semibold text-[var(--cream)]"
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
    </label>
  );
}

function LangButton() {
  const { lang, setLang } = useGym();
  return (
    <button type="button" className="btn btn-ondark btn-sm !px-3" onClick={() => setLang(lang === "en" ? "hi" : "en")} lang={lang === "en" ? "hi" : "en"}>
      {lang === "en" ? "हिंदी" : "English"}
    </button>
  );
}

function Tab({ href, on, icon, children, cls = "" }: { href: string; on: boolean; icon: IconName; children: ReactNode; cls?: string }) {
  return (
    <Link href={href} aria-current={on ? "page" : undefined} className={`flex items-center gap-2 whitespace-nowrap px-3 text-[16px] font-semibold ${cls}`} style={{ borderBottom: on ? "3px solid var(--marigold)" : "3px solid transparent", color: on ? "var(--cream)" : "rgba(255,244,222,.82)" }}>
      <Icon name={icon} size={18} />
      {children}
    </Link>
  );
}

function MoreTab({ list, screen, t }: { list: { k: ScreenKey; href: string; label: keyof Dict; icon: IconName }[]; screen: ScreenKey; t: Dict }) {
  const [open, setOpen] = useState(false);
  const hidden = list.slice(3);
  const on = hidden.some((s) => s.k === screen);
  return (
    <div className="relative flex xl:hidden">
      <button type="button" className="flex items-center gap-2 px-3 text-[16px] font-semibold" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ borderBottom: on ? "3px solid var(--marigold)" : "3px solid transparent", color: "var(--cream)" }}>
        <Icon name="more" size={18} stroke={3} /> {t.more} <Icon name="down" size={16} />
      </button>
      {open && (
        <Popover onClose={() => setOpen(false)}>
          {hidden.map((s) => (
            <MenuItem key={s.k} href={s.href} icon={s.icon} cls={s.k === "report" ? "lg:hidden" : ""} current={s.k === screen}>
              {t[s.label]}
            </MenuItem>
          ))}
        </Popover>
      )}
    </div>
  );
}

function Menu({ label, icon, open, onOpen, onClose, children, iconOnly }: { label: string; icon: IconName; open: boolean; onOpen: () => void; onClose: () => void; children: ReactNode; iconOnly?: boolean }) {
  return (
    <div className="relative">
      <button type="button" className="btn btn-ondark btn-sm !px-3" aria-expanded={open} aria-haspopup="menu" onClick={onOpen} aria-label={iconOnly ? label : undefined}>
        <Icon name={icon} size={18} />
        {!iconOnly && <span className="hidden sm:inline">{label}</span>}
      </button>
      {open && <Popover onClose={onClose}>{children}</Popover>}
    </div>
  );
}

function Popover({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest("[aria-expanded]")) onClose();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    ref.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);
  return (
    <div ref={ref} role="menu" className="panel anim-sheet absolute right-0 top-[calc(100%+8px)] z-50 flex min-w-[240px] flex-col p-2 text-[var(--ink)]">
      {children}
    </div>
  );
}

function MenuItem({ children, href, onClick, icon, cls = "", current }: { children: ReactNode; href?: string; onClick?: () => void; icon: IconName; cls?: string; current?: boolean }) {
  const c = `flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-[15px] font-semibold hover:bg-[var(--marigold-pale)] ${current ? "bg-[var(--marigold-pale)]" : ""} ${cls}`;
  if (href)
    return (
      <Link role="menuitem" href={href} className={c} aria-current={current ? "page" : undefined}>
        <Icon name={icon} size={18} /> {children}
      </Link>
    );
  return (
    <button role="menuitem" type="button" className={c} onClick={onClick}>
      <Icon name={icon} size={18} /> {children}
    </button>
  );
}

function BottomTabs({ list, screen, onMore, t }: { list: { k: ScreenKey; href: string; label: keyof Dict; icon: IconName }[]; screen: ScreenKey; onMore: () => void; t: Dict }) {
  const actor = useGymState((s) => s.actor);
  const { mode } = useGym();
  const owner = mode === "live" && (actor.role === "owner" || actor.role === "manager");
  const want: ScreenKey[] = ["desk", "fees", owner ? "report" : "freeze"];
  const tabs = want.map((k) => list.find((s) => s.k === k)).filter((x): x is NonNullable<typeof x> => !!x);
  const inMore = !want.includes(screen);
  return (
    <nav aria-label="Screens" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t-2 border-[var(--ink)] bg-[var(--cream)] pb-[env(safe-area-inset-bottom)] md:hidden">
      {tabs.map((s) => (
        <Link key={s.k} href={s.href} aria-current={s.k === screen ? "page" : undefined} className="flex h-16 flex-col items-center justify-center gap-1 text-[12px] font-semibold leading-none" style={{ color: "var(--ink)", background: s.k === screen ? "var(--marigold-pale)" : undefined, boxShadow: s.k === screen ? "inset 0 3px 0 var(--saffron)" : undefined }}>
          <Icon name={s.icon} size={22} />
          {s.k === "report" ? t.report : t[s.label]}
        </Link>
      ))}
      <button type="button" onClick={onMore} className="flex h-16 flex-col items-center justify-center gap-1 text-[12px] font-semibold leading-none" style={{ background: inMore ? "var(--marigold-pale)" : undefined, boxShadow: inMore ? "inset 0 3px 0 var(--saffron)" : undefined }}>
        <Icon name="menu" size={22} />
        {t.more}
      </button>
    </nav>
  );
}

function MoreSheet({ list, screen, onClose, onOpen, pending }: { list: { k: ScreenKey; href: string; label: keyof Dict; icon: IconName }[]; screen: ScreenKey; onClose: () => void; onOpen: (o: "upi" | "close" | "keys") => void; pending: number }) {
  const { t, mode, lang, setLang, calm } = useGym();
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);
  const rest = list.filter((s) => !["desk", "fees"].includes(s.k));
  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <div className="sheet-backdrop" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={t.more} className="anim-sheet absolute inset-x-0 bottom-0 max-h-[88svh] overflow-y-auto rounded-t-3xl border-2 border-b-0 border-[var(--ink)] bg-[var(--cream)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="t-display text-[22px]">{t.more}</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            <Icon name="close" size={18} /> Close
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {rest.map((s) => (
            <Link key={s.k} href={s.href} className="panel-flat flex min-h-14 items-center gap-2 px-3 text-[15px] font-semibold" aria-current={s.k === screen ? "page" : undefined} style={{ background: s.k === screen ? "var(--marigold-pale)" : undefined }}>
              <Icon name={s.icon} size={20} /> {t[s.label]}
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" className="btn justify-start" onClick={() => onOpen("close")}>
            <Icon name="cash" /> {t.closeShift}
          </button>
          <button type="button" className="btn justify-start" onClick={() => onOpen("upi")}>
            <Icon name="clock" /> {t.upiToMatch} ({pending})
          </button>
          {mode === "demo" && (
            <button
              type="button"
              className="btn justify-start"
              onClick={() => {
                lsSet("kb_tour_desk_done", "");
                ssSet("kb_tour_desk_done", "");
                window.location.href = "/demo/desk?tour=1";
              }}
            >
              <Icon name="help" /> {t.tourAgain}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn" aria-pressed={calm} onClick={toggleCalm}>
              {t.calm}
            </button>
            <button type="button" className="btn" onClick={() => setLang(lang === "en" ? "hi" : "en")}>
              {lang === "en" ? "हिंदी" : "English"}
            </button>
          </div>
          <Link href="/" className="btn justify-start">
            <Icon name="home" /> {t.home}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const el = ref.current;
    const before = document.activeElement as HTMLElement | null;
    const first = () => el?.querySelector<HTMLElement>("h2[tabindex],button,a,input,select,textarea");
    setTimeout(() => first()?.focus(), 30);
    const on = (e: KeyboardEvent) => {
      if (!el) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const f = [...el.querySelectorAll<HTMLElement>("button,a,input,select,textarea,[tabindex='0']")].filter((x) => !x.hasAttribute("disabled") && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    };
    window.addEventListener("keydown", on, true);
    return () => {
      window.removeEventListener("keydown", on, true);
      before?.focus?.();
    };
  }, [ref, onClose]);
}

export function Toasts() {
  const notes = useGymState((s) => s.notes);
  return (
    <div className="toasts" aria-live="polite" role="status">
      {notes.map((n) => (
        <div key={n.id} className={`toast ${n.tone === "red" ? "toast-red" : "toast-ink"}`}>
          {n.text}
        </div>
      ))}
    </div>
  );
}

/** A labelled sync line for the live desk: never silent about unsaved changes. */
export function SyncLine() {
  const q = useGymState((s) => s.queue.length);
  const online = useGymState((s) => s.online);
  const { mode, t } = useGym();
  if (mode === "demo") return <span className="text-[13px] text-[var(--muted-ink)]">Saved in this browser only</span>;
  if (!online)
    return (
      <span className="chip chip-owes">
        {t.offline}: {q} {t.unsynced}
      </span>
    );
  if (q)
    return (
      <span className="chip chip-wait">
        {q} {t.unsynced}
      </span>
    );
  return <span className="text-[13px] text-[var(--muted-ink)]">All changes saved</span>;
}

export function money(n: number) {
  return rupees(n);
}
