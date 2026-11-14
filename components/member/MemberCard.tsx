"use client";
// The member's phone: no login, no app. Card on the rubber floor, days left as a
// loaded barbell, pay by UPI honestly, rack the bar to pause, chalk tallies of visits.
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Barbell, Plate, PlateSide, PLATE, SPRING, Stamp, Tally } from "@/components/art";
import { IdCard } from "@/components/art/IdCard";
import { Qr } from "@/components/art/Qr";
import { useDerived, useGym, useGymState, useSnap } from "@/components/shell/Gym";
import { MarginNotes } from "@/components/shell/TopBar";
import { lsGet, lsSet, ssGet, ssSet } from "@/lib/client/idb";
import { toggleCalm } from "@/lib/client/fx";
import { addDays, diffDays, fmtDay, istClock, planEnd, todayIST, weekStart } from "@/lib/core/dates";
import { DEMO_KEY } from "@/lib/core/demo-seed";
import { rupees, uid, upiLink } from "@/lib/core/money";
import { codeFor, slotNow, SLOT_SECONDS } from "@/lib/core/qr";
import { freezeRules, plateFor, renewalStart, type MemberState } from "@/lib/core/state";
import type { Plan, Snapshot } from "@/lib/core/types";
import { Locker } from "./Locker";

export function MemberCard({ memberNo, token }: { memberNo?: string; token?: string }) {
  const { mode, calm } = useGym();
  const snap = useSnap();
  const d = useDerived();
  const status = useGymState((s) => s.status);
  const actor = useGymState((s) => s.actor);
  const st = actor.memberId && d ? d.byId.get(actor.memberId) : undefined;
  const no = memberNo ?? st?.m.memberNo ?? "";

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    if (token) lsSet("kb_my_card", token);
  }, [token]);

  if (status === "error")
    return (
      <div className="floor grid min-h-dvh place-items-center p-6 text-center">
        <p className="t-hand text-[20px]">This card link was cancelled or never existed. Ask the desk for a new one.</p>
      </div>
    );
  return (
    <div className="floor min-h-dvh pb-16">
      {no && <Locker memberNo={no} calm={calm} />}
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
          <span className="steel-tag">Demo gym, made-up members</span>
        </div>
      )}
    </div>
  );
}

function Card({ st, snap, token }: { st: MemberState; snap: Snapshot; token?: string }) {
  const { mode, lang, setLang, calm, today } = useGym();
  const [big, setBig] = useState(false);
  return (
    <main className="mx-auto flex max-w-[460px] flex-col gap-5 px-4 pt-12">
      {/* band 1: the card, hanging on its lanyard */}
      <section aria-label="Your card" className="relative">
        <div className="absolute left-1/2 top-[-48px] h-[56px] w-4 -translate-x-1/2" style={{ background: "repeating-linear-gradient(0deg, var(--branch, #b5372a) 0 6px, #8a2a20 6px 8px)", backgroundColor: snap.branch.color }} aria-hidden />
        <motion.div initial={calm ? false : { rotate: -2, y: -6 }} animate={{ rotate: 0, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 8 }} style={{ transformOrigin: "50% -40px" }}>
          <IdCard st={st} gym={snap.org.name} band={snap.branch.color} layout={false} lang={lang} stamp={st.frozenNow ? <Stamp kind="freeze" word="FROZEN" seed={st.frozenNow.id} size={0.7} drop={false} /> : st.status === "lapsed" ? <Stamp kind="lapsed" word="LAPSED" seed={st.m.id} size={0.7} drop={false} /> : st.pending > 0 ? <Stamp kind="pending" word="PENDING" seed={st.m.id + "p"} size={0.65} drop={false} /> : undefined} />
        </motion.div>
        <Pass st={st} snap={snap} token={token} big={big} setBig={setBig} />
      </section>

      {/* band 2: days left as a loaded barbell */}
      <DaysBar st={st} />

      <PaySheet st={st} snap={snap} />
      <ReRack st={st} snap={snap} />
      <ChalkTally st={st} snap={snap} today={today} />
      <Receipts st={st} snap={snap} />

      <section aria-label="Settings" className="iron flex flex-col gap-2 p-4">
        <h2 className="t-teko text-[20px]">Settings</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-iron" onClick={() => setLang(lang === "en" ? "hi" : "en")}>
            {lang === "en" ? "हिंदी" : "English"}
          </button>
          <button type="button" className="btn-iron" aria-pressed={calm} onClick={toggleCalm}>
            Calm mode {calm ? "on" : "off"}
          </button>
        </div>
        <Settings st={st} />
      </section>
      {mode === "demo" && (
        <p className="t-hand text-center text-[15px]" style={{ color: "var(--chalk-dust)" }}>
          Open <Link className="underline" href="/demo/desk" target="_blank">the demo desk</Link> in another tab, then press Simulate scan above to watch the check-in land there.
        </p>
      )}
    </main>
  );
}

