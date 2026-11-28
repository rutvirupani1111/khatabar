"use client";
// Renew in three plain steps: pick a plan, say how they paid, done. The same component runs at
// the desk and inside the home page's counter scene. UPI is never counted as paid until someone
// presses "Yes, money arrived".
import { useEffect, useMemo, useRef, useState } from "react";
import { Qr } from "@/components/art/Qr";
import { useGym } from "@/components/shell/Gym";
import { Icon } from "@/components/ui/Icon";
import { Chip, PaidStamp } from "@/components/ui/Status";
import { fmtDate, fmtDay, planEnd } from "@/lib/core/dates";
import { firstName, rupees, toPaise, uid, upiLink } from "@/lib/core/money";
import { derive, renewalStart, type MemberState } from "@/lib/core/state";
import type { Plan, Snapshot } from "@/lib/core/types";
import { undoPayment } from "@/lib/client/undo";

export interface Landed {
  opId: string;
  paymentIds: string[];
  memberId: string;
  at: number;
  amount: number;
  partDue: number;
  newEnd: string | null;
  planName: string;
  state: "paid" | "part" | "waiting";
  receiptNo: string;
}

type Step = "plan" | "pay" | "upi" | "split" | "done";

export function plansFor(snap: Snapshot) {
  return snap.plans.filter((p) => p.active && p.kind === "time").sort((a, b) => a.sort - b.sort).slice(0, 6);
}

