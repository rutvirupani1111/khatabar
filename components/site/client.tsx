"use client";
// Small client pieces of the marketing pages. Each one renders real HTML on the server first, so
// links and buttons work before any script runs; scripts only add the nicer path.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { setCalm, useFx } from "@/lib/client/fx";
import { lsSet } from "@/lib/client/idb";
import { ACTIONS, SCENES, STOP_NOTE, STOP_TIMES } from "@/lib/i18n/site";
import { streetBus, type StreetEvent } from "@/lib/client/bus";

function Tx({ en, hi }: { en: string; hi: string }) {
  return (
    <>
      <span className="l-en">{en}</span>
      <span className="l-hi" lang="hi">
        {hi}
      </span>
    </>
  );
}

/** A link that crossfades into the next page when the browser can, and is a plain link otherwise. */
export function CtaLink({ href, className, children, onClick }: { href: string; className?: string; children: ReactNode; onClick?: () => void }) {
  const router = useRouter();
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.();
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (!doc.startViewTransition || document.documentElement.getAttribute("data-fx") === "calm") return;
    e.preventDefault();
    doc.startViewTransition(() => router.push(href));
  };
  return (
    <Link href={href} className={className} onClick={go}>
      {children}
    </Link>
  );
}

export function LangToggle({ cls = "" }: { cls?: string }) {
  const flip = () => {
    const html = document.documentElement;
    const next = html.getAttribute("data-lang") === "hi" ? "en" : "hi";
    if (next === "hi") html.setAttribute("data-lang", "hi");
    else html.removeAttribute("data-lang");
    html.lang = next;
    lsSet("kb_lang", next);
  };
  return (
    <button type="button" className={`btn btn-sm ${cls}`} onClick={flip}>
      <span className="l-en" lang="hi">
        हिंदी
      </span>
      <span className="l-hi">English</span>
    </button>
  );
}

export function LessMotionSwitch({ cls = "" }: { cls?: string }) {
  const fx = useFx();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const on = ready && fx === "calm";
  return (
    <button type="button" role="switch" aria-checked={on} className={`lm-switch ${cls}`} onClick={() => setCalm(!on)}>
      <span className="track" aria-hidden>
        <span className="knob" />
      </span>
      <Tx {...ACTIONS.lessMotion} />
    </button>
  );
}

const NAV = [
  { href: "/#how", label: ACTIONS.how, key: "how" },
  { href: "/pricing", label: ACTIONS.pricing, key: "pricing" },
  { href: "/login", label: ACTIONS.signIn, key: "login" },
];