/** The rotating QR: a new code every 30 s, 10 minutes kept ahead for poor signal. */
function Pass({ st, snap, token, big, setBig }: { st: MemberState; snap: Snapshot; token?: string; big: boolean; setBig: (b: boolean) => void }) {
  const { mode, store } = useGym();
  const [codes, setCodes] = useState<{ slot: number; code: string }[]>([]);
  const [photo, setPhoto] = useState<string>("");
  const [now, setNow] = useState(() => Date.now());
  const [sent, setSent] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
        const cached = lsGet(`kb_qr_${token}`);
        if (cached && live) {
          const c = JSON.parse(cached);
          setCodes(c.codes);
          setPhoto(c.photo);
        }
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
    setSent(istClock(Date.now()));
    store.note("Sent to the demo desk tab. Watch the check-in land there.", "ink");
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <button type="button" onClick={() => setBig(!big)} className="relative grid place-items-center" aria-label={big ? "Make the code smaller" : "Show the code full width (Q)"} style={{ width: big ? "min(92vw, 420px)" : 196, height: big ? "min(92vw, 420px)" : 196, transition: "width .25s, height .25s", background: "var(--chalk)", padding: 14 }}>
        {code ? <Qr text={code} size={big ? 360 : 160} label="Your check-in code" /> : <div className="skeleton h-[160px] w-[160px]" style={{ background: "var(--chalk-dust)" }} />}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <rect x="1.5" y="1.5" width="97" height="97" fill="none" stroke="var(--knurl)" strokeWidth="3" />
          <rect x="1.5" y="1.5" width="97" height="97" fill="none" stroke="var(--brass)" strokeWidth="3" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - (left / SLOT_SECONDS) * 100} style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
      </button>
      <div className="t-teko text-center text-[16px]" style={{ color: "var(--chalk-dust)" }}>
        {offline ? <span style={{ color: "var(--hazard)" }}>Photo check: no signal for a while, the desk will look at your photo</span> : big ? "Turn brightness up" : `Show this at the desk · new code in ${left}s`}
      </div>
      {mode === "demo" && (
        <button type="button" className="btn-brass" onClick={simulate}>
          Simulate scan at desk {sent ? `· sent ${sent}` : ""}
        </button>
      )}
      <SelfCheckin st={st} snap={snap} />
      <HomeHint />
    </div>
  );
}

function SelfCheckin({ st, snap }: { st: MemberState; snap: Snapshot }) {
  const { store, mode } = useGym();
  const [msg, setMsg] = useState("");
  const fromPoster = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkin") === "1";
  if (!snap.branch.settings.selfCheckin || (!fromPoster && mode !== "demo")) return null;
  if (st.visitsToday) return <p className="t-hand text-[16px]">In today at {istClock(st.visitsToday)}.</p>;
  const go = () => {
    if (!navigator.geolocation) return setMsg("This phone cannot share location. Show your code at the desk.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const r = store.run("checkin", { id: uid(), memberId: st.m.id, method: "self_geo", geo: { lat: p.coords.latitude, lng: p.coords.longitude } });
        setMsg(r.ok ? "Checked in by location. The desk sees it as a self check-in." : r.error ?? "Not saved");
      },
      () => setMsg("Location was not shared. Show your code at the desk instead."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" className="btn-iron" onClick={go}>
        Check in here (uses location once)
      </button>
      {msg && <p className="t-hand text-center text-[15px]">{msg}</p>}
    </div>
  );
}

function HomeHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (lsGet("kb_a2hs") !== "1") setShow(true);
  }, []);
  if (!show) return null;
  return (
    <button type="button" className="t-hand text-[14px] underline" style={{ color: "var(--chalk-dust)" }} onClick={() => (lsSet("kb_a2hs", "1"), setShow(false))}>
      Tip: add this card to your home screen from the browser menu. (hide)
    </button>
  );
}