export function RenewFlow({
  st,
  snap,
  duesOnly = false,
  keyboard = false,
  onLanded,
  onCancel,
  onReceipt,
  onEvent,
}: {
  st: MemberState;
  snap: Snapshot;
  /** "Mark paid": skip the plan step and take what they already owe */
  duesOnly?: boolean;
  keyboard?: boolean;
  onLanded?: (l: Landed) => void;
  onCancel: () => void;
  onReceipt: (l: Landed) => void;
  onEvent?: (e: "paid" | "waiting" | "undone" | "rejected") => void;
}) {
  const { store, mode, today, lang, street } = useGym();
  const plans = useMemo(() => plansFor(snap), [snap]);
  const current = st.endPlan ?? st.plan;
  const [step, setStep] = useState<Step>(duesOnly ? "pay" : "plan");
  const [planId, setPlanId] = useState<string | null>(duesOnly ? null : (plans.find((p) => p.id === current?.id) ?? plans[0])?.id ?? null);
  const [more, setMore] = useState(false);
  const [discount, setDiscount] = useState("");
  const [pin, setPin] = useState("");
  const [paying, setPaying] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [pt, setPt] = useState(false);
  const [withDues, setWithDues] = useState(true);
  const [split, setSplit] = useState({ cash: "", upi: "" });
  const [utr, setUtr] = useState("");
  const [err, setErr] = useState("");
  const [landed, setLanded] = useState<Landed | null>(null);
  const [undoneText, setUndoneText] = useState("");
  const head = useRef<HTMLHeadingElement>(null);

  const ptPlan = snap.plans.find((p) => p.active && (p.kind === "sessions" || p.kind === "addon"));
  const plan: Plan | null = plans.find((p) => p.id === planId) ?? null;
  const rs = renewalStart(st, today, snap.branch.settings.backdateWithin7);
  const start = startDate ?? rs.start;
  const endFor = (p: Plan) => planEnd(start, p.months, p.days);
  const end = plan ? endFor(plan) : null;
  const joining = !snap.memberships.some((x) => x.memberId === st.m.id && x.status !== "void") && plan ? plan.joiningFee : 0;
  const disc = toPaise(discount || 0);
  const oldDues = (plan && withDues) || !plan ? st.dues : 0;
  const bill = plan ? plan.price - disc + joining + (pt && ptPlan ? ptPlan.price : 0) : 0;
  const total = bill + oldDues;
  const pay = paying ? Math.min(total, toPaise(paying)) : total;
  const overLimit = plan ? disc > (plan.price * snap.branch.settings.discountLimitPct) / 100 && store.state.actor.role === "desk" : false;
  const first = firstName(st.m.name);
  const ruleText = startDate ? `Starts ${fmtDay(start)}, the date you picked.` : rs.rule === "after" ? `Starts ${fmtDay(start)}, the day after the current plan ends.` : rs.rule === "lapse" ? `Starts ${fmtDay(start)}, the day the old plan ended (within 7 days).` : `Starts today, ${fmtDay(start)}.`;

  // the heading takes focus and the panel comes into view each time the step changes
  useEffect(() => {
    const h = head.current;
    if (!h) return;
    h.focus({ preventScroll: true });
    h.closest("[data-flow]")?.scrollIntoView({ block: "nearest" });
  }, [step]);

  const commit = (payments: { mode: "cash" | "upi_desk" | "card"; amount: number; state: "confirmed" | "pending" }[]) => {
    if (overLimit && pin.length !== 4) {
      setMore(true);
      return setErr(`A discount above ${snap.branch.settings.discountLimitPct}% needs a manager's 4-digit PIN (under More options).`);
    }
    const pays = payments.filter((p) => p.amount > 0).map((p) => ({ id: uid(), ...p, utrLast4: p.mode === "upi_desk" ? utr : "" }));
    if (!plan && !pays.length) return setErr("Nothing to pay");
    const r = plan
      ? store.run("renew", { membershipId: uid(), ptMembershipId: uid(), memberId: st.m.id, planId: plan.id, ptPlanId: pt ? ptPlan?.id : null, discount: disc, approverPin: pin || undefined, payments: pays, startDate: startDate ?? undefined })
      : store.run("pay", { memberId: st.m.id, payments: pays });
    if (!r.ok) return setErr(r.error ?? "Not saved");
    setErr("");
    if (r.note) store.note(r.note, "ink");
    const after = store.state.snap;
    const receiptNo = pays.map((p) => after?.payments.find((x) => x.id === p.id)?.receiptNo).find(Boolean) ?? "";
    const confirmed = pays.filter((p) => p.state === "confirmed").reduce((a, p) => a + p.amount, 0);
    const due = Math.max(0, st.dues + bill - pays.reduce((a, p) => a + p.amount, 0));
    const l: Landed = {
      opId: r.opId,
      paymentIds: pays.map((p) => p.id),
      memberId: st.m.id,
      at: Date.now(),
      amount: pays.reduce((a, p) => a + p.amount, 0),
      partDue: due,
      newEnd: end,
      planName: plan?.nameEn ?? "dues",
      state: confirmed === 0 ? "waiting" : due > 0 ? "part" : "paid",
      receiptNo,
    };
    setLanded(l);
    setStep("done");
    onLanded?.(l);
    onEvent?.(l.state === "waiting" ? "waiting" : "paid");
  };

  const confirmWaiting = () => {
    if (!landed) return;
    const id = landed.paymentIds.find((x) => store.state.snap?.payments.find((p) => p.id === x)?.state === "pending");
    if (!id) return;
    const r = store.run("payment.confirm", { id, utr });
    if (!r.ok) return setErr(r.error ?? "Not saved");
    const receiptNo = store.state.snap?.payments.find((p) => p.id === id)?.receiptNo ?? "";
    setLanded({ ...landed, state: landed.partDue > 0 ? "part" : "paid", receiptNo, at: Date.now() });
    onEvent?.("paid");
  };
  const rejectWaiting = () => {
    if (!landed) return;
    for (const id of landed.paymentIds) store.run("payment.reject", { id });
    const st2 = store.state.snap ? derive(store.state.snap, today).byId.get(st.m.id) : undefined;
    setUndoneText(`Payment cancelled. ${first} still owes ${rupees(st2?.dues ?? total)}.`);
    setLanded(null);
    onEvent?.("rejected");
  };
  const undo = () => {
    if (!landed) return;
    const r = undoPayment(store, landed);
    if (!r.ok) return setErr(r.text);
    setUndoneText(r.text);
    setLanded(null);
    onEvent?.("undone");
  };

  // optional keys at the desk: 1-4 plans, Enter next, Shift+P cash, P UPI, Shift+S split, Esc back
  useEffect(() => {
    if (!keyboard) return;
    const on = (e: KeyboardEvent) => {
      const inField = !!(e.target as HTMLElement).closest("input,textarea,select");
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (step === "upi" || step === "split") setStep("pay");
        else if (step === "pay" && !duesOnly) setStep("plan");
        else onCancel();
        return;
      }
      if (inField || e.ctrlKey || e.metaKey || e.altKey) return;
      if (step === "plan" && /^[1-6]$/.test(e.key)) {
        const p = plans[Number(e.key) - 1];
        if (p) setPlanId(p.id);
      } else if (step === "plan" && e.key === "Enter") setStep("pay");
      else if ((step === "plan" || step === "pay") && e.key === "P" && e.shiftKey) {
        if (!plan && !duesOnly) return;
        commit([{ mode: "cash", amount: pay, state: "confirmed" }]);
      } else if ((step === "plan" || step === "pay") && e.key === "p") setStep("upi");
      else if ((step === "plan" || step === "pay") && e.key === "S" && e.shiftKey) {
        setSplit({ cash: "", upi: String(pay / 100) });
        setStep("split");
      } else if (step === "plan" && (e.key === "t" || e.key === "T") && ptPlan) setPt((v) => !v);
      else if (step === "plan" && (e.key === "d" || e.key === "D")) setMore(true);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  });

  const qrText = upiLink({ vpa: snap.branch.vpa, payee: snap.branch.payeeName || snap.org.name, amount: pay, note: `KB ${st.m.memberNo} ${plan?.nameEn ?? "dues"}` });
  const stepNo = step === "plan" ? 1 : step === "done" ? 3 : 2;
  const steps = duesOnly ? ["How did they pay?", "Done"] : ["Pick a plan", "How did they pay?", "Done"];

  return (
    <section data-flow className="flex flex-col gap-3" aria-label={duesOnly ? "Mark paid" : "Renew"}>
      <ol className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-semibold" aria-label="Steps">
        {steps.map((s, i) => {
          const n = duesOnly ? i + 2 : i + 1;
          const on = n === stepNo;
          return (
            <li key={s} className="flex items-center gap-1.5" aria-current={on ? "step" : undefined} style={{ color: on ? "var(--ink)" : "var(--muted-ink)" }}>
              <span className="grid size-6 place-items-center rounded-full border-2 border-[var(--ink)] text-[12px]" style={{ background: n < stepNo ? "var(--paan)" : on ? "var(--saffron)" : "var(--paper)", color: n < stepNo ? "#fff" : "var(--ink)" }}>
                {n < stepNo ? <Icon name="tick" size={14} stroke={3} /> : i + 1}
              </span>
              {s}
            </li>
          );
        })}
      </ol>

      {step === "plan" && (
        <>
          <h2 ref={head} tabIndex={-1} className="t-display text-[22px] outline-none" style={{ fontWeight: 700 }}>
            Pick a plan for {first}
          </h2>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Plans">
            {plans.map((p, i) => {
              const on = p.id === planId;
              return (
                <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setPlanId(p.id)} className="relative flex min-h-[88px] flex-col items-start justify-between rounded-2xl border-2 border-[var(--ink)] p-3 text-left transition-transform active:translate-y-[2px]" style={{ background: on ? "var(--marigold-pale)" : "var(--paper)", boxShadow: on ? "0 0 0 3px var(--saffron), 0 3px 0 var(--ink)" : "0 3px 0 var(--ink)" }}>
                  <span className="flex w-full items-start justify-between gap-2">
                    <span className="text-[16px] font-bold leading-tight">{lang === "hi" ? p.nameHi || p.nameEn : p.nameEn}</span>
                    {keyboard && <span className="kc">{i + 1}</span>}
                    {on && (
                      <span className="grid size-6 place-items-center rounded-full bg-[var(--ink)] text-[var(--cream)]">
                        <Icon name="tick" size={14} stroke={3} />
                      </span>
                    )}
                  </span>
                  <span className="t-mono text-[18px]">{rupees(p.price)}</span>
                  <span className="text-[13px] text-[var(--muted-ink)]">till {fmtDate(endFor(p), today)}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[14px] text-[var(--muted-ink)]">{ruleText}</p>
          {st.dues > 0 && (
            <label className="flex min-h-11 items-center gap-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] px-3 text-[15px]">
              <input type="checkbox" className="size-5 accent-[var(--saffron)]" checked={withDues} onChange={(e) => setWithDues(e.target.checked)} />
              <span>
                Also take the <b>{rupees(st.dues)}</b> {first} already owes
              </span>
            </label>
          )}
          <details open={more} onToggle={(e) => setMore((e.target as HTMLDetailsElement).open)} className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 font-semibold">
              <Icon name="down" size={18} style={{ transform: more ? "rotate(180deg)" : undefined }} /> More options: discount, start date, PT, part payment
            </summary>
            <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2">
              <label>
                <span className="label">Discount (₹)</span>
                <input inputMode="numeric" className="input mt-1" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ""))} placeholder="0" />
              </label>
              {overLimit && (
                <label>
                  <span className="label">Manager PIN (discount above {snap.branch.settings.discountLimitPct}%)</span>
                  <input type="password" inputMode="numeric" maxLength={4} className="input t-mono mt-1" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                </label>
              )}
              <label>
                <span className="label">Start date</span>
                <input type="date" className="input mt-1" value={start} onChange={(e) => setStartDate(e.target.value || null)} />
              </label>
              {ptPlan && (
                <label className="flex min-h-11 items-center gap-3 self-end">
                  <input type="checkbox" className="size-5" checked={pt} onChange={(e) => setPt(e.target.checked)} />
                  <span>
                    Add {ptPlan.nameEn} ({rupees(ptPlan.price)})
                  </span>
                </label>
              )}
              <label>
                <span className="label">Paying now (₹), leave empty for the full amount</span>
                <input inputMode="numeric" className="input mt-1" value={paying} onChange={(e) => setPaying(e.target.value.replace(/\D/g, ""))} placeholder={String(total / 100)} />
              </label>
            </div>
          </details>
          <Total total={total} pay={pay} joining={joining} disc={disc} oldDues={oldDues} pt={pt && ptPlan ? ptPlan.price : 0} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-lg flex-1" disabled={!plan} onClick={() => setStep("pay")}>
              Next: how did they pay? <Icon name="next" size={18} />
            </button>
            <button type="button" className="btn btn-lg" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      )}

      {step === "pay" && (
        <>
          <h2 ref={head} tabIndex={-1} className="t-display text-[22px] outline-none" style={{ fontWeight: 700 }}>
            How did {first} pay {rupees(pay)}?
          </h2>
          {plan && (
            <p className="text-[14px] text-[var(--muted-ink)]">
              {plan.nameEn}, {fmtDay(start)} to {fmtDate(end, today)}
              {pay < total ? `. Paying ${rupees(pay)} now, ${rupees(total - pay)} stays owed.` : "."}
            </p>
          )}
          <div className="grid grid-cols-3 gap-2">
            <PayButton icon="cash" label="Cash" amount={pay} k={keyboard ? "⇧P" : undefined} onClick={() => commit([{ mode: "cash", amount: pay, state: "confirmed" }])} />
            <PayButton icon="qr" label="UPI" amount={pay} k={keyboard ? "P" : undefined} onClick={() => setStep("upi")} />
            <PayButton icon="card" label="Card" amount={pay} onClick={() => commit([{ mode: "card", amount: pay, state: "confirmed" }])} />
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSplit({ cash: "", upi: String(pay / 100) });
              setStep("split");
            }}
          >
            Part cash, part UPI {keyboard && <span className="kc">⇧S</span>}
          </button>
          <button type="button" className="btn btn-ghost self-start" onClick={() => (duesOnly ? onCancel() : setStep("plan"))}>
            <Icon name="back" size={18} /> Back
          </button>
        </>
      )}

      {step === "upi" && (
        <>
          <h2 ref={head} tabIndex={-1} className="t-display text-[22px] outline-none" style={{ fontWeight: 700 }}>
            Have you seen {rupees(pay)} arrive in your bank or UPI app?
          </h2>
          <div className="flex flex-wrap items-start gap-4">
            <div className="rounded-xl border-2 border-[var(--ink)] bg-white p-2">
              <Qr text={qrText} size={132} label={`UPI QR for ${rupees(pay)}`} watermark={mode === "demo" ? "DEMO, do not pay" : undefined} light="#FFFFFF" dark="#1B1A2E" />
            </div>
            <div className="min-w-[180px] flex-1 text-[14px]">
              <p className="font-semibold">
                {first} scans this with any UPI app. Pay to {snap.branch.vpa}.
              </p>
              <p className="mt-2 rounded-lg bg-[var(--marigold-pale)] p-2">A screenshot is not money. We keep it waiting until you see it in your bank.</p>
              {!street && (
                <label className="mt-2 block">
                  <span className="label">UPI reference, last 4 digits (optional)</span>
                  <input inputMode="numeric" maxLength={4} className="input t-mono mt-1 !w-32" value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                </label>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            <button type="button" className="btn btn-success btn-lg" onClick={() => commit([{ mode: "upi_desk", amount: pay, state: "confirmed" }])}>
              <Icon name="tick" size={20} stroke={3} /> Yes, money arrived
            </button>
            <button type="button" className="btn btn-lg" onClick={() => commit([{ mode: "upi_desk", amount: pay, state: "pending" }])}>
              Not yet
            </button>
          </div>
          <button type="button" className="btn btn-ghost self-start" onClick={() => setStep("pay")}>
            <Icon name="back" size={18} /> Back
          </button>
        </>
      )}

      {step === "split" && (
        <>
          <h2 ref={head} tabIndex={-1} className="t-display text-[22px] outline-none" style={{ fontWeight: 700 }}>
            Split {rupees(pay)} into cash and UPI
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="label">Cash (₹)</span>
              <input
                inputMode="numeric"
                className="input t-mono mt-1"
                value={split.cash}
                onChange={(e) => {
                  const c = e.target.value.replace(/\D/g, "");
                  setSplit({ cash: c, upi: String(Math.max(0, pay / 100 - Number(c || 0))) });
                }}
              />
            </label>
            <label>
              <span className="label">UPI (₹)</span>
              <input inputMode="numeric" className="input t-mono mt-1" value={split.upi} onChange={(e) => setSplit((s) => ({ ...s, upi: e.target.value.replace(/\D/g, "") }))} />
            </label>
          </div>
          <p className="text-[14px]">Cash is counted as paid now. Press &ldquo;Yes, money arrived&rdquo; only after you see the UPI part in your bank.</p>
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            <button
              type="button"
              className="btn btn-success"
              onClick={() => {
                const c = toPaise(split.cash || 0);
                const u = toPaise(split.upi || 0);
                if (c + u !== pay) return setErr(`Cash and UPI must add up to ${rupees(pay)}`);
                commit([
                  { mode: "cash", amount: c, state: "confirmed" },
                  { mode: "upi_desk", amount: u, state: "confirmed" },
                ]);
              }}
            >
              <Icon name="tick" size={18} stroke={3} /> Yes, money arrived
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const c = toPaise(split.cash || 0);
                const u = toPaise(split.upi || 0);
                if (c + u !== pay) return setErr(`Cash and UPI must add up to ${rupees(pay)}`);
                commit([
                  { mode: "cash", amount: c, state: "confirmed" },
                  { mode: "upi_desk", amount: u, state: "pending" },
                ]);
              }}
            >
              UPI not yet
            </button>
          </div>
          <button type="button" className="btn btn-ghost self-start" onClick={() => setStep("pay")}>
            <Icon name="back" size={18} /> Back
          </button>
        </>
      )}

      {step === "done" && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <h2 ref={head} tabIndex={-1} className="sr-only">
            {landed ? (landed.state === "waiting" ? "Waiting for money" : "Paid") : "Undone"}
          </h2>
          {landed && landed.state !== "waiting" && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl" data-tour="done">
              <PaidStamp word={landed.state === "part" ? "PART PAID" : "PAID"} />
              <div className="min-w-[180px] flex-1">
                <p className="text-[17px] font-bold">
                  {landed.newEnd ? `${first} is paid till ${fmtDate(landed.newEnd, today)}.` : `${first} paid ${rupees(landed.amount)}.`}
                </p>
                <p className="text-[14px] text-[var(--muted-ink)]">
                  {landed.receiptNo ? (
                    <>
                      Receipt <span className="t-mono">{landed.receiptNo}</span>.
                    </>
                  ) : null}{" "}
                  {landed.partDue > 0 ? `Part paid: ${first} still owes ${rupees(landed.partDue)}.` : ""}
                </p>
              </div>
            </div>
          )}
          {landed && landed.state === "waiting" && (
            <div className="flex flex-col gap-2">
              <span>
                <Chip kind="wait" text={`Waiting for money ${rupees(landed.amount)}`} />
              </span>
              <p className="text-[15px]">Nothing is counted as paid yet. When the money shows in your bank or UPI app, mark it.</p>
              <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                <button type="button" className="btn btn-success" data-tour="arrived" onClick={confirmWaiting}>
                  <Icon name="tick" size={18} stroke={3} /> Money arrived, mark paid
                </button>
                <button type="button" className="btn" onClick={rejectWaiting}>
                  Not received
                </button>
              </div>
            </div>
          )}
          {!landed && undoneText && <p className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] p-3 text-[15px] font-semibold">{undoneText}</p>}
          <div className="flex flex-wrap gap-2">
            {landed && landed.state !== "waiting" && (
              <button type="button" className="btn btn-primary" onClick={() => onReceipt(landed)}>
                <Icon name="chat" size={18} /> Send receipt on WhatsApp
              </button>
            )}
            {landed && Date.now() - landed.at < 60_000 && (
              <button type="button" className="btn" onClick={undo}>
                <Icon name="undo" size={18} /> Undo
              </button>
            )}
            <button type="button" className="btn" onClick={onCancel}>
              Done
            </button>
          </div>
        </div>
      )}

      {err && (
        <p role="alert" className="rounded-lg bg-[#fde2ea] p-2 text-[15px] font-semibold text-[#9b0f3f]">
          {err}
        </p>
      )}
    </section>
  );
}

