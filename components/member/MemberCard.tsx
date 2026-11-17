"use client";
// The member's phone: no login, no app. Card on the rubber floor, days left as a
// loaded barbell, pay by UPI honestly, rack the bar to pause, chalk tallies of visits.
import { animate, AnimatePresence, motion, useMotionValue } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Barbell, EASE_DOOR, Plate, PlateSide, PLATE, SPRING, Stamp, Tally } from "@/components/art";
import { IdCard } from "@/components/art/IdCard";
import { Qr } from "@/components/art/Qr";
import { useDerived, useGym, useGymState, useSnap } from "@/components/shell/Gym";
import { MarginNotes } from "@/components/shell/TopBar";
import { lsGet, lsSet, ssGet, ssSet } from "@/lib/client/idb";
import { toggleCalm } from "@/lib/client/fx";
import { addDays, diffDays, fmtDate, fmtDay, istTime, planEnd, todayIST, weekStart } from "@/lib/core/dates";
import { DEMO_KEY } from "@/lib/core/demo-seed";
import { rupees, uid, upiLink } from "@/lib/core/money";
import { codeFor, slotNow, SLOT_SECONDS } from "@/lib/core/qr";
import { freezeRules, plateFor, renewalStart, type MemberState } from "@/lib/core/state";
import type { Plan, Snapshot } from "@/lib/core/types";
import { memberText } from "@/lib/i18n/member";
import { Locker } from "./Locker";

const useT = () => memberText(useGym().lang);

export function MemberCard({ memberNo, token }: { memberNo?: string; token?: string }) {
  const { mode, calm, lang } = useGym();
  const snap = useSnap();
  const d = useDerived();
  const status = useGymState((s) => s.status);
  const actor = useGymState((s) => s.actor);
  const st = actor.memberId && d ? d.byId.get(actor.memberId) : undefined;
  const no = memberNo ?? st?.m.memberNo ?? "";
  const t = memberText(lang);

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    if (token) lsSet("kb_my_card", token);
  }, [token]);

  if (status === "error") return <VoidCard />;
  return (
    <div className="floor min-h-dvh pb-16">
      {no && <Locker memberNo={no} calm={calm} label={t.openLocker} aria={t.lockerAria(no)} />}
      {!snap || !st ? (
        <div className="mx-auto max-w-[440px] px-4 pt-10">
          <div className="pvc mx-auto w-full opacity-40" style={{ aspectRatio: "3.375/2.125", borderRadius: "3.2%/5%" }} />
        </div>
      ) : (
        <Card st={st} snap={snap} token={token} />
      )}
      <MarginNotes />
      {mode === "demo" && (
        <div className="fixed left-2 top-2 z-30">
          <span className="steel-tag">{t.demoTag}</span>
        </div>
      )}
    </div>
  );
}

