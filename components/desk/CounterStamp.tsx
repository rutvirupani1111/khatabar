"use client";
// Signature 2: lift the card, flip it, load a plan plate on the bar, take the
// money, stamp it. Target: R, a plan number, Shift+P. Three keys, under 6 s.
import { AnimatePresence, motion } from "motion/react";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Barbell, Plate, PLATE, PlateSide, SPRING, PLATE_SPRING, Stamp } from "@/components/art";
import { IdCard } from "@/components/art/IdCard";
import { Qr } from "@/components/art/Qr";
import { fmtDay, fmtDayYear, planEnd } from "@/lib/core/dates";
import { rupees, toPaise, uid, upiLink } from "@/lib/core/money";
import { renewalStart, type MemberState } from "@/lib/core/state";
import type { Plan, Snapshot } from "@/lib/core/types";
import { useGym } from "@/components/shell/Gym";

export type Stage = "front" | "renew" | "upi" | "split" | "stamped";

export interface Landed {
  opId: string;
  paymentIds: string[];
  memberId: string;
  at: number;
  amount: number;
  partDue: number;
  newEnd: string | null;
  planName: string;
}

export interface WellApi {
  key: (e: KeyboardEvent) => boolean;
  stage: Stage;
  openRenew: () => void;
  /** Ctrl+Z after a payment: the stamp lifts off the card again */
  lift: (memberId: string) => void;
}