export function SiteNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const el = sheet.current;
    setTimeout(() => el?.querySelector<HTMLElement>("button,a")?.focus(), 20);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const f = [...el.querySelectorAll<HTMLElement>("a,button")].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      opener.current?.focus();
    };
  }, [open]);
  const cur = (k: string) => (path === `/${k}` ? "page" : undefined);
  return (
    <header className="site-nav on-dark">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-4 md:h-16 md:px-6">
        <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2" aria-current={path === "/" ? "page" : undefined}>
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
            <path d="M7 11 C7 2 21 2 21 11" fill="none" stroke="#FFF4DE" strokeWidth="3" strokeLinecap="round" />
            <circle cx="14" cy="17" r="10" fill="#FF8A00" stroke="#1B1A2E" strokeWidth="2" />
            <path d="M8 14h12M8 17h12M8 20h12" stroke="#1B1A2E" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="wordmark">KHATABAR</span>
        </Link>
        <nav aria-label="Site" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.key} href={n.href} className="nl" aria-current={cur(n.key)}>
              <Tx {...n.label} />
            </Link>
          ))}
        </nav>
        {/* the two actions stay in the bar from tablet width up, so the next step is always on screen */}
        <div className="ml-auto hidden items-center gap-3 md:flex">
          <span className="hidden lg:inline-flex">
            <LangToggle cls="btn-ondark" />
          </span>
          {/* .lm-switch sets its own display, so the breakpoint lives on a wrapper */}
          <span className="hidden xl:inline-flex">
            <LessMotionSwitch />
          </span>
          <CtaLink href="/demo/desk" className="btn btn-primary">
            <Tx {...ACTIONS.demo} />
          </CtaLink>
          <CtaLink href="/start" className="btn btn-ondark">
            <Tx {...ACTIONS.start} />
          </CtaLink>
        </div>
        <button ref={opener} type="button" className="btn btn-ondark ml-auto !min-h-11 md:ml-0 lg:hidden" aria-expanded={open} aria-controls="kb-menu" onClick={() => setOpen(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <Tx {...ACTIONS.menu} />
        </button>
      </div>
      {open && (
        <div ref={sheet} id="kb-menu" role="dialog" aria-modal="true" aria-label="Menu" className="menu-sheet text-[var(--ink)]">
          <div className="flex items-center justify-between">
            <span className="wordmark text-[var(--ink)]">KHATABAR</span>
            <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
              <Tx {...ACTIONS.close} />
            </button>
          </div>
          <nav aria-label="Site" className="mt-4 flex flex-col">
            <MenuLink href="/" onGo={() => setOpen(false)}>
              <Tx {...ACTIONS.home} />
            </MenuLink>
            <MenuLink href="/#how" onGo={() => setOpen(false)}>
              <Tx {...ACTIONS.how} />
            </MenuLink>
            <div className="mb-1 mt-3 text-[13px] font-semibold text-[var(--muted-ink)]">The street, stop by stop</div>
            {SCENES.map((s, i) => (
              <MenuLink key={s.id} href={`/#${s.id}`} onGo={() => setOpen(false)} small>
                <span className="t-sign w-[76px] shrink-0 text-[12px] leading-tight">
                  {STOP_TIMES[i]}
                  {STOP_NOTE[i] && (
                    <span className="block text-[10px] opacity-75">
                      <Tx {...STOP_NOTE[i]!} />
                    </span>
                  )}
                </span>
                <Tx {...s.stop} />
              </MenuLink>
            ))}
            <div className="mt-3" />
            <MenuLink href="/pricing" onGo={() => setOpen(false)}>
              <Tx {...ACTIONS.pricing} />
            </MenuLink>
            <MenuLink href="/login" onGo={() => setOpen(false)}>
              <Tx {...ACTIONS.signIn} />
            </MenuLink>
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <LangToggle />
            <LessMotionSwitch />
          </div>
          <div className="mt-4 grid gap-2">
            <CtaLink href="/demo/desk" className="btn btn-lg btn-primary" onClick={() => setOpen(false)}>
              <Tx {...ACTIONS.demo} />
            </CtaLink>
            <CtaLink href="/start" className="btn btn-lg" onClick={() => setOpen(false)}>
              <Tx {...ACTIONS.start} />
            </CtaLink>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ href, children, onGo, small }: { href: string; children: ReactNode; onGo: () => void; small?: boolean }) {
  return (
    <Link href={href} onClick={onGo} className={`flex items-center gap-2 border-b border-[var(--line)] font-semibold ${small ? "min-h-11 text-[15px]" : "min-h-12 text-[18px]"}`}>
      {children}
    </Link>
  );
}

/** Phone only. Gone on Start and Sign in (those pages are the action), and it slides away while the
 *  last stop's own buttons or the footer are on screen, so the two pairs never show at once. */
export function ActionBar() {
  const path = usePathname();
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const els = [document.getElementById("start"), document.querySelector("footer")].filter((x): x is HTMLElement => !!x);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
        setHide(seen.size > 0);
      },
      { threshold: 0 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [path]);
  // while the visitor reads on down the street the bar steps aside, so it never sits on a demo's
  // buttons; scrolling back up (or being at the top) brings it back
  const [down, setDown] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - last) < 12) return;
        setDown(y > last && y > 240);
        last = y;
      });
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, [path]);
  if (path === "/start" || path === "/login") return null;
  return (
    <div className="action-bar" role="region" aria-label="Main actions" data-hide={hide || down ? "1" : undefined}>
      <CtaLink href="/demo/desk" className="btn btn-primary">
        <Tx {...ACTIONS.demo} />
      </CtaLink>
      <CtaLink href="/start" className="btn">
        <Tx {...ACTIONS.start} />
      </CtaLink>
    </div>
  );
}