/** An old or mistyped link: the card is drawn void, with one clear way to get a new one. */
function VoidCard() {
  const ask = "Hi, my Khatabar member card link does not open any more. Please send me a new one.";
  return (
    <div className="floor grid min-h-dvh place-items-center px-4 py-10">
      <div className="flex w-full max-w-[400px] flex-col items-center gap-5">
        <div className="pvc relative w-full overflow-hidden" style={{ aspectRatio: "3.375 / 2.125", borderRadius: "3.2% / 5%", boxShadow: "0 10px 24px -12px rgba(0,0,0,.6)", containerType: "inline-size" }} aria-hidden>
          <div className="absolute inset-x-0 top-0 h-[1.6cqw]" style={{ background: "#8a857a" }} />
          {/* the hole the desk punches through a cancelled card */}
          <div className="absolute left-1/2 top-[3.4cqw] h-[7cqw] w-[7cqw] -translate-x-1/2 rounded-full" style={{ background: "var(--rubber)", boxShadow: "inset 0 2px 3px #000, 0 0 0 1.5px #b7b2a5" }} />
          <div className="absolute inset-x-[6cqw] top-[16cqw] flex gap-[4cqw]">
            <div className="h-[25cqw] w-[21cqw]" style={{ background: "repeating-linear-gradient(135deg, #d9d4c6 0 2px, #e4e0d3 2px 5px)" }} />
            <div className="flex flex-1 flex-col gap-[2.4cqw] pt-[1cqw]">
              {[80, 55, 62, 40].map((w, i) => (
                <span key={i} className="block h-[2.4cqw] rounded-sm" style={{ width: `${w}%`, background: "#cfcabd" }} />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 grid place-items-center">
            <Stamp kind="due" word="CANCELLED" seed="void-card" size={1.15} />
          </div>
        </div>
        <p className="t-hand text-center text-[19px]" style={{ color: "var(--chalk)" }}>
          This card link was cancelled or never existed.
        </p>
        <p className="t-hand -mt-3 text-center text-[16px]" style={{ color: "var(--chalk-dust)" }}>
          The desk can send you a fresh one on WhatsApp in a few seconds.
        </p>
        <a className="btn-brass !min-h-12" href={`https://wa.me/?text=${encodeURIComponent(ask)}`} target="_blank" rel="noreferrer">
          Ask the desk for a new link
        </a>
        <Link href="/" className="t-teko text-[15px] underline" style={{ color: "var(--chalk-dust)" }}>
          What is Khatabar?
        </Link>
      </div>
    </div>
  );
}

/** Toasts render on document.body: a fixed toast inside a clipped panel would be clipped with it. */
function PortalToast({ show, children }: { show: boolean; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const { calm } = useGym();
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div data-toast className="fixed inset-x-0 bottom-0 z-[85] flex items-center justify-between gap-3 border-t-2 border-[var(--iron-rim)] bg-[var(--iron)] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 text-[var(--chalk)]" initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} transition={calm ? { duration: 0.15 } : SPRING} role="status">
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Card({ st, snap, token }: { st: MemberState; snap: Snapshot; token?: string }) {
  const { mode, lang, setLang, calm, today } = useGym();
  const t = useT();
  const [big, setBig] = useState(false);
  // the payment the member just marked: its PENDING stamp drops onto the card
  const [justPaid, setJustPaid] = useState<string | null>(null);
  const pendingId = snap.payments.find((p) => p.memberId === st.m.id && p.state === "pending")?.id ?? null;
  const stamp = st.frozenNow ? (
    <Stamp kind="freeze" word="FROZEN" seed={st.frozenNow.id} size={0.7} drop={false} />
  ) : st.status === "lapsed" ? (
    <Stamp kind={st.plate === "p25" ? "lapsed" : "due"} word={PLATE[st.plate].en} seed={st.m.id} size={0.7} drop={false} />
  ) : pendingId ? (
    <Stamp key={pendingId} kind="pending" word="PENDING" sub={rupees(st.pending)} seed={pendingId} size={0.65} drop={justPaid === pendingId && !calm} />
  ) : undefined;
  return (
    <main className="mx-auto flex max-w-[460px] flex-col gap-5 px-4 pt-12">
      {/* band 1: the card, hanging on its lanyard */}
      <section aria-label={t.yourCard} className="relative">
        <div className="absolute left-1/2 top-[-48px] h-[56px] w-4 -translate-x-1/2" style={{ background: "repeating-linear-gradient(0deg, var(--branch, #b5372a) 0 6px, #8a2a20 6px 8px)", backgroundColor: snap.branch.color }} aria-hidden />
        <motion.div initial={calm ? false : { rotate: -2, y: -6 }} animate={{ rotate: 0, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 8 }} style={{ transformOrigin: "50% -40px" }}>
          <IdCard st={st} gym={snap.org.name} band={snap.branch.color} layout={false} lang={lang} stamp={stamp} />
        </motion.div>
        <Pass st={st} snap={snap} token={token} big={big} setBig={setBig} />
      </section>

      {/* band 2: days left as a loaded barbell */}
      <DaysBar st={st} />

      <PaySheet st={st} snap={snap} onPaid={setJustPaid} />
      <ReRack st={st} snap={snap} />
      <ChalkTally st={st} snap={snap} today={today} />
      <Receipts st={st} snap={snap} />

      <section aria-label={t.settings} className="iron flex flex-col gap-2 p-4">
        <h2 className="t-teko text-[20px]">{t.settings}</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-iron" onClick={() => setLang(lang === "en" ? "hi" : "en")}>
            {lang === "en" ? "हिंदी" : "English"}
          </button>
          <button type="button" className="btn-iron" aria-pressed={calm} onClick={toggleCalm}>
            {t.calm(calm)}
          </button>
        </div>
        <Settings st={st} />
      </section>
      {mode === "demo" && (
        <p className="t-hand text-center text-[15px]" style={{ color: "var(--chalk-dust)" }}>
          {t.demoHint[0]}
          <Link className="inline-flex min-h-11 items-center underline" href="/demo/desk" target="_blank">
            {t.demoHint[1]}
          </Link>
          {t.demoHint[2]}
        </p>
      )}
    </main>
  );
}

type Verdict = { kind: string; text: string; at: number };

/** The rotating QR: a new code every 30 s, 10 minutes kept ahead for poor signal. */
function Pass({ st, snap, token, big, setBig }: { st: MemberState; snap: Snapshot; token?: string; big: boolean; setBig: (b: boolean) => void }) {
  const { mode, lang, calm } = useGym();
  const t = useT();
  const [codes, setCodes] = useState<{ slot: number; code: string }[]>([]);
  const [photo, setPhoto] = useState<string>("");
  const [now, setNow] = useState(() => Date.now());
  const [sent, setSent] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // the demo desk answers over the same channel: checked in, already in, or a word needed
  useEffect(() => {
    if (mode !== "demo" || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("kb-demo");
    ch.onmessage = (m) => {
      if (m.data?.type === "scan-result" && m.data.memberId === st.m.id) setVerdict({ kind: m.data.kind, text: m.data.text, at: m.data.at });
    };
    return () => ch.close();
  }, [mode, st.m.id]);

  const slot = slotNow(now);
  useEffect(() => {
    let live = true;
    (async () => {
      if (codes.some((c) => c.slot === slot + 2)) return;
      if (mode === "demo") {
        const list = await Promise.all([0, 1, 2, 3].map(async (i) => ({ slot: slot + i, code: await codeFor(DEMO_KEY, snap.branch.code, st.m.memberNo, st.m.id, slot + i) })));
        const p = await codeFor(DEMO_KEY, snap.branch.code, st.m.memberNo, st.m.id, "P");
        if (live) {
          setCodes(list);
          setPhoto(p);
        }
        return;
      }
      try {
        const r = await fetch(`/api/m/${token}/qr`, { cache: "no-store" });
        const b = await r.json();
        if (live && r.ok) {
          setCodes(b.codes);
          setPhoto(b.photo);
          lsSet(`kb_qr_${token}`, JSON.stringify({ codes: b.codes, photo: b.photo }));
        }
      } catch {
        try {
          const cached = lsGet(`kb_qr_${token}`);
          if (cached && live) {
            const c = JSON.parse(cached);
            setCodes(c.codes);
            setPhoto(c.photo);
          }
        } catch {}
      }
    })();
    return () => {
      live = false;
    };
  }, [slot, mode, token, snap.branch.code, st.m.memberNo, st.m.id, codes]);

  const current = codes.find((c) => c.slot === slot)?.code;
  const offline = !current && !!photo;
  const left = SLOT_SECONDS - (Math.floor(now / 1000) % SLOT_SECONDS);
  const code = current ?? photo;

  const simulate = () => {
    if (!code || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("kb-demo");
    ch.postMessage({ type: "scan", code });
    ch.close();
    setVerdict(null);
    setSent(Date.now());
  };

  const fresh = verdict && now - verdict.at < 4000;
  const tick = verdict?.kind === "ok" ? "var(--stamp-paid)" : verdict?.kind === "already" ? "var(--hazard)" : "var(--plate-25)";
  const caption = offline ? (
    <span style={{ color: "var(--hazard)" }}>{t.photoCheck}</span>
  ) : verdict && sent && verdict.at >= sent ? (
    <span style={{ color: tick }}>{verdict.kind === "ok" ? t.verdictOk(istTime(verdict.at, lang)) : verdict.kind === "already" ? t.verdictAlready(verdict.text) : t.verdictStop(verdict.text)}</span>
  ) : sent && now - sent < 6000 ? (
    t.sentAt(istTime(sent, lang))
  ) : big ? (
    t.brightness
  ) : (
    t.showAtDesk(left)
  );

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setBig(!big)}
        className="relative box-border grid place-items-center"
        aria-label={big ? t.smaller : t.bigger}
        style={{ width: big ? "min(92vw, 420px)" : 196, height: big ? "min(92vw, 420px)" : 196, transition: calm ? undefined : "width .25s, height .25s", background: "var(--chalk)", padding: 14 }}
      >
        {/* the code always fills the padded box, so the countdown frame holds it at every width */}
        {code ? <Qr text={code} size={168} fill label="Your check-in code" /> : <div className="skeleton h-full w-full" style={{ background: "var(--chalk-dust)" }} />}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <rect x="1.5" y="1.5" width="97" height="97" fill="none" stroke="var(--knurl)" strokeWidth="3" />
          <rect x="1.5" y="1.5" width="97" height="97" fill="none" stroke="var(--brass)" strokeWidth="3" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - (left / SLOT_SECONDS) * 100} style={{ transition: "stroke-dashoffset 1s linear" }} />
          {fresh && <motion.rect key={verdict!.at} x="1.5" y="1.5" width="97" height="97" fill="none" stroke={tick} strokeWidth="5" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 1.6, times: [0, 0.1, 0.7, 1] }} />}
        </svg>
      </button>
      <div className="t-teko min-h-[34px] max-w-[360px] text-center text-[16px]" style={{ color: "var(--chalk-dust)" }} aria-live="polite">
        {caption}
      </div>
      {mode === "demo" && (
        <button type="button" className="btn-brass w-[260px]" onClick={simulate}>
          {t.simulate}
        </button>
      )}
      <SelfCheckin st={st} snap={snap} />
      <HomeHint />
    </div>
  );
}

function SelfCheckin({ st, snap }: { st: MemberState; snap: Snapshot }) {
  const { store, mode, lang } = useGym();
  const t = useT();
  const [msg, setMsg] = useState("");
  const fromPoster = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkin") === "1";
  if (!snap.branch.settings.selfCheckin || (!fromPoster && mode !== "demo")) return null;
  if (st.visitsToday) return <p className="t-hand text-[16px]">{t.inToday(istTime(st.visitsToday, lang))}</p>;
  const go = () => {
    if (!navigator.geolocation) return setMsg(t.geoNone);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const r = store.run("checkin", { id: uid(), memberId: st.m.id, method: "self_geo", geo: { lat: p.coords.latitude, lng: p.coords.longitude } });
        setMsg(r.ok ? t.geoOk : r.error ?? "Not saved");
      },
      () => setMsg(t.geoNo),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" className="btn-iron" onClick={go}>
        {t.checkinHere}
      </button>
      {msg && <p className="t-hand text-center text-[15px]">{msg}</p>}
    </div>
  );
}