/** Digits that roll like a scoreboard, 40 ms apart, fixed width. */
function Scoreboard({ text }: { text: string }) {
  return (
    <span className="t-mono inline-flex overflow-hidden" style={{ height: "1.25em", lineHeight: "1.25em" }} aria-label={text}>
      {text.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="inline-block overflow-hidden" style={{ width: "0.62em", height: "1.25em" }} aria-hidden>
            <motion.span className="flex flex-col" animate={{ y: `-${Number(ch) * 1.25}em` }} transition={{ ...SPRING, delay: i * 0.04 }}>
              {Array.from({ length: 10 }, (_, d) => (
                <span key={d} style={{ height: "1.25em" }}>
                  {d}
                </span>
              ))}
            </motion.span>
          </span>
        ) : (
          <span key={i} aria-hidden style={{ width: ch === " " ? "0.4em" : undefined }} className="inline-block">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

function plansFor(snap: Snapshot) {
  return snap.plans.filter((p) => p.active && p.kind === "time").sort((a, b) => a.sort - b.sort).slice(0, 6);
}

export const CounterStamp = forwardRef<WellApi, { st: MemberState; snap: Snapshot; onLanded: (l: Landed) => void; onCheckin: () => void; onFreeze: () => void; onWhatsApp: (paymentId: string | null) => void; onRelink: () => void; landing: string | null }>(function CounterStamp({ st, snap, onLanded, onCheckin, onFreeze, onWhatsApp, onRelink, landing }, ref) {
  const { store, mode, calm, lang, today } = useGym();
  const [stage, setStage] = useState<Stage>("front");
  const [planId, setPlanId] = useState<string | null>(null);
  const [pt, setPt] = useState(false);
  const [discount, setDiscount] = useState("");
  const [pin, setPin] = useState("");
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [split, setSplit] = useState({ cash: "", upi: "" });
  const [field, setField] = useState<null | "discount" | "amount" | "pin">(null);
  const [bend, setBend] = useState(0);
  const [err, setErr] = useState("");
  const [stamp, setStamp] = useState<null | { word: string; kind: "paid" | "pending" | "due"; id: string; due: number }>(null);
  // old dues ride on the renewal by default; O leaves them for another day
  const [withDues, setWithDues] = useState(true);
  const [lastPay, setLastPay] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const utrRef = useRef<HTMLInputElement>(null);
  const discRef = useRef<HTMLInputElement>(null);
  const amtRef = useRef<HTMLInputElement>(null);
  const cashRef = useRef<HTMLInputElement>(null);

  const plans = useMemo(() => plansFor(snap), [snap]);
  const ptPlan = snap.plans.find((p) => p.active && (p.kind === "sessions" || p.kind === "addon"));
  const plan = plans.find((p) => p.id === planId) ?? null;
  const { start, rule } = renewalStart(st, today, snap.branch.settings.backdateWithin7);
  const end = plan ? planEnd(start, plan.months, plan.days) : null;
  const joining = !snap.memberships.some((x) => x.memberId === st.m.id && x.status !== "void") && plan ? plan.joiningFee : 0;
  const disc = toPaise(discount || 0);
  const oldDues = plan && withDues ? st.dues : 0;
  const bill = plan ? plan.price - disc + joining + (pt && ptPlan ? ptPlan.price : 0) : 0;
  const total = plan ? bill + oldDues : st.dues;
  const pay = amount ? Math.min(total, toPaise(amount)) : total;
  const overLimit = plan ? disc > (plan.price * snap.branch.settings.discountLimitPct) / 100 && store.state.actor.role === "desk" : false;
  const ruleText = rule === "after" ? `Starts ${fmtDay(start)} (day after expiry)` : rule === "lapse" ? `Starts ${fmtDay(start)} (from the lapse date)` : `Starts ${fmtDay(start)} (today)`;

  // reset when another member is lifted
  useEffect(() => {
    setStage("front");
    setPlanId(null);
    setPt(false);
    setDiscount("");
    setAmount("");
    setPin("");
    setUtr("");
    setStamp(null);
    setErr("");
    setField(null);
    setWithDues(true);
  }, [st.m.id]);

  const choose = (id: string | null) => {
    setPlanId(id);
    setErr("");
    if (id) {
      setBend(2.5);
      setTimeout(() => setBend(1), 300);
    } else setBend(0);
  };

  const commit = (payments: { mode: "cash" | "upi_desk" | "card"; amount: number; state: "confirmed" | "pending" }[]) => {
    if (overLimit && pin.length !== 4) {
      setField("pin");
      setErr(`Discount above ${snap.branch.settings.discountLimitPct}% needs a manager PIN`);
      return;
    }
    const pays = payments.filter((p) => p.amount > 0).map((p) => ({ id: uid(), ...p, utrLast4: p.mode === "upi_desk" ? utr : "" }));
    if (!plan && !pays.length) return setErr("Nothing to pay");
    const r = plan
      ? store.run("renew", { membershipId: uid(), ptMembershipId: uid(), memberId: st.m.id, planId: plan.id, ptPlanId: pt ? ptPlan?.id : null, discount: disc, approverPin: pin || undefined, payments: pays })
      : store.run("pay", { memberId: st.m.id, payments: pays });
    if (!r.ok) {
      setErr(r.error ?? "Not saved");
      if (/PIN/.test(r.error ?? "")) {
        setPin("");
        setField("pin");
      }
      return;
    }
    setErr("");
    if (r.note) store.note(r.note, "ink");
    const confirmed = pays.filter((p) => p.state === "confirmed").reduce((a, p) => a + p.amount, 0);
    // what is still owed once this lands, old dues included: the same figure the card's own dues line will show
    const due = Math.max(0, st.dues + bill - pays.reduce((a, p) => a + p.amount, 0));
    const pid = pays[0]?.id ?? null;
    const sid = pid ?? uid();
    setLastPay(pid);
    setStamp(confirmed > 0 ? (due > 0 ? { word: "PART PAID", kind: "due", id: sid, due } : { word: "PAID", kind: "paid", id: sid, due: 0 }) : { word: "PENDING", kind: "pending", id: sid, due });
    setStage("stamped");
    setField(null);
    // Act 5: stamp at 0, chalk at 120, flip back at 260, land in the register at 640
    setTimeout(() => setStage("front"), calm ? 150 : 260);
    setTimeout(
      () =>
        onLanded({
          opId: r.opId,
          paymentIds: pays.map((p) => p.id),
          memberId: st.m.id,
          at: Date.now(),
          amount: pays.reduce((a, p) => a + p.amount, 0),
          partDue: due,
          newEnd: end,
          planName: plan?.nameEn ?? "dues",
        }),
      calm ? 150 : 640,
    );
  };

  const api: WellApi = {
    stage,
    openRenew: () => setStage("renew"),
    lift: (memberId) => {
      if (memberId !== st.m.id) return;
      setStamp(null);
      setStage("front");
    },
    key: (e) => {
      const k = e.key;
      const inField = (e.target as HTMLElement).closest?.("input,textarea");
      if (stage === "front" || stage === "stamped") {
        if (inField) return false;
        if (k === "r" || k === "R") {
          if (e.shiftKey) return false;
          setStage("renew");
          setStamp(null);
          return true;
        }
        if (k === "P" && e.shiftKey && st.dues > 0) {
          commit([{ mode: "cash", amount: st.dues, state: "confirmed" }]);
          return true;
        }
        if (k === "p" && st.dues > 0) {
          setStage("upi");
          setTimeout(() => utrRef.current?.focus(), 50);
          return true;
        }
        if (k === "c" || k === "C") {
          onCheckin();
          return true;
        }
        if (k === "f" || k === "F") {
          onFreeze();
          return true;
        }
        if (k === "w" || k === "W") {
          onWhatsApp(lastPay);
          return true;
        }
        if (k === "L" && e.shiftKey) {
          onRelink();
          return true;
        }
        return false;
      }
      if (stage === "renew") {
        if (k === "Escape") {
          if (field) {
            setField(null);
            (document.activeElement as HTMLElement)?.blur();
            return true;
          }
          setStage("front");
          return true;
        }
        if (inField && k !== "Enter") return false;
        if (/^[1-6]$/.test(k) && !inField) {
          const p = plans[Number(k) - 1];
          if (p) choose(p.id);
          return true;
        }
        if ((k === "Backspace" || k === "Delete") && !inField) {
          choose(null);
          return true;
        }
        if ((k === "t" || k === "T") && !inField) {
          if (ptPlan) setPt((v) => !v);
          return true;
        }
        if ((k === "o" || k === "O") && !inField && st.dues > 0) {
          setWithDues((v) => !v);
          return true;
        }
        if ((k === "d" || k === "D") && !inField) {
          setField("discount");
          setTimeout(() => discRef.current?.focus(), 20);
          e.preventDefault();
          return true;
        }
        if ((k === "a" || k === "A") && !inField) {
          setField("amount");
          setTimeout(() => amtRef.current?.focus(), 20);
          e.preventDefault();
          return true;
        }
        if (!plan) {
          if ("pPsS".includes(k)) setErr("Pick a plan first: press 1 to 6");
          return "pPsS".includes(k);
        }
        if (k === "P" && e.shiftKey) {
          commit([{ mode: "cash", amount: pay, state: "confirmed" }]);
          e.preventDefault();
          return true;
        }
        if (k === "p" && !e.shiftKey) {
          setStage("upi");
          setTimeout(() => utrRef.current?.focus(), 60);
          e.preventDefault();
          return true;
        }
        if (k === "S" && e.shiftKey) {
          setSplit({ cash: "", upi: String(pay / 100) });
          setStage("split");
          setTimeout(() => cashRef.current?.focus(), 60);
          e.preventDefault();
          return true;
        }
        if (k === "Enter" && inField) {
          setField(null);
          (document.activeElement as HTMLElement)?.blur();
          return true;
        }
        return false;
      }
      if (stage === "upi") {
        if (k === "Escape") {
          setStage(plan ? "renew" : "front");
          return true;
        }
        if (k === "Enter") {
          commit([{ mode: "upi_desk", amount: plan ? pay : st.dues, state: "confirmed" }]);
          e.preventDefault();
          return true;
        }
        if ((k === "l" || k === "L") && !inField) {
          commit([{ mode: "upi_desk", amount: plan ? pay : st.dues, state: "pending" }]);
          return true;
        }
        return false;
      }
      if (stage === "split") {
        if (k === "Escape") {
          setStage("renew");
          return true;
        }
        if (k === "Enter") {
          const c = toPaise(split.cash || 0);
          const u = toPaise(split.upi || 0);
          if (c + u !== pay) {
            setErr(`Cash + UPI must add up to ${rupees(pay)}`);
            return true;
          }
          commit([
            { mode: "cash", amount: c, state: "confirmed" },
            { mode: "upi_desk", amount: u, state: "confirmed" },
          ]);
          e.preventDefault();
          return true;
        }
        return false;
      }
      return false;
    },
  };
  useImperativeHandle(ref, () => api);

  // a second screen facing the customer (/face) shows the same QR full size
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(`kb-face-${snap.branch.id}`);
    if (stage === "upi") ch.postMessage({ type: "qr", text: upiLink({ vpa: snap.branch.vpa, payee: snap.branch.payeeName || snap.org.name, amount: plan ? pay : st.dues, note: `KB ${st.m.memberNo} ${plan?.nameEn ?? "dues"}` }), amount: plan ? pay : st.dues, name: st.m.name, demo: mode === "demo" });
    else ch.postMessage({ type: "clear" });
    ch.close();
  }, [stage, plan, pay, st.dues, st.m.memberNo, st.m.name, snap.branch, snap.org.name, mode]);

  // the card's own state stamp; 1-14 days over reads DUE like the register and rack, 15+ reads LAPSED
  const cardStamp = st.frozenNow ? (
    <Stamp kind="freeze" word="FROZEN" seed={st.frozenNow.id} size={0.75} drop={false} />
  ) : st.status === "lapsed" ? (
    <Stamp kind={st.plate === "p25" ? "lapsed" : "due"} word={PLATE[st.plate].en} sub={st.dues > 0 ? `बाकी ${rupees(st.dues)}` : undefined} seed={st.m.id + "l"} size={0.75} drop={false} />
  ) : st.dues > 0 ? (
    <Stamp kind="due" word="बाकी" sub={rupees(st.dues)} seed={st.m.id + "d"} size={0.7} drop={false} />
  ) : st.pending > 0 ? (
    <Stamp kind="pending" word="PENDING" seed={st.m.id + "p"} size={0.7} drop={false} />
  ) : null;
  const flipped = stage !== "front";
  const daysPlates = Math.min(4, Math.max(0, Math.ceil((st.daysLeft ?? 0) / 14)));
  const qrText = upiLink({ vpa: snap.branch.vpa, payee: snap.branch.payeeName || snap.org.name, amount: plan ? pay : st.dues, note: `KB ${st.m.memberNo} ${plan?.nameEn ?? "dues"}` });

  return (
    <div className="relative w-full" style={{ perspective: 1400 }}>
      <motion.div layoutId={landing ? undefined : `card-${st.m.id}`} transition={SPRING} className="relative w-full" style={{ aspectRatio: "3.375 / 2.125" }}>
        <motion.div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: flipped ? 180 : 0 }} transition={calm ? { duration: 0.15 } : { type: "spring", stiffness: 260, damping: 26, mass: 1 }}>
          {/* front */}
          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
            <IdCard
              st={st}
              gym={snap.org.name}
              band={snap.branch.color}
              layout={false}
              lang={lang}
              stamp={
                <AnimatePresence mode="popLayout">
                  {stamp && stage === "front" ? (
                    // one stamp, one dues figure: PART PAID carries the same balance the card prints
                    <motion.span key={stamp.id} className="inline-block" exit={calm ? { opacity: 0 } : { opacity: 0, scale: 1.35, y: -26, rotate: -4 }} transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}>
                      <Stamp kind={stamp.kind} word={stamp.word} sub={stamp.kind === "due" ? `बाकी ${rupees(stamp.due)}` : undefined} seed={stamp.id} size={0.8} drop={false} />
                    </motion.span>
                  ) : (
                    <motion.span key="state" className="inline-block" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {cardStamp}
                    </motion.span>
                  )}
                </AnimatePresence>
              }
            />
          </div>
          {/* back */}
          <div className="iron absolute inset-0 flex flex-col p-3" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: "3.2% / 5%", clipPath: "none" }}>
            {(stage === "renew" || stage === "stamped") && (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="t-teko truncate text-[18px]" style={{ color: "var(--chalk)" }}>
                    Renew · {st.m.name}
                  </span>
                  <span className="t-teko shrink-0 text-[13px] muted">{start ? ruleText : ""}</span>
                </div>
                <div ref={barRef} className="relative -mx-1 mt-1">
                  <Barbell
                    height={72}
                    bend={bend}
                    label={plan ? `${plan.nameEn} plate on the bar` : "Empty bar"}
                    left={
                      <>
                        <AnimatePresence>
                          {plan && (
                            <motion.span key={plan.id} layoutId={`planplate-${plan.id}`} transition={PLATE_SPRING} className="inline-flex">
                              <PlateSide state={plan.plate} h={64} w={15} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {pt && <PlateSide state="brass" h={30} w={7} />}
                        {Array.from({ length: daysPlates }, (_, i) => (
                          <PlateSide key={i} state="iron" h={40 - i * 4} w={7} />
                        ))}
                      </>
                    }
                    right={
                      <>
                        {plan && <PlateSide state={plan.plate} h={64} w={15} />}
                        {pt && <PlateSide state="brass" h={30} w={7} />}
                        {Array.from({ length: daysPlates }, (_, i) => (
                          <PlateSide key={i} state="iron" h={40 - i * 4} w={7} />
                        ))}
                      </>
                    }
                  />
                  <motion.div key={planId ?? "none"} className="pointer-events-none absolute left-1/2 top-[2px] -translate-x-1/2" animate={{ scaleX: [1, 0.82, 1] }} transition={{ duration: 0.18 }}>
                    <span className="t-stencil block text-center text-[20px]" style={{ color: "var(--brass-hi)" }}>
                      {plan ? rupees(total) : ""}
                    </span>
                  </motion.div>
                  {st.dues > 0 && (
                    // old dues written on the bar itself, so the desk never tells an owing member they are paid up
                    <span className="t-teko pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px]" style={{ color: withDues ? "#ff9b8a" : "var(--muted-on-floor)" }}>
                      {withDues ? `incl. old dues ${rupees(st.dues)}` : `old dues ${rupees(st.dues)} left on the card`} · <span className="kbd !h-4 !min-w-4">O</span>
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-end justify-center gap-[6px]" role="radiogroup" aria-label="Plans: keys 1 to 6">
                  {plans.map((p, i) => (
                    <PlanPlate key={p.id} p={p} n={i + 1} chosen={planId === p.id} onPick={() => choose(p.id)} barRef={barRef} lang={lang} />
                  ))}
                </div>
                <div className="mt-auto flex items-end justify-between gap-2">
                  <div className="min-w-0 shrink-0">
                    <div className="t-teko text-[13px] muted">New expiry</div>
                    <div className="text-[19px]" style={{ color: "var(--chalk)" }}>
                      {end ? <Scoreboard text={fmtDayYear(end)} /> : <span className="t-mono muted">-- --- ----</span>}
                    </div>
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="t-teko text-[12px] muted">
                      {joining ? `joining ${rupees(joining)} · ` : ""}
                      {disc ? `discount ${rupees(disc)} · ` : ""}
                      {pt && ptPlan ? `${ptPlan.nameEn} · ` : ""}
                      {amount ? `paying ${rupees(pay)} now` : "1-6 plan · T PT · D disc · A amount"}
                    </div>
                    <div className="t-teko text-[14px]" style={{ color: "var(--brass-hi)" }}>
                      P UPI · Shift+P cash · Shift+S split
                    </div>
                  </div>
                </div>
                {field && (
                  // sits over the plate pegs, never over the new expiry or the error row under it
                  <div className="absolute inset-x-3 bottom-[82px] flex items-center gap-2 bg-[var(--iron)] p-2" style={{ border: "1px solid var(--iron-hi)" }}>
                    {field === "discount" && (
                      <>
                        <label className="t-teko text-[15px]" htmlFor="kb-disc">
                          Discount ₹
                        </label>
                        <input id="kb-disc" ref={discRef} inputMode="numeric" className="field-floor t-mono h-8 !w-24" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ""))} />
                        {overLimit && (
                          <>
                            <label className="t-teko text-[14px]" htmlFor="kb-mpin" style={{ color: "var(--hazard)" }}>
                              Manager PIN
                            </label>
                            <input id="kb-mpin" type="password" inputMode="numeric" maxLength={4} className="field-floor t-mono h-8 !w-20" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                          </>
                        )}
                      </>
                    )}
                    {field === "pin" && (
                      <>
                        <label className="t-teko text-[14px]" htmlFor="kb-mpin2" style={{ color: "var(--hazard)" }}>
                          Manager PIN for the discount
                        </label>
                        <input id="kb-mpin2" autoFocus type="password" inputMode="numeric" maxLength={4} className="field-floor t-mono h-8 !w-20" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                      </>
                    )}
                    {field === "amount" && (
                      <>
                        <label className="t-teko text-[15px]" htmlFor="kb-amt">
                          Paying now ₹
                        </label>
                        <input id="kb-amt" ref={amtRef} inputMode="numeric" className="field-floor t-mono h-8 !w-28" value={amount} placeholder={String(total / 100)} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
                        <span className="t-teko text-[13px] muted">rest becomes dues</span>
                      </>
                    )}
                    <span className="t-teko ml-auto text-[13px] muted">Enter to keep</span>
                  </div>
                )}
              </>
            )}
            {stage === "upi" && (
              <div className="flex min-h-0 flex-1 gap-3">
                <Qr text={qrText} size={150} label={`UPI QR for ${rupees(plan ? pay : st.dues)}`} watermark={mode === "demo" ? "DEMO, do not pay" : undefined} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="t-stencil text-[30px]" style={{ color: "var(--brass-hi)" }}>
                    {rupees(plan ? pay : st.dues)}
                  </div>
                  <div className="t-teko truncate text-[14px] muted">
                    to {snap.branch.vpa} · {snap.branch.payeeName || snap.org.name}
                  </div>
                  <div className="mt-1">
                    <Stamp kind="pending" word="PENDING" seed={st.m.id + "upi"} size={0.62} />
                  </div>
                  <div className="t-teko text-[14px]" style={{ color: "var(--hazard)" }}>
                    Waiting for UPI. Check your phone/bank SMS
                  </div>
                  <div className="mt-auto flex items-center gap-2">
                    <label htmlFor="kb-utr" className="t-teko text-[13px] muted">
                      UTR last 4
                    </label>
                    <input id="kb-utr" ref={utrRef} inputMode="numeric" maxLength={4} className="field-floor t-mono h-8 !w-20" value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                  </div>
                  <div className="t-teko mt-1 text-[13px]" style={{ color: "var(--brass-hi)" }}>
                    Enter: money arrived · L: leave pending · Esc
                  </div>
                </div>
              </div>
            )}
            {stage === "split" && (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className="t-teko text-[18px]">Split {rupees(pay)}</div>
                <label className="flex items-center gap-2">
                  <span className="t-teko w-14 text-[16px]">Cash ₹</span>
                  <input ref={cashRef} inputMode="numeric" className="field-floor t-mono h-9" value={split.cash} onChange={(e) => {
                    const c = e.target.value.replace(/\D/g, "");
                    setSplit({ cash: c, upi: String(Math.max(0, pay / 100 - Number(c || 0))) });
                  }} />
                </label>
                <label className="flex items-center gap-2">
                  <span className="t-teko w-14 text-[16px]">UPI ₹</span>
                  <input inputMode="numeric" className="field-floor t-mono h-9" value={split.upi} onChange={(e) => setSplit((s) => ({ ...s, upi: e.target.value.replace(/\D/g, "") }))} />
                </label>
                <div className="t-teko mt-auto text-[13px]" style={{ color: "var(--brass-hi)" }}>
                  Enter when both are in hand · Esc
                </div>
              </div>
            )}
            {stage === "stamped" && stamp && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <Stamp kind={stamp.kind} word={stamp.word} seed={stamp.id} size={1.3} />
                {!calm && <ChalkPuff />}
              </div>
            )}
            {/* its own reserved row: an error never sits on top of the new expiry */}
            <p role="alert" className="t-hand h-[18px] shrink-0 truncate text-[14px] leading-[18px]" style={{ color: "#ff8a7a" }}>
              {err}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
});