/** One plate per remaining week; the outermost plate shrinks to show a part week. */
function DaysBar({ st }: { st: MemberState }) {
  const days = Math.max(0, st.daysLeft ?? 0);
  const weeks = Math.ceil((days + 1) / 7);
  const shown = Math.min(weeks, 24);
  const part = ((days + 1) % 7) / 7 || 1;
  const plates = Array.from({ length: shown }, (_, k) => ({ state: plateFor(days - 7 * k), h: k === shown - 1 && weeks <= 24 ? 30 + 44 * part : 74 }));
  const left = plates.filter((_, i) => i % 2 === 0);
  const right = plates.filter((_, i) => i % 2 === 1);
  const frosted = !!st.frozenNow;
  return (
    <section aria-label={`${days} days left`} className="-mx-4 px-2">
      <Barbell
        height={100}
        bend={Math.min(3, shown * 0.12)}
        left={left.map((p, i) => <PlateSide key={i} state={p.state} h={Math.round(p.h)} w={9} frozen={frosted} />)}
        right={right.map((p, i) => <PlateSide key={i} state={p.state} h={Math.round(p.h)} w={9} frozen={frosted} />)}
      />
      <div className="flex items-baseline justify-center gap-3">
        <span className="t-stencil tnum text-[clamp(40px,12vw,64px)]" style={{ color: st.daysLeft != null && st.daysLeft < 0 ? "var(--plate-25)" : "var(--chalk)" }}>
          {st.daysLeft == null ? "-" : Math.abs(st.daysLeft)}
        </span>
        <span className="t-teko text-[20px]">{st.daysLeft != null && st.daysLeft < 0 ? "days since it ended" : "days left"}</span>
        <span className="t-mono text-[14px] muted">{st.endDate ? `ends ${fmtDay(st.endDate)}` : ""}</span>
      </div>
      {weeks > 24 && <p className="t-teko text-center text-[14px] muted">+{weeks - 24} more weeks on the rack</p>}
      <p className="sr-only">{PLATE[st.plate].en}</p>
    </section>
  );
}

