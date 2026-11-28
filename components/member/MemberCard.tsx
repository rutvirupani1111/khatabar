"use client";
// The member's own card on their phone: no login, no app. It is readable the moment it opens:
// how long the membership runs, the check-in QR, and the three things a member does here (pay on
// UPI, ask for a freeze, see receipts). A UPI payment the member marks stays "waiting" until the
// desk sees the money; the card never says paid on the member's word alone.
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Qr } from "@/components/art/Qr";
import { useDerived, useGym, useGymState, useSnap } from "@/components/shell/Gym";
import { Icon, KbMark } from "@/components/ui/Icon";
import { Chip, chipsFor, DaysRing, Initials } from "@/components/ui/Status";
import { lsGet, lsSet, ssGet, ssSet } from "@/lib/client/idb";
import { toggleCalm } from "@/lib/client/fx";
import { addDays, diffDays, fmtDate, istTime, todayIST } from "@/lib/core/dates";
import { DEMO_KEY } from "@/lib/core/demo-seed";
import { rupees, uid, upiLink } from "@/lib/core/money";
import { codeFor, slotNow, SLOT_SECONDS } from "@/lib/core/qr";
import { freezeRules, planLabel, type MemberState } from "@/lib/core/state";
import type { Lang, Snapshot } from "@/lib/core/types";
import { memberText } from "@/lib/i18n/member";

const useT = () => memberText(useGym().lang);

export function MemberCard({ memberNo, token, variant = "page" }: { memberNo?: string; token?: string; variant?: "page" | "embed" }) {
  const { mode } = useGym();
  const d = useDerived();
  const snap = useSnap();
  const status = useGymState((s) => s.status);
  const actor = useGymState((s) => s.actor);
  const st = (actor.memberId && d ? d.byId.get(actor.memberId) : undefined) ?? (memberNo && d ? d.byNo.get(memberNo.toUpperCase()) : undefined);

  useEffect(() => {
    if (token) lsSet("kb_my_card", token);
  }, [token]);

  if (variant === "embed") return st && snap ? <CardBody st={st} snap={snap} embed /> : <Skeleton />;
  if (status === "error") return <VoidCard />;
  return (
    <div className="min-h-dvh bg-[var(--cream)] pb-12">
      <header className="on-dark border-b-2 border-[var(--ink)] bg-[var(--indigo)] text-[var(--cream)]">
        <div className="mx-auto flex h-14 max-w-[480px] items-center gap-2 px-4">
          <KbMark size={26} onDark />
          <span className="t-display truncate text-[18px]" style={{ fontWeight: 700 }}>
            {snap?.org.name ?? "Khatabar"}
          </span>
          {mode === "demo" && <span className="ml-auto rounded-full bg-[var(--marigold)] px-2 py-0.5 text-[12px] font-bold text-[var(--ink)]">Demo</span>}
        </div>
      </header>
      <main className="member-wall mx-auto flex max-w-[480px] flex-col gap-4 px-4 pt-4">{!snap || !st ? <Skeleton /> : <CardBody st={st} snap={snap} token={token} />}</main>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="island-skel" aria-hidden>
      <i style={{ height: 40, width: "40%" }} />
      <i style={{ height: 180 }} />
      <i style={{ height: 200 }} />
    </div>
  );
}

function LangSwitch() {
  const { lang, setLang } = useGym();
  return (
    <div className="flex gap-1 self-end rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] p-1" role="radiogroup" aria-label="Language">
      {(["en", "hi"] as Lang[]).map((l) => (
        <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)} lang={l} className="min-h-9 rounded-lg px-3 text-[15px] font-semibold" style={{ background: lang === l ? "var(--ink)" : "transparent", color: lang === l ? "var(--cream)" : "var(--ink)" }}>
          {l === "en" ? "English" : "हिंदी"}
        </button>
      ))}
    </div>
  );
}