function HomeHint() {
  const t = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (lsGet("kb_a2hs") !== "1") setShow(true);
  }, []);
  if (!show) return null;
  return (
    <button type="button" className="t-hand min-h-11 text-[14px] underline" style={{ color: "var(--chalk-dust)" }} onClick={() => (lsSet("kb_a2hs", "1"), setShow(false))}>
      {t.a2hs}
    </button>
  );
}

/** One plate per remaining week, loaded on both sleeves like a real bar; the outer plate shrinks for a part week. */
function DaysBar({ st }: { st: MemberState }) {
  const { lang } = useGym();
  const t = useT();
  const days = Math.max(0, st.daysLeft ?? 0);
  const weeks = st.daysLeft != null && st.daysLeft >= 0 ? Math.ceil((days + 1) / 7) : 0;
  const shown = Math.min(weeks, 10);
  const part = ((days + 1) % 7) / 7 || 1;
  // inner plates are the full weeks nearest now; the part week sits outermost
  const plates = Array.from({ length: shown }, (_, k) => ({ state: plateFor(days - 7 * k), h: k === shown - 1 && weeks <= 10 ? 34 + 40 * part : 74 })).reverse();
  const frosted = !!st.frozenNow;
  const half = !frosted && !!st.freezeRequest;
  const line = st.daysLeft == null || st.daysLeft < 0 ? t.reload : days <= 14 && st.endDate ? t.renewBy(fmtDate(st.endDate, todayIST(), lang)) : t.weeksOnBar(weeks);
  return (
    <section aria-label={t.daysLeftAria(days)} className="-mx-4 px-2">
      <Barbell height={96} bend={Math.min(3, shown * 0.22)} left={plates.map((p, i) => <PlateSide key={i} state={p.state} h={Math.round(p.h)} w={10} frozen={frosted} halfFrozen={half} />)} />
      {/* the card above already says how many days and the date; the bar says what to do about it */}
      <p className="t-teko text-center text-[19px]" style={{ color: st.daysLeft != null && st.daysLeft < 0 ? "#ff9b8a" : "var(--chalk)" }}>
        {line}
      </p>
      {weeks > 10 && <p className="t-teko text-center text-[14px] muted">{t.moreWeeks(weeks - 10)}</p>}
      <p className="sr-only">{PLATE[st.plate].en}</p>
    </section>
  );
}