/** Pay dues or renew by UPI. A payment is PENDING until the desk sees the money. */
function PaySheet({ st, snap }: { st: MemberState; snap: Snapshot }) {
  const { store, mode, today } = useGym();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [asked, setAsked] = useState<null | { amount: number; planId: string | null; at: number }>(null);
  const [utr, setUtr] = useState("");
  const plans = snap.plans.filter((p) => p.active && p.kind === "time").sort((a, b) => a.sort - b.sort);
  const pendingNow = snap.payments.filter((p) => p.memberId === st.m.id && p.state === "pending");
  const amount = plan ? plan.price : st.dues;
  const key = `kb_upi_ask_${st.m.id}`;

  useEffect(() => {
    const saved = ssGet(key);
    if (saved) setAsked(JSON.parse(saved));
    const back = () => {
      const s = ssGet(key);
      if (document.visibilityState === "visible" && s) setAsked(JSON.parse(s));
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [key]);

  const pay = () => {
    if (!amount) return;
    const a = { amount, planId: plan?.id ?? null, at: Date.now() };
    ssSet(key, JSON.stringify(a));
    if (mode === "live") window.location.href = upiLink({ vpa: snap.branch.vpa, payee: snap.branch.payeeName || snap.org.name, amount, note: `KB ${st.m.memberNo} ${plan?.nameEn ?? "dues"}` });
    else setAsked(a);
  };
  const answer = (yes: boolean) => {
    if (yes && asked) {
      const payments = [{ id: uid(), mode: "upi_member", amount: asked.amount, state: "pending", utrLast4: utr }];
      const r = asked.planId ? store.run("renew", { membershipId: uid(), memberId: st.m.id, planId: asked.planId, discount: 0, payments }) : store.run("pay", { memberId: st.m.id, payments });
      if (!r.ok) store.note(r.error ?? "Not saved");
    }
    try {
      sessionStorage.removeItem(key);
    } catch {}
    setAsked(null);
    setPlan(null);
    setUtr("");
  };
  const start = renewalStart(st, today, snap.branch.settings.backdateWithin7).start;

  return (
    <section aria-label="Pay or renew" className="flex flex-col gap-3">
      {pendingNow.length > 0 && (
        <div className="iron flex items-center gap-3 p-3">
          <Stamp kind="pending" word="PENDING" seed={pendingNow[0].id} size={0.7} drop={false} />
          <span className="t-hand text-[16px]">
            {rupees(pendingNow.reduce((a, p) => a + p.amount, 0))} sent at {istClock(pendingNow[0].createdAt)}. Waiting for the desk to confirm it reached the gym.
          </span>
        </div>
      )}
      {st.dues > 0 && !plan && (
        <button type="button" className="btn-brass !min-h-14 !text-[24px]" onClick={pay}>
          Pay {rupees(st.dues)} by UPI
        </button>
      )}
      <div className="iron p-3">
        <div className="t-teko text-[18px]">Renew early</div>
        <div className="mt-2 flex flex-wrap justify-around gap-2" role="radiogroup" aria-label="Plans">
          {plans.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={plan?.id === p.id} onClick={() => setPlan(plan?.id === p.id ? null : p)} className="flex min-h-11 flex-col items-center" style={{ opacity: plan && plan.id !== p.id ? 0.45 : 1 }}>
              <motion.span animate={plan?.id === p.id ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }} transition={SPRING}>
                <Plate state={p.plate} size={50} label="" />
              </motion.span>
              <span className="t-teko text-[14px]">{p.nameEn}</span>
              <span className="t-mono text-[12px]" style={{ color: "var(--brass-hi)" }}>
                {rupees(p.price)}
              </span>
            </button>
          ))}
        </div>
        {plan && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="t-mono text-center text-[13px]">
              {fmtDay(start)} to {fmtDay(planEnd(start, plan.months, plan.days))}
            </p>
            <button type="button" className="btn-brass !min-h-12" onClick={pay}>
              Renew {plan.nameEn}: {rupees(plan.price)} by UPI
            </button>
          </div>
        )}
      </div>
      <AnimatePresence>
        {asked && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="ledger-plain w-full max-w-[440px] p-5" initial={{ y: 40 }} animate={{ y: 0 }} role="dialog" aria-modal="true" aria-label="Did the payment go through?">
              <p className="t-hand text-[22px]" style={{ color: "var(--ink)" }}>
                Did the payment of {rupees(asked.amount)} go through?
              </p>
              {mode === "demo" && <p className="t-hand text-[15px]" style={{ color: "var(--margin-red)" }}>Demo: no UPI app was opened and no money moves.</p>}
              <label className="mt-3 block">
                <span className="t-teko text-[16px]" style={{ color: "var(--carbon)" }}>
                  UPI reference, last 4 digits (optional)
                </span>
                <input inputMode="numeric" maxLength={4} className="field" value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 4))} />
              </label>
              <div className="mt-4 flex gap-2">
                <button type="button" className="btn-brass !min-h-12 flex-1" onClick={() => answer(true)}>
                  Yes, paid
                </button>
                <button type="button" className="btn-ink !min-h-12 flex-1" onClick={() => answer(false)}>
                  No
                </button>
              </div>
              <p className="t-hand mt-2 text-[14px]" style={{ color: "var(--muted-on-paper)" }}>
                It shows as PENDING until the desk sees the money in the gym&apos;s UPI app. A screenshot is not needed.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Rack the bar to pause: drag the knurled sleeve back onto the wall rack. */