/** The map as a table of contents: 7 stops down the left edge on wide screens. The stop you are at
 *  (or the one under the pointer) is named in a label under the rail, never over the page. The rail
 *  steps aside at the last stop and the footer, where the page has its own buttons. */
export function StopRail() {
  const [active, setActive] = useState(-1);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const secs = SCENES.map((s) => document.getElementById(s.id)).filter((x): x is HTMLElement => !!x);
    const ratios = new Map<Element, number>();
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => ratios.set(e.target, e.intersectionRatio));
        let best = 0;
        let bi = -1;
        secs.forEach((s, i) => {
          const r = ratios.get(s) ?? 0;
          if (r > best) {
            best = r;
            bi = i;
          }
        });
        setActive(bi);
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    );
    secs.forEach((s) => io.observe(s));
    const ends = [document.getElementById("start"), document.querySelector("footer")].filter((x): x is HTMLElement => !!x);
    const seen = new Set<Element>();
    const io2 = new IntersectionObserver(
      (es) => {
        es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
        setAway(seen.size > 0);
      },
      { threshold: 0.25 },
    );
    ends.forEach((e) => io2.observe(e));
    return () => {
      io.disconnect();
      io2.disconnect();
    };
  }, []);
  return (
    <nav className="stop-rail" aria-label="Stops on the street" data-away={away ? "1" : undefined}>
      {SCENES.map((s, i) => (
        <a key={s.id} href={`#${s.id}`} aria-current={active === i ? "step" : undefined} aria-label={`Stop ${i + 1} of 7, ${STOP_TIMES[i]}${STOP_NOTE[i] ? ` (${STOP_NOTE[i]!.en})` : ""}: ${s.stop.en}`}>
          <span className="dot" aria-hidden>
            {i + 1}
          </span>
          <span className="tm" aria-hidden>
            {STOP_TIMES[i]}
          </span>
          <span className="nm" aria-hidden>
            <b>{i + 1}</b> <Tx {...s.stop} />
            {STOP_NOTE[i] && (
              <span className="block text-[10px] font-semibold opacity-75">
                <Tx {...STOP_NOTE[i]!} />
              </span>
            )}
          </span>
        </a>
      ))}
    </nav>
  );
}

type Reaction = [actor: string, pose: string, ms: number];
const REACT: Partial<Record<StreetEvent, Reaction[]>> = {
  found: [["s2-ravi", "nod", 800]],
  "renew-open": [["s2-ravi", "pen-click", 700]],
  paid: [
    ["s2-mahesh", "flex", 1600],
    ["s2-ravi", "thumbs", 1600],
    ["s2-moti", "wag", 1100],
  ],
  waiting: [
    ["s2-ravi", "one-sec", 2700],
    ["s2-mahesh", "scratch", 2400],
  ],
  "freeze-approved": [
    ["s4-omkar", "fist-pump", 1100],
    ["s4-moti", "wag", 1100],
  ],
  "freeze-declined": [["s4-omkar", "shrug", 1600]],
  "checked-in": [
    ["s5-mahesh", "phone-nod", 900],
    ["s5-moti", "wag", 1100],
  ],
  imported: [["s7-moti", "wag", 1100]],
};