function PayButton({ icon, label, amount, onClick, k }: { icon: "cash" | "qr" | "card"; label: string; amount: number; onClick: () => void; k?: string }) {
  return (
    <button type="button" className="btn btn-lg !h-auto min-h-[96px] flex-col !gap-1 !px-2 !py-3" onClick={onClick}>
      <Icon name={icon} size={26} />
      <span className="text-[17px]">
        {label} {k && <span className="kc">{k}</span>}
      </span>
      <span className="t-mono text-[13px] font-medium">{rupees(amount)}</span>
    </button>
  );
}

function Total({ total, pay, joining, disc, oldDues, pt }: { total: number; pay: number; joining: number; disc: number; oldDues: number; pt: number }) {
  const bits = [joining ? `joining fee ${rupees(joining)}` : "", pt ? `PT ${rupees(pt)}` : "", disc ? `discount −${rupees(disc)}` : "", oldDues ? `old dues ${rupees(oldDues)}` : ""].filter(Boolean);
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--ink)] px-4 py-2 text-[var(--cream)]">
      <span className="text-[14px] font-semibold">{pay < total ? "Paying now" : "Total"}</span>
      <span className="t-display text-[26px]">{rupees(pay)}</span>
      {bits.length > 0 && <span className="w-full text-[13px] opacity-85">Includes {bits.join(" · ")}</span>}
    </div>
  );
}