function ReRack({ st, snap }: { st: MemberState; snap: Snapshot }) {
  const { store, today, calm } = useGym();
  const x = useMotionValue(0);
  const track = useRef<HTMLDivElement>(null);
  const [days, setDays] = useState(0);
  const [from, setFrom] = useState(addDays(today, 1));
  const [undo, setUndo] = useState<null | { id: string; at: number }>(null);
  const chk = freezeRules(snap, st, Math.max(1, days));
  const max = chk.maxNow;
  const req = st.freezeRequest;
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(t);
  }, [undo]);
  if (!st.term || st.status === "lapsed") return null;
  const send = (n: number) => {
    if (n < chk.minDays) return store.note(`At least ${chk.minDays} days per freeze`, "ink");
    const id = uid();
    const r = store.run("freeze.set", { id, memberId: st.m.id, fromDate: from, days: n, reason: "Asked from the card" });
    if (!r.ok) return store.note(r.error ?? "Not sent");
    setUndo({ id, at: Date.now() });
    setDays(0);
  };
  const newEnd = st.endDate ? addDays(st.endDate, days) : null;
  return (
    <section aria-label="Pause my plan" className="iron p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="t-teko text-[20px]">Pause my plan</h2>
        <span className="t-teko text-[14px] muted">{chk.maxCount ? `${chk.maxCount - chk.usedCount} of ${chk.maxCount} freezes left · max ${chk.maxDays} days` : chk.why}</span>
      </div>
      {/* empty rack slots show the gym's rules */}
      <div className="mt-2 flex gap-2" aria-hidden>
        {Array.from({ length: Math.max(1, chk.maxCount) }, (_, i) => (
          <span key={i} className="block h-6 w-10" style={{ background: i < chk.usedCount ? "var(--steel-lo)" : "transparent", border: "2px solid var(--steel)", borderTop: "none", borderRadius: "0 0 8px 8px" }} />
        ))}
      </div>
      {req ? (
        <p className="t-hand mt-3 text-[16px]">
          Waiting for desk: {req.days} days from {fmtDay(req.fromDate)}. Your plates stay half-frosted until they approve.
        </p>
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
              onDrag={() => {
                const w = track.current?.getBoundingClientRect().width ?? 300;
                setDays(Math.round((x.get() / Math.max(1, w - 56)) * max));
              }}
              onDragEnd={() => days > 0 && setDays(days)}
              className="knurl grip absolute left-0 top-0 h-12 w-14 cursor-grab rounded-sm"
              role="slider"
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={days}
              aria-label="Days to pause: drag the sleeve"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setDays((v) => Math.min(max, v + 1));
                if (e.key === "ArrowLeft") setDays((v) => Math.max(0, v - 1));
              }}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="t-teko text-[14px] muted">
              From
              <input type="date" className="field-floor mt-1 t-mono" min={today} value={from} onChange={(e) => setFrom(e.target.value || from)} />
            </label>
            <label className="t-teko text-[14px] muted">
              Days
              <input type="number" min={0} max={max} className="field-floor mt-1 t-mono" value={days} onChange={(e) => setDays(Math.max(0, Math.min(max, Number(e.target.value) || 0)))} />
            </label>
          </div>
          <p className="t-hand mt-2 text-[16px]" aria-live="polite">
            {days > 0 && newEnd ? `Expiry moves from ${fmtDay(st.endDate)} to ${fmtDay(newEnd)} (${fmtDay(from)} to ${fmtDay(addDays(from, days - 1))})` : "Drag the sleeve right, or type the days."}
          </p>
          <button type="button" className="btn-brass mt-2" disabled={days < 1} onClick={() => send(days)}>
            Send the request
          </button>
        </>
      ) : (
        <p className="t-hand mt-2 text-[15px]">{chk.why}</p>
      )}
      <AnimatePresence>
        {undo && (
          <motion.div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 bg-[var(--iron)] px-4 py-3" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={calm ? { duration: 0.15 } : SPRING}>
            <span className="t-teko text-[17px]">Freeze request sent</span>
            <button
              type="button"
              className="btn-brass !min-h-10"
              onClick={() => {
                store.run("freeze.cancel", { id: undo.id });
                setUndo(null);
              }}
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** This week and the last 8 as chalk tallies. A streak counts weeks that hit your own target. */
function ChalkTally({ st, snap, today }: { st: MemberState; snap: Snapshot; today: string }) {
  const { store } = useGym();
  const target = st.m.weeklyTarget || 3;
  const weeks = useMemo(() => {
    const ws = weekStart(today);
    return Array.from({ length: 9 }, (_, i) => {
      const s = addDays(ws, -7 * i);
      const e = addDays(s, 6);
      const n = snap.checkins.filter((c) => c.memberId === st.m.id && c.istDate >= s && c.istDate <= e).length;
      const frozen = snap.freezes.some((f) => f.memberId === st.m.id && f.state === "approved" && f.fromDate <= e && f.toDate >= s);
      const before = st.m.createdAt.slice(0, 10) > e;
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
    <section aria-label="Visits" className="p-1">
      <div className="flex items-baseline justify-between">
        <h2 className="t-teko text-[20px]">Chalk tally</h2>
        <span className="t-hand text-[16px]">
          {streak} week streak at {target} a week
        </span>
      </div>
      <ol className="mt-2 flex flex-col gap-1">
        {weeks.map((w, i) => (
          <li key={w.s} className="flex items-center gap-3">
            <span className="t-mono w-16 text-[12px] muted">{i === 0 ? "this week" : fmtDay(w.s)}</span>
            <Tally n={w.n} smudged={!w.current && !w.frozen && !w.before && w.n < target} hatched={w.frozen} delay={i * 0.05} />
          </li>
        ))}
      </ol>
      <label className="t-teko mt-2 flex items-center gap-2 text-[15px] muted">
        My weekly target
        <select className="h-9 bg-[var(--iron)] px-2 text-[var(--chalk)]" value={target} onChange={(e) => store.run("member.update", { id: st.m.id, fields: { weeklyTarget: Number(e.target.value) } })}>
          {[2, 3, 4, 5, 6].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <p className="t-hand text-[14px] muted">Rest days never break a streak. A missed week smudges; frozen weeks never count as missed.</p>
    </section>
  );
}

function Receipts({ st, snap }: { st: MemberState; snap: Snapshot }) {
  const { mode } = useGym();
  const pays = snap.payments.filter((p) => p.memberId === st.m.id && p.state !== "rejected").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return (
    <section aria-label="Receipts" className="flex flex-col gap-2">
      <h2 className="t-teko text-[20px]">Receipts</h2>
      {pays.slice(0, 6).map((p) => (
        <Link key={p.id} href={mode === "demo" ? `/demo/r/${p.id}${snap.branch.code === "LV" ? "?b=LV" : ""}` : `/r/${p.id}`} className="ledger-plain mx-auto block w-full max-w-[340px] px-4 py-2">
          <div className="carbon t-mono flex justify-between text-[13px]">
            <span>{fmtDay(todayIST(Date.parse(p.createdAt)))}</span>
            <span>{p.receiptNo || (p.state === "pending" ? "PENDING" : "")}</span>
            <span>{rupees(p.amount)}</span>
          </div>
        </Link>
      ))}
      {!pays.length && <p className="t-hand text-[15px] muted">No payments yet.</p>}
    </section>
  );
}

function Settings({ st }: { st: MemberState }) {
  const { store } = useGym();
  const [asked, setAsked] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5" checked={st.m.remindersOptOut} onChange={(e) => store.run("member.update", { id: st.m.id, fields: { remindersOptOut: e.target.checked } })} />
        <span>Stop WhatsApp reminders</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-iron" onClick={() => (store.run("task.add", { id: uid(), memberId: st.m.id, kind: "export" }).ok ? setAsked("The owner will send you a copy of your data.") : null)}>
          Download my data
        </button>
        <button type="button" className="btn-iron" onClick={() => (store.run("task.add", { id: uid(), memberId: st.m.id, kind: "erase" }).ok ? setAsked("The owner will erase your details. Payment records stay for the accounts.") : null)}>
          Delete my data
        </button>
      </div>
      {asked && <p className="t-hand text-[15px]">{asked}</p>}
      <p className="t-hand text-[13px] muted">
        Joined {fmtDay(st.m.createdAt.slice(0, 10))} · {diffDays(todayIST(), st.m.createdAt.slice(0, 10))} days with the gym
      </p>
    </div>
  );
}