/** The card itself; the home page's door scene shows exactly this, framed in a phone. */
function CardBody({ st, snap, token, embed }: { st: MemberState; snap: Snapshot; token?: string; embed?: boolean }) {
  const { lang, today, calm, mode } = useGym();
  const t = useT();
  const [open, setOpen] = useState<null | "pay" | "freeze" | "receipts">(null);
  const [first, setFirst] = useState(false);
  useEffect(() => {
    if (embed || calm) return;
    const k = `kb_card_seen_${today}`;
    if (lsGet(k) !== "1") {
      setFirst(true);
      lsSet(k, "1");
    }
  }, [embed, calm, today]);
  const d = (s: string | null) => fmtDate(s, today, lang);
  const line =
    st.status === "none"
      ? t.noPlan
      : st.status === "lapsed"
        ? t.ended(d(st.endDate))
        : st.frozenNow
          ? t.frozenTill(d(st.frozenNow.toDate))
          : st.daysLeft === 0
            ? t.endsToday(d(st.endDate))
            : t.validTill(d(st.endDate), st.daysLeft ?? 0);
  const canPay = st.dues > 0 || st.pending === 0 && (st.status === "lapsed" || (st.daysLeft != null && st.daysLeft <= 7));
  const pendingAmt = snap.payments.filter((p) => p.memberId === st.m.id && p.state === "pending").reduce((a, p) => a + p.amount, 0);

  return (
    <div className={`flex flex-col gap-3 ${embed ? "p-4" : ""}`}>
      <LangSwitch />
      {/* the card hangs on a lanyard: the gym's own shopfront on top, the member in the middle,
          the check-in QR printed on its lower half */}
      <div className="id-card">
        <svg className="lanyard" viewBox="0 0 120 46" aria-hidden>
          <path d="M34 0 L52 30 M86 0 L68 30" stroke="#1B1A2E" strokeWidth="14" strokeLinecap="round" />
          <path d="M34 0 L52 30 M86 0 L68 30" stroke={snap.branch.color} strokeWidth="9" strokeLinecap="round" />
          <rect x="46" y="24" width="28" height="12" rx="4" fill="#9AA6B2" stroke="#1B1A2E" strokeWidth="2.5" />
          <path d="M60 36 V46" stroke="#1B1A2E" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <section className={`card-face ${first ? "card-in" : ""}`} aria-label={t.yourCard}>
          <ShopStrip name={snap.org.name} branch={snap.branch.name} color={snap.branch.color} />
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
              <Initials name={st.m.name} photo={st.m.photo} size={52} />
              <div className="min-w-0 flex-1">
                <h1 className="t-display text-[26px] leading-tight" style={{ fontWeight: 700 }}>
                  {st.m.name}
                </h1>
                <p className="text-[14px] text-[var(--muted-ink)]">
                  <span className="t-mono">{st.m.memberNo}</span> · {planLabel(st, lang)}
                </p>
              </div>
              <DaysRing left={st.daysLeft} total={st.totalDays} size={70} frozen={!!st.frozenNow} lang={lang} />
            </div>
            <p className="text-[18px] font-bold leading-snug" aria-live="polite">
              {line}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {chipsFor(st, lang).map((c) => (
                <Chip key={c.text} {...c} />
              ))}
            </div>
            {pendingAmt > 0 && (
              <p className="rounded-xl border-2 border-dashed border-[var(--ink)] bg-[var(--marigold)] p-2 text-[14px] font-semibold">
                {t.waitingGym(rupees(pendingAmt))}. {t.waitNote}
              </p>
            )}
          </div>
          <div className="perf" aria-hidden />
          <Pass st={st} snap={snap} token={token} embed={embed} />
        </section>
      </div>

      <div className="grid gap-2">
        {canPay && (
          <button type="button" className="btn btn-primary btn-lg" aria-expanded={open === "pay"} onClick={() => setOpen(open === "pay" ? null : "pay")}>
            <Icon name="rupee" size={20} /> {t.payUpi(rupees(st.dues > 0 ? st.dues : (st.endPlan ?? st.plan)?.price ?? 0))}
          </button>
        )}
        {open === "pay" && <PayFlow st={st} snap={snap} onDone={() => setOpen(null)} />}
        {st.term && st.status !== "lapsed" && (
          <button type="button" className="btn btn-lg" aria-expanded={open === "freeze"} onClick={() => setOpen(open === "freeze" ? null : "freeze")}>
            <Icon name="snow" size={20} /> {t.freezeMine}
          </button>
        )}
        {open === "freeze" && <FreezeAsk st={st} snap={snap} />}
        <button type="button" className="btn btn-lg" aria-expanded={open === "receipts"} onClick={() => setOpen(open === "receipts" ? null : "receipts")}>
          <Icon name="list" size={20} /> {t.myReceipts}
        </button>
        {open === "receipts" && <Receipts st={st} snap={snap} />}
      </div>

      {!embed && (
        <>
          <SelfCheckin st={st} snap={snap} />
          <HomeHint />
          <Settings st={st} />
          {mode === "demo" && (
            <div className="flex flex-col items-center gap-1 text-center text-[14px] text-[var(--muted-ink)]">
              <p>{t.demoHint}</p>
              <Link className="inline-flex min-h-11 items-center font-semibold text-[var(--ink)] underline underline-offset-4" href="/demo/desk" target="_blank">
                {t.openDesk}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** The top of the card: the gym's own little shopfront, its signboard and a half-raised shutter. */
function ShopStrip({ name, branch, color }: { name: string; branch: string; color: string }) {
  const long = name.length > 18;
  return (
    <svg viewBox="0 0 400 92" className="block h-auto w-full" role="img" aria-label={`${name}, ${branch}`}>
      <rect width="400" height="92" fill="#B5452E" />
      <path d="M0 14h400M0 30h400M0 46h400M0 62h400M0 78h400M30 0v14M90 14v16M150 0v14M210 14v16M270 0v14M330 14v16M390 0v14M60 30v16M120 46v16M240 30v16M300 46v16M360 30v16M20 62v16M180 62v16M340 62v16" stroke="#8E3423" strokeWidth="2" />
      <rect x="40" y="10" width="320" height="44" rx="7" fill="#FFC21A" stroke="#1B1A2E" strokeWidth="3" />
      {[64, 104, 144, 184, 224, 264, 304, 336].map((x) => (
        <circle key={x} cx={x} cy="10" r="3.5" fill="#FFF1C9" stroke="#1B1A2E" strokeWidth="1.5" />
      ))}
      <text x="200" y="40" textAnchor="middle" fontSize="22" fill="#1B1A2E" style={{ fontFamily: "var(--font-sign)" }} textLength={long ? 280 : undefined} lengthAdjust={long ? "spacingAndGlyphs" : undefined}>
        {name.toUpperCase()}
      </text>
      <rect x="70" y="60" width="260" height="32" fill="#FFE7B8" stroke="#1B1A2E" strokeWidth="2.5" />
      <rect x="70" y="60" width="260" height="16" fill="#13A89E" stroke="#1B1A2E" strokeWidth="2.5" />
      <path d="M70 66h260M70 71h260" stroke="#0D7F77" strokeWidth="1.5" />
      <rect x="60" y="54" width="280" height="8" rx="4" fill={color} stroke="#1B1A2E" strokeWidth="2" />
      <text x="200" y="88" textAnchor="middle" fontSize="11" fill="#1B1A2E" style={{ fontFamily: "var(--font-sans)", fontWeight: 700 }}>
        {branch.toUpperCase()}
      </text>
    </svg>
  );
}

type Verdict = { kind: string; text: string; at: number };

/** The rotating QR: a new code every 30 s, a few kept ahead for poor signal. */
function Pass({ st, snap, token, embed }: { st: MemberState; snap: Snapshot; token?: string; embed?: boolean }) {
  const { mode, lang } = useGym();
  const t = useT();
  const [codes, setCodes] = useState<{ slot: number; code: string }[]>([]);
  const [photo, setPhoto] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [big, setBig] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (mode !== "demo" || embed || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("kb-demo");
    ch.onmessage = (m) => {
      if (m.data?.type === "scan-result" && m.data.memberId === st.m.id) setVerdict({ kind: m.data.kind, text: m.data.text, at: m.data.at });
    };
    return () => ch.close();
  }, [mode, embed, st.m.id]);

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
  const size = big ? 280 : 176;
  const simulate = () => {
    if (!code || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("kb-demo");
    ch.postMessage({ type: "scan", code });
    ch.close();
    setVerdict(null);
    setSent(Date.now());
  };
  const caption = offline
    ? t.photoCheck
    : verdict && sent && verdict.at >= sent
      ? verdict.kind === "ok"
        ? t.verdictOk(istTime(verdict.at, lang))
        : verdict.kind === "already"
          ? t.verdictAlready(verdict.text)
          : t.verdictStop(verdict.text)
      : sent && now - sent < 6000
        ? t.sentAt(istTime(sent, lang))
        : big
          ? t.brightness
          : t.newCode(left);

  return (
    <section className="flex flex-col items-center gap-2 p-4" aria-label={t.qrLabel}>
      <p className="text-center text-[15px] font-semibold">{t.qrLabel}</p>
      <button type="button" onClick={() => setBig(!big)} className="relative grid place-items-center rounded-xl bg-white p-2" style={{ width: size + 16, height: size + 16 }} aria-label={big ? t.smaller : t.bigger}>
        {code ? <Qr text={code} size={size} label="Your check-in code" light="#FFFFFF" dark="#1B1A2E" /> : <div className="skeleton h-full w-full" />}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <rect x="1.5" y="1.5" width="97" height="97" rx="6" fill="none" stroke="#efe3c6" strokeWidth="3" />
          <rect x="1.5" y="1.5" width="97" height="97" rx="6" fill="none" stroke="#FF8A00" strokeWidth="3" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - (left / SLOT_SECONDS) * 100} style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
      </button>
      <p className="min-h-6 text-center text-[14px] text-[var(--muted-ink)]" aria-live="polite">
        {caption}
      </p>
      {mode === "demo" && !embed && (
        <button type="button" className="btn btn-sm" onClick={simulate}>
          {t.simulate}
        </button>
      )}
    </section>
  );
}

/** Run one change as the member themself (the home page's street store acts as the desk). */
function asMember<T>(store: ReturnType<typeof useGym>["store"], memberId: string, fn: () => T): T {
  const was = store.state.actor;
  if (was.role === "member") return fn();
  store.setActor({ staffId: null, role: "member", memberId });
  try {
    return fn();
  } finally {
    store.setActor(was);
  }
}

function PayFlow({ st, snap, onDone }: { st: MemberState; snap: Snapshot; onDone: () => void }) {
  const { store, mode } = useGym();
  const t = useT();
  const plan = st.dues > 0 ? null : st.endPlan ?? st.plan;
  const amount = st.dues > 0 ? st.dues : plan?.price ?? 0;
  const key = `kb_upi_ask_${st.m.id}`;
  const [asked, setAsked] = useState(mode === "demo");
  const [undo, setUndo] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "live") return;
    const back = () => {
      if (document.visibilityState === "visible" && ssGet(key)) setAsked(true);
    };
    back();
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [mode, key]);

  const open = () => {
    ssSet(key, "1");
    window.location.href = upiLink({ vpa: snap.branch.vpa, payee: snap.branch.payeeName || snap.org.name, amount, note: `KB ${st.m.memberNo} ${plan?.nameEn ?? "dues"}` });
  };
  const answer = (yes: boolean) => {
    ssSet(key, "");
    if (!yes) return onDone();
    const id = uid();
    const payments = [{ id, mode: "upi_member", amount, state: "pending", utrLast4: "" }];
    const r = asMember(store, st.m.id, () => (plan ? store.run("renew", { membershipId: uid(), memberId: st.m.id, planId: plan.id, discount: 0, payments }) : store.run("pay", { memberId: st.m.id, payments })));
    if (!r.ok) return store.note(r.error ?? "Not sent");
    setUndo(id);
    setAsked(false);
  };
  if (undo)
    return (
      <div className="panel-flat flex flex-wrap items-center gap-2 p-3" role="status">
        <span className="flex-1 text-[15px] font-semibold">{t.paidSent}</span>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            const r = asMember(store, st.m.id, () => store.run("pay.cancel", { id: undo }));
            store.note(r.ok ? t.undone : r.error ?? "Not undone", r.ok ? "ink" : "red");
            setUndo(null);
            onDone();
          }}
        >
          <Icon name="undo" size={16} /> {t.undo}
        </button>
      </div>
    );
  return (
    <div className="panel-flat flex flex-col gap-3 p-4">
      {plan && <p className="text-[14px] text-[var(--muted-ink)]">{t.payFor(plan.nameEn)}</p>}
      {mode === "live" && !asked && (
        <button type="button" className="btn btn-primary" onClick={open}>
          {t.payUpi(rupees(amount))}
        </button>
      )}
      {mode === "demo" && <p className="rounded-lg bg-[var(--marigold-pale)] p-2 text-[14px] font-semibold">{t.payNoteDemo}</p>}
      {asked && (
        <>
          <p className="text-[17px] font-bold">{t.didItGo(rupees(amount))}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-success" onClick={() => answer(true)}>
              {t.yesPaid}
            </button>
            <button type="button" className="btn" onClick={() => answer(false)}>
              {t.no}
            </button>
          </div>
          <p className="text-[13px] text-[var(--muted-ink)]">{t.waitNote}</p>
        </>
      )}
    </div>
  );
}

function FreezeAsk({ st, snap }: { st: MemberState; snap: Snapshot }) {
  const { store, today, lang } = useGym();
  const t = useT();
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState(0);
  const [from, setFrom] = useState(addDays(today, 1));
  const [msg, setMsg] = useState("");
  const chk = freezeRules(snap, st, days);
  const req = st.freezeRequest;
  if (req) return <p className="panel-flat p-3 text-[15px] font-semibold">{t.waitingApprove(req.days, fmtDate(req.fromDate, today, lang))}</p>;
  return (
    <div className="panel-flat flex flex-col gap-3 p-4">
      {chk.maxCount > 0 && <p className="text-[14px] text-[var(--muted-ink)]">{t.freezesLeft(chk.maxCount - chk.usedCount, chk.maxCount, chk.maxDays)}</p>}
      <div>
        <span className="label">{t.howManyDays}</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {[7, 10, 15, 30].map((n) => (
            <button key={n} type="button" className="chip chip-filter" aria-pressed={days === n} onClick={() => setDays(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <label>
        <span className="label">{t.from}</span>
        <input type="date" className="input mt-1" min={today} value={from} onChange={(e) => setFrom(e.target.value || from)} />
      </label>
      <div>
        <span className="label">{t.reason}</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {t.reasons.map((r, i) => (
            <button key={r} type="button" className="chip chip-filter" aria-pressed={reason === i} onClick={() => setReason(i)}>
              {r}
            </button>
          ))}
        </div>
      </div>
      {!chk.ok && <p className="text-[14px] font-semibold text-[#9b0f3f]">{t.why(chk.why)}</p>}
      <button
        type="button"
        className="btn btn-primary"
        disabled={!chk.ok}
        onClick={() => {
          const r = asMember(store, st.m.id, () => store.run("freeze.set", { id: uid(), memberId: st.m.id, fromDate: from, days, reason: memberText("en").reasons[reason] }));
          setMsg(r.ok ? t.freezeSent : t.why(r.error ?? "Not sent"));
        }}
      >
        {t.sendRequest}
      </button>
      {msg && (
        <p className="text-[14px] font-semibold" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}

function Receipts({ st, snap }: { st: MemberState; snap: Snapshot }) {
  const { mode, lang } = useGym();
  const t = useT();
  const pays = useMemo(() => snap.payments.filter((p) => p.memberId === st.m.id && p.state !== "rejected" && p.mode !== "import" && p.amount > 0).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [snap, st.m.id]);
  if (!pays.length) return <p className="text-[15px] text-[var(--muted-ink)]">{t.noPayments}</p>;
  return (
    <ul className="panel-flat divide-y divide-[var(--line)]">
      {pays.slice(0, 6).map((p) => (
        <li key={p.id}>
          <Link href={mode === "demo" ? `/demo/r/${p.id}${snap.branch.code === "LV" ? "?b=LV" : ""}` : `/r/${p.id}`} className="flex min-h-12 items-center gap-3 px-3 text-[15px]">
            <span className="t-mono w-20 text-[13px]">{fmtDate(todayIST(Date.parse(p.createdAt)), todayIST(), lang)}</span>
            <span className="t-mono flex-1 text-[13px] text-[var(--muted-ink)]">{p.receiptNo || (p.state === "pending" ? t.waiting : "")}</span>
            <span className="t-mono font-semibold">{rupees(p.amount)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SelfCheckin({ st, snap }: { st: MemberState; snap: Snapshot }) {
  const { store, mode, lang } = useGym();
  const t = useT();
  const [msg, setMsg] = useState("");
  const [fromPoster, setFromPoster] = useState(false);
  useEffect(() => setFromPoster(new URLSearchParams(window.location.search).get("checkin") === "1"), []);
  if (!snap.branch.settings.selfCheckin || (!fromPoster && mode !== "demo")) return null;
  if (st.visitsToday) return <p className="text-center text-[15px] font-semibold">{t.inToday(istTime(st.visitsToday, lang))}</p>;
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
      <button type="button" className="btn" onClick={go}>
        <Icon name="door" size={18} /> {t.checkinHere}
      </button>
      {msg && <p className="text-center text-[14px]">{msg}</p>}
    </div>
  );
}

function HomeHint() {
  const t = useT();
  const [show, setShow] = useState(false);
  useEffect(() => setShow(lsGet("kb_a2hs") !== "1"), []);
  if (!show) return null;
  return (
    <p className="flex flex-wrap items-center justify-center gap-2 text-center text-[14px] text-[var(--muted-ink)]">
      {t.a2hs}
      <button type="button" className="btn btn-sm" onClick={() => (lsSet("kb_a2hs", "1"), setShow(false))}>
        {t.hide}
      </button>
    </p>
  );
}

function Settings({ st }: { st: MemberState }) {
  const { store, lang, calm } = useGym();
  const t = useT();
  const [asked, setAsked] = useState("");
  return (
    <section className="panel-flat flex flex-col gap-2 p-4" aria-label={t.settings}>
      <h2 className="text-[17px] font-bold">{t.settings}</h2>
      <button type="button" className="btn btn-sm self-start" aria-pressed={calm} onClick={toggleCalm}>
        {t.lessMotion}
      </button>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" className="size-5" checked={st.m.remindersOptOut} onChange={(e) => store.run("member.update", { id: st.m.id, fields: { remindersOptOut: e.target.checked } })} />
        <span>{t.stopReminders}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" onClick={() => (store.run("task.add", { id: uid(), memberId: st.m.id, kind: "export" }).ok ? setAsked(t.downloadAsked) : null)}>
          {t.download}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => (store.run("task.add", { id: uid(), memberId: st.m.id, kind: "erase" }).ok ? setAsked(t.eraseAsked) : null)}>
          {t.erase}
        </button>
      </div>
      {asked && <p className="text-[14px]">{asked}</p>}
      <p className="text-[13px] text-[var(--muted-ink)]">{t.joined(fmtDate(st.joinedOn, todayIST(), lang), diffDays(todayIST(), st.joinedOn))}</p>
    </section>
  );
}

/** An old or mistyped link: the card is drawn void, with one clear way to get a new one. */
function VoidCard(): ReactNode {
  const ask = "Hi, my Khatabar member card link does not open any more. Please send me a new one.";
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--cream)] px-4 py-10">
      <div className="flex w-full max-w-[400px] flex-col items-center gap-4 text-center">
        <svg viewBox="0 0 200 120" className="w-[200px]" aria-hidden>
          <rect x="10" y="10" width="180" height="100" rx="12" fill="#FFFBF2" stroke="#1B1A2E" strokeWidth="3" />
          <rect x="10" y="10" width="180" height="10" fill="#6B6880" stroke="#1B1A2E" strokeWidth="3" />
          <path d="M50 50 L150 90 M150 50 L50 90" stroke="#D11F5C" strokeWidth="8" strokeLinecap="round" />
        </svg>
        <h1 className="t-display text-[26px]">This card link does not work any more</h1>
        <p className="text-[16px]">The desk can send you a fresh one on WhatsApp in a few seconds.</p>
        <a className="btn btn-primary btn-lg" href={`https://wa.me/?text=${encodeURIComponent(ask)}`} target="_blank" rel="noreferrer">
          Ask the desk for a new link
        </a>
        <Link href="/" className="font-semibold underline">
          What is Khatabar?
        </Link>
      </div>
    </div>
  );
}