/** Pay dues or renew by UPI. A payment is PENDING until the desk sees the money. */
function PaySheet({ st, snap, onPaid }: { st: MemberState; snap: Snapshot; onPaid: (id: string | null) => void }) {
  const { store, mode, today, lang, calm } = useGym();
  const t = useT();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [asked, setAsked] = useState<null | { amount: number; planId: string | null; at: number }>(null);
  const [utr, setUtr] = useState("");
  const [leaving, setLeaving] = useState<"paid" | "no">("no");
  const [undo, setUndo] = useState<null | { id: string; at: number }>(null);
  const opener = useRef<HTMLElement | null>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const plans = snap.plans.filter((p) => p.active && p.kind === "time").sort((a, b) => a.sort - b.sort);
  const pendingNow = snap.payments.filter((p) => p.memberId === st.m.id && p.state === "pending");
  const amount = plan ? plan.price + st.dues : st.dues;
  const key = `kb_upi_ask_${st.m.id}`;
  const name = (p: Plan) => (lang === "hi" ? p.nameHi || p.nameEn : p.nameEn);

  useEffect(() => {
    try {
      const saved = ssGet(key);
      if (saved) setAsked(JSON.parse(saved));
    } catch {}
    const back = () => {
      try {
        const s = ssGet(key);
        if (document.visibilityState === "visible" && s) setAsked(JSON.parse(s));
      } catch {}
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [key]);

  useEffect(() => {
    if (!undo) return;
    const id = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(id);
  }, [undo]);

  // a real dialog: focus moves in, Tab stays in, Esc answers No, focus goes back to the button that opened it
  useEffect(() => {
    if (!asked) return;
    const t0 = setTimeout(() => yesRef.current?.focus(), 60);
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        answer(false);
      } else if (e.key === "Tab" && sheetRef.current) {
        const f = [...sheetRef.current.querySelectorAll<HTMLElement>("button, input")].filter((x) => !x.hasAttribute("disabled"));
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", on);
    return () => {
      clearTimeout(t0);
      window.removeEventListener("keydown", on);
    };
  });

  const pay = () => {
    if (!amount) return;
    opener.current = document.activeElement as HTMLElement | null;
    const a = { amount, planId: plan?.id ?? null, at: Date.now() };
    ssSet(key, JSON.stringify(a));
    setLeaving("no");
    if (mode === "live") window.location.href = upiLink({ vpa: snap.branch.vpa, payee: snap.branch.payeeName || snap.org.name, amount, note: `KB ${st.m.memberNo} ${plan?.nameEn ?? "dues"}` });
    else setAsked(a);
  };
  const answer = (yes: boolean) => {
    let id: string | null = null;
    if (yes && asked) {
      id = uid();
      const payments = [{ id, mode: "upi_member", amount: asked.amount, state: "pending", utrLast4: utr }];
      const r = asked.planId ? store.run("renew", { membershipId: uid(), memberId: st.m.id, planId: asked.planId, discount: 0, payments }) : store.run("pay", { memberId: st.m.id, payments });
      if (!r.ok) {
        store.note(r.error ?? "Not saved");
        id = null;
      }
    }
    try {
      sessionStorage.removeItem(key);
    } catch {}
    setLeaving(id ? "paid" : "no");
    setAsked(null);
    // "No" keeps the chosen plan, so the Renew button is still there for focus to return to
    if (id) setPlan(null);
    setUtr("");
    if (id) {
      // the sheet flies up into the card, the PENDING stamp drops on it, and Undo waits 8 s
      if (!calm) window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => onPaid(id), calm ? 0 : 360);
      setUndo({ id, at: Date.now() });
    } else setTimeout(() => opener.current?.focus(), 30);
  };
  const takeBack = () => {
    if (!undo) return;
    const r = store.run("pay.cancel", { id: undo.id });
    store.note(r.ok ? t.undone : r.error ?? "Not undone", r.ok ? "ink" : "red");
    setUndo(null);
    onPaid(null);
  };
  const start = renewalStart(st, today, snap.branch.settings.backdateWithin7).start;

  return (
    <section aria-label={t.renewEarly} className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {pendingNow.length > 0 && (
          // the card carries the PENDING stamp; this line explains it and slides in from the card
          <motion.div key="pending" className="iron p-3" initial={calm ? { opacity: 0 } : { opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ...SPRING, delay: calm ? 0 : 0.45 }}>
            <span className="t-hand text-[16px]">{t.pendingSent(rupees(pendingNow.reduce((a, p) => a + p.amount, 0)), istTime(pendingNow[0].createdAt, lang))}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {st.dues > 0 && !plan && (
        <button type="button" className="btn-brass !min-h-14 !text-[24px]" onClick={pay}>
          {t.payDues(rupees(st.dues))}
        </button>
      )}
      <div className="iron p-3">
        <div className="t-teko text-[18px]">{t.renewEarly}</div>
        <div className="mt-2 flex flex-wrap justify-around gap-2" role="radiogroup" aria-label={t.plans}>
          {plans.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={plan?.id === p.id} onClick={() => setPlan(plan?.id === p.id ? null : p)} className="flex min-h-11 flex-col items-center" style={{ opacity: plan && plan.id !== p.id ? 0.45 : 1 }}>
              <motion.span animate={plan?.id === p.id ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }} transition={SPRING}>
                <Plate state={p.plate} size={50} label="" />
              </motion.span>
              <span className="t-teko text-[14px]">{name(p)}</span>
              <span className="t-mono text-[12px]" style={{ color: "var(--brass-hi)" }}>
                {rupees(p.price)}
              </span>
            </button>
          ))}
        </div>
        {plan && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="t-mono text-center text-[13px]">{t.span(fmtDate(start, today, lang), fmtDate(planEnd(start, plan.months, plan.days), today, lang))}</p>
            {st.dues > 0 && <p className="t-teko text-center text-[15px]" style={{ color: "#ff9b8a" }}>{t.inclDues(rupees(plan.price), rupees(st.dues))}</p>}
            <button type="button" className="btn-brass !min-h-12" onClick={pay}>
              {t.renewPlan(name(plan), rupees(amount))}
            </button>
          </div>
        )}
      </div>
      <AnimatePresence>
        {asked && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }} onClick={() => answer(false)}>
            <motion.div
              ref={sheetRef}
              className="ledger-plain w-full max-w-[440px] px-5 pb-8 pt-8"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={leaving === "paid" && !calm ? { y: "-72vh", scale: 0.35, opacity: 0, transition: { duration: 0.42, ease: EASE_DOOR } } : { y: 60, opacity: 0, transition: { duration: 0.2 } }}
              transition={SPRING}
              role="dialog"
              aria-modal="true"
              aria-labelledby="kb-paid-q"
              onClick={(e) => e.stopPropagation()}
            >
              {/* every line sits on a 32 px rule of the page */}
              <p id="kb-paid-q" className="t-hand text-[22px] leading-8" style={{ color: "var(--ink)" }}>
                {t.didItGo(rupees(asked.amount))}
              </p>
              {mode === "demo" && (
                <p className="t-hand text-[15px] leading-8" style={{ color: "var(--margin-red)" }}>
                  {t.demoNoMoney}
                </p>
              )}
              <label className="block">
                <span className="t-teko block text-[16px] leading-8" style={{ color: "var(--carbon)" }}>
                  {t.utrLabel}
                </span>
                <span className="flex h-16 items-center">
                  <input inputMode="numeric" maxLength={4} className="field !h-11 !w-32 border-2 !border-[var(--ink)] bg-[var(--pvc)] px-3 text-[18px] tracking-[0.3em]" value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                </span>
              </label>
              <div className="flex h-16 items-center gap-2">
                <button ref={yesRef} type="button" className="btn-brass !min-h-12 flex-1" onClick={() => answer(true)}>
                  {t.yesPaid}
                </button>
                <button type="button" className="btn-ink !min-h-12 flex-1" onClick={() => answer(false)}>
                  {t.no}
                </button>
              </div>
              <p className="t-hand text-[14px] leading-8" style={{ color: "var(--muted-on-paper)" }}>
                {t.pendingNote}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <PortalToast show={!!undo}>
        <span className="t-teko text-[17px]">{t.paidSent}</span>
        <button type="button" className="btn-brass !min-h-11 shrink-0" onClick={takeBack}>
          {t.undo}
        </button>
      </PortalToast>
    </section>
  );
}