/** One observer for every scene: reveal once, pause loops off screen, and let the drawings react. */
export function SiteMotion() {
  useEffect(() => {
    document.documentElement.classList.add("kb-js");
    const scenes = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
    // only scenes more than a screen below the fold start in their "before" pose
    scenes.forEach((s) => {
      if (s.getBoundingClientRect().top > window.innerHeight * 1.5) s.setAttribute("data-on", "0");
    });
    const reveal = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).setAttribute("data-on", "1");
            reveal.unobserve(e.target);
          }
        }),
      { threshold: 0.35 },
    );
    const vis = new IntersectionObserver((es) => es.forEach((e) => (e.target as HTMLElement).setAttribute("data-visible", e.isIntersecting ? "1" : "0")), { threshold: 0 });
    scenes.forEach((s) => {
      if (s.getAttribute("data-on") === "0") reveal.observe(s);
      vis.observe(s);
    });

    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const pose = (actor: string, p: string, ms: number) => {
      document.querySelectorAll<SVGGElement>(`[data-actor="${actor}"]`).forEach((el) => {
        el.setAttribute("data-pose", p);
        clearTimeout(timers.get(actor));
        timers.set(
          actor,
          setTimeout(() => el.setAttribute("data-pose", el.getAttribute("data-idle") ?? "idle"), ms),
        );
      });
    };
    const off = streetBus.on((e, data) => {
      if (e === "reset") {
        document.querySelectorAll<SVGGElement>("[data-actor]").forEach((el) => el.setAttribute("data-pose", el.getAttribute("data-idle") ?? "idle"));
        return;
      }
      (REACT[e] ?? []).forEach(([a, p, ms]) => pose(a, p, ms));
      if (e === "paid") petals(document.querySelector("#how [data-demo-slot]"));
      if (e === "reminded") fly();
      if (e === "checked-in") {
        const s5 = document.getElementById("card");
        s5?.classList.add("led-hold");
        setTimeout(() => s5?.classList.remove("led-hold"), 800);
      }
      if (e === "close-saved") pose("s6-sunita", (data as { matched?: boolean })?.matched ? "nod" : "frown", 1800);
      if (e === "morning") pose("s6-meena", "tap", 700);
      if (e === "imported") {
        const g = document.querySelector("#import .cells");
        g?.classList.remove("cells-fly");
        void (g as HTMLElement | null)?.getBoundingClientRect();
        g?.classList.add("cells-fly");
      }
    });
    return () => {
      reveal.disconnect();
      vis.disconnect();
      off();
      timers.forEach(clearTimeout);
    };
  }, []);
  return null;
}

function fly() {
  const k = document.querySelector<SVGGElement>(".kabootar-fly");
  if (!k || document.documentElement.getAttribute("data-fx") === "calm") return;
  const bird = k.querySelector("[data-actor]");
  bird?.setAttribute("data-pose", "fly");
  k.setAttribute("data-fly", "1");
  setTimeout(() => k.setAttribute("data-fly", "back"), 1600);
  setTimeout(() => {
    k.removeAttribute("data-fly");
    bird?.setAttribute("data-pose", "perch");
  }, 2300);
}

/** Marigold petals over the counter demo when a renewal lands as PAID. Never in lite or calm. */
function petals(slot: Element | null) {
  const fx = document.documentElement.getAttribute("data-fx");
  if (!slot || fx === "calm" || fx === "lite") return;
  const r = slot.getBoundingClientRect();
  const c = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = r.width * dpr;
  c.height = r.height * dpr;
  Object.assign(c.style, { position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, pointerEvents: "none", zIndex: "60" });
  c.setAttribute("aria-hidden", "true");
  document.body.appendChild(c);
  const ctx = c.getContext("2d");
  if (!ctx) return c.remove();
  ctx.scale(dpr, dpr);
  const ps = Array.from({ length: 40 }, () => ({ x: r.width / 2 + (Math.random() - 0.5) * r.width * 0.5, y: r.height * 0.35, vx: (Math.random() - 0.5) * 5, vy: -3 - Math.random() * 5, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, col: Math.random() < 0.6 ? "#FFC21A" : "#FF8A00" }));
  const t0 = performance.now();
  const tick = (t: number) => {
    const k = (t - t0) / 1200;
    ctx.clearRect(0, 0, r.width, r.height);
    for (const p of ps) {
      p.vy += 0.22;
      p.x += p.vx;
      p.y += p.vy;
      p.a += p.va;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (k < 1) requestAnimationFrame(tick);
    else c.remove();
  };
  requestAnimationFrame(tick);
}