function ChalkPuff() {
  return (
    <span className="absolute inset-0" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => {
        const corner = i % 4;
        const x = corner % 2 ? 72 : 28;
        const y = corner < 2 ? 34 : 66;
        return (
          <motion.span key={i} className="absolute block size-2 rounded-full" style={{ left: `${x}%`, top: `${y}%`, background: "var(--chalk-dust)" }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0], x: (i % 3) * 14 - 14, y: -18 - (i % 4) * 8, scale: 2 }} transition={{ delay: 0.12, duration: 0.45 }} />
        );
      })}
    </span>
  );
}

function PlanPlate({ p, n, chosen, onPick, barRef, lang }: { p: Plan; n: number; chosen: boolean; onPick: () => void; barRef: React.RefObject<HTMLDivElement | null>; lang: "en" | "hi" }) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={chosen}
      aria-label={`${n}: ${p.nameEn} ${rupees(p.price)}`}
      onClick={onPick}
      drag
      dragSnapToOrigin
      dragElastic={0.4}
      whileDrag={{ scale: 1.08, zIndex: 20 }}
      onDragEnd={(_, info) => {
        const r = barRef.current?.getBoundingClientRect();
        const y = info.point.y - window.scrollY;
        if (r && y >= r.top - 10 && y <= r.bottom + 10) onPick();
      }}
      className="grip relative flex flex-col items-center"
    >
      {!chosen ? (
        <motion.span layoutId={`planplate-${p.id}`} transition={PLATE_SPRING} className="inline-flex">
          <Plate state={p.plate} size={46} label={String(n)} />
        </motion.span>
      ) : (
        // the plate went to the bar: its peg stays, ringed in brass, so it reads "on the bar", not "unavailable"
        <span className="relative inline-grid size-[46px] place-items-center rounded-full" style={{ border: "2px dashed var(--brass-hi)", background: "radial-gradient(circle, var(--steel-lo) 0 5px, var(--iron-rim) 6px 8px, transparent 9px)" }}>
          <span className="t-stencil absolute -top-1 right-0 text-[13px]" style={{ color: "var(--brass-hi)" }}>
            {n}
          </span>
        </span>
      )}
      <span className="t-teko text-[12px] leading-none" style={{ color: "var(--chalk-dust)" }}>
        {(lang === "hi" ? p.nameHi : p.nameEn).slice(0, 9)}
      </span>
      <span className="t-mono text-[10.5px] leading-none" style={{ color: "var(--brass-hi)" }}>
        {rupees(p.price)}
      </span>
    </motion.button>
  );
}