/** Rack the bar to pause: drag the knurled sleeve back onto the wall rack. */
function ReRack({ st, snap }: { st: MemberState; snap: Snapshot }) {
  const { store, today, calm, lang } = useGym();
  const t = useT();
  const x = useMotionValue(0);
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [trackW, setTrackW] = useState(300);
  const [days, setDays] = useState(0);
  const [from, setFrom] = useState(addDays(today, 1));
  const [undo, setUndo] = useState<null | { id: string; at: number }>(null);
  const chk = freezeRules(snap, st, Math.max(1, days));
  const max = chk.maxNow;
  const req = st.freezeRequest;
  useEffect(() => {
    if (!undo) return;
    const id = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(id);
  }, [undo]);
  useEffect(() => {
    const el = track.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setTrackW(el.getBoundingClientRect().width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [max, req]);
  // the sleeve follows the number: typing 10 or pressing an arrow slides it, not only a drag
  useEffect(() => {
    if (dragging.current) return;
    const to = max > 0 ? (Math.min(days, max) / max) * Math.max(0, trackW - 56) : 0;
    const c = animate(x, to, calm ? { duration: 0 } : SPRING);
    return () => c.stop();
  }, [days, max, trackW, calm, x]);
  if (!st.term || st.status === "lapsed") return null;
  const send = (n: number) => {
    if (n < 1) return store.note(t.dragFirst, "ink");
    if (n < chk.minDays) return store.note(t.why(`At least ${chk.minDays} days per freeze`), "ink");
    const id = uid();
    const r = store.run("freeze.set", { id, memberId: st.m.id, fromDate: from, days: n, reason: "Asked from the card" });
    if (!r.ok) return store.note(t.why(r.error ?? "Not sent"));
    setUndo({ id, at: Date.now() });
    setDays(0);
  };
  const newEnd = st.endDate ? addDays(st.endDate, days) : null;
  const d = (s: string | null) => fmtDate(s, today, lang);
  return (
    <section aria-label={t.pause} className="iron p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="t-teko text-[20px]">{t.pause}</h2>
        <span className="t-teko text-[14px] muted">{chk.maxCount ? t.freezesLeft(chk.maxCount - chk.usedCount, chk.maxCount, chk.maxDays) : t.why(chk.why)}</span>
      </div>
      {/* empty rack slots show the gym's rules */}
      <div className="mt-2 flex gap-2" aria-hidden>
        {Array.from({ length: Math.max(1, chk.maxCount) }, (_, i) => (
          <span key={i} className="block h-6 w-10" style={{ background: i < chk.usedCount ? "var(--steel-lo)" : "transparent", border: "2px solid var(--steel)", borderTop: "none", borderRadius: "0 0 8px 8px" }} />
        ))}
      </div>
      {req ? (
        <p className="t-hand mt-3 text-[16px]">{t.waiting(req.days, d(req.fromDate))}</p>
      ) : max > 0 ? (
        <>
          <div ref={track} className="relative mt-4 h-12 select-none" style={{ touchAction: "none" }}>
            <div className="absolute inset-y-[18px] left-0 right-0" style={{ background: "repeating-linear-gradient(90deg, rgba(241,238,228,.85) 0 2px, transparent 2px 100%) 0 0 / calc(100%/" + Math.max(1, max) + ") 100%", opacity: 0.25 }} />
            <motion.div className="absolute inset-y-[14px] left-0 rounded-sm" style={{ width: x, background: "repeating-linear-gradient(-35deg, var(--stamp-freeze) 0 4px, #dfe9f1 4px 6px)", opacity: 0.85 }} />
            <motion.div
              drag="x"
              dragConstraints={track}
              dragElastic={0}
              dragMomentum={false}
              style={{ x }}
              onDragStart={() => (dragging.current = true)}
              onDrag={() => setDays(Math.round((x.get() / Math.max(1, trackW - 56)) * max))}
              onDragEnd={() => {
                dragging.current = false;
                // settle on the whole day the sleeve stopped at
                const n = Math.round((x.get() / Math.max(1, trackW - 56)) * max);
                setDays(n);
                void animate(x, (n / max) * Math.max(0, trackW - 56), calm ? { duration: 0 } : SPRING);
              }}
              className="knurl grip absolute left-0 top-0 h-12 w-14 cursor-grab rounded-sm"
              role="slider"
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={days}
              aria-label={t.sleeveAria}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") setDays((v) => Math.min(max, v + 1));
                else if (e.key === "ArrowLeft" || e.key === "ArrowDown") setDays((v) => Math.max(0, v - 1));
                else return;
                e.preventDefault();
              }}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="t-teko text-[14px] muted">
              {t.from}
              <input type="date" className="field-floor mt-1 t-mono" min={today} value={from} onChange={(e) => setFrom(e.target.value || from)} />
            </label>
            <label className="t-teko text-[14px] muted">
              {t.days}
              <input type="number" min={0} max={max} className="field-floor mt-1 t-mono" value={days} onChange={(e) => setDays(Math.max(0, Math.min(max, Number(e.target.value) || 0)))} />
            </label>
          </div>
          <p className="t-hand mt-2 text-[16px]" aria-live="polite">
            {days > 0 && newEnd ? t.moves(d(st.endDate), d(newEnd), d(from), d(addDays(from, days - 1))) : t.dragHint}
          </p>
          <button type="button" className="btn-brass mt-2" aria-disabled={days < 1} style={days < 1 ? { filter: "grayscale(.75) brightness(.8)", opacity: 0.55 } : undefined} onClick={() => send(days)}>
            {t.send}
          </button>
        </>
      ) : (
        <p className="t-hand mt-2 text-[15px]">{t.why(chk.why)}</p>
      )}
      <PortalToast show={!!undo}>
        <span className="t-teko text-[17px]">{t.freezeSent}</span>
        <button
          type="button"
          className="btn-brass !min-h-11 shrink-0"
          onClick={() => {
            if (undo) store.run("freeze.cancel", { id: undo.id });
            setUndo(null);
          }}
        >
          {t.undo}
        </button>
      </PortalToast>
    </section>
  );
}

/** This week and the last 8 as chalk tallies. A streak counts weeks that hit your own target. */
function ChalkTally({ st, snap, today }: { st: MemberState; snap: Snapshot; today: string }) {
  const { store, lang } = useGym();
  const t = useT();
  const target = st.m.weeklyTarget || 3;
  const weeks = useMemo(() => {
    const ws = weekStart(today);
    return Array.from({ length: 9 }, (_, i) => {
      const s = addDays(ws, -7 * i);
      const e = addDays(s, 6);
      const n = snap.checkins.filter((c) => c.memberId === st.m.id && c.istDate >= s && c.istDate <= e).length;
      const frozen = snap.freezes.some((f) => f.memberId === st.m.id && f.state === "approved" && f.fromDate <= e && f.toDate >= s);
      const before = st.joinedOn > e;
      return { s, n, frozen, before, current: i === 0 };
    });
  }, [snap, st, today]);
  let streak = 0;
  for (const w of weeks.slice(1)) {
    if (w.before) break;
    if (w.frozen) continue;
    if (w.n >= target) streak++;
    else break;
  }
  return (
    <section aria-label={t.tally} className="p-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="t-teko text-[20px]">{t.tally}</h2>
        <span className="t-hand text-[16px]">{t.streak(streak, target)}</span>
      </div>
      <ol className="mt-2 flex flex-col gap-1">
        {weeks.map((w, i) => (
          <li key={w.s} className="flex h-7 items-center gap-3">
            <span className="t-mono w-20 shrink-0 whitespace-nowrap text-[12px] muted">{i === 0 ? t.thisWeek : fmtDay(w.s, lang)}</span>
            <Tally n={w.n} smudged={!w.current && !w.frozen && !w.before && w.n < target} hatched={w.frozen} delay={i * 0.05} />
          </li>
        ))}
      </ol>
      <label className="t-teko mt-2 flex items-center gap-2 text-[15px] muted">
        {t.target}
        <select className="h-11 bg-[var(--iron)] px-3 text-[var(--chalk)]" value={target} onChange={(e) => store.run("member.update", { id: st.m.id, fields: { weeklyTarget: Number(e.target.value) } })}>
          {[2, 3, 4, 5, 6].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <p className="t-hand text-[14px] muted">{t.tallyNote}</p>
    </section>
  );
}

function Receipts({ st, snap }: { st: MemberState; snap: Snapshot }) {
  const { mode, lang } = useGym();
  const t = useT();
  const pays = snap.payments.filter((p) => p.memberId === st.m.id && p.state !== "rejected" && p.mode !== "import").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return (
    <section aria-label={t.receipts} className="flex flex-col gap-2">
      <h2 className="t-teko text-[20px]">{t.receipts}</h2>
      {pays.slice(0, 6).map((p) => (
        <Link key={p.id} href={mode === "demo" ? `/demo/r/${p.id}${snap.branch.code === "LV" ? "?b=LV" : ""}` : `/r/${p.id}`} className="ledger-plain mx-auto block min-h-11 w-full max-w-[340px] px-4 py-2">
          <div className="carbon t-mono flex justify-between text-[13px] leading-7">
            <span>{fmtDate(todayIST(Date.parse(p.createdAt)), todayIST(), lang)}</span>
            <span>{p.receiptNo || (p.state === "pending" ? t.pending : "")}</span>
            <span>{rupees(p.amount)}</span>
          </div>
        </Link>
      ))}
      {!pays.length && <p className="t-hand text-[15px] muted">{t.noPayments}</p>}
    </section>
  );
}

function Settings({ st }: { st: MemberState }) {
  const { store, lang } = useGym();
  const t = useT();
  const [asked, setAsked] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5" checked={st.m.remindersOptOut} onChange={(e) => store.run("member.update", { id: st.m.id, fields: { remindersOptOut: e.target.checked } })} />
        <span>{t.stopReminders}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-iron" onClick={() => (store.run("task.add", { id: uid(), memberId: st.m.id, kind: "export" }).ok ? setAsked(t.downloadAsked) : null)}>
          {t.download}
        </button>
        <button type="button" className="btn-iron" onClick={() => (store.run("task.add", { id: uid(), memberId: st.m.id, kind: "erase" }).ok ? setAsked(t.eraseAsked) : null)}>
          {t.erase}
        </button>
      </div>
      {asked && <p className="t-hand text-[15px]">{asked}</p>}
      <p className="t-hand text-[13px] muted">{t.joined(fmtDate(st.joinedOn, todayIST(), lang), diffDays(todayIST(), st.joinedOn))}</p>
    </div>
  );
}

