"use client";
// Signature 3: the Dues Rack. Members who owe or are ending hang as bumper
// plates on pegs; load the bar, rack it, then walk through one WhatsApp tap each.
// v1 cannot know if a message was sent, so a tick says "opened", never "delivered".
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Barbell, InkTick, Plate, PLATE, PLATE_SPRING, PlateSide, Stamp } from "@/components/art";
import { IdCard } from "@/components/art/IdCard";
import { MarginNotes, TopBar } from "@/components/shell/TopBar";
import { useDerived, useGym, useGymState, useSnap } from "@/components/shell/Gym";
import { message } from "@/components/shell/links";
import { fmtDay, istClock, istParts, todayIST, addDays } from "@/lib/core/dates";
import { rupees, uid, waLink } from "@/lib/core/money";
import type { MemberState } from "@/lib/core/state";
import { STAGE_LABEL } from "@/lib/core/templates";
import type { Lang, PlateKey, Stage } from "@/lib/core/types";

type Peg = PlateKey;
const PEGS: { k: Peg; label: string }[] = [
  { k: "p25", label: "Lapsed 15+ days" },
  { k: "p20", label: "Due 1-14 days" },
  { k: "p15", label: "Ends in 0-3 days" },
  { k: "p10", label: "Ends in 4-7 days" },
  { k: "p5", label: "Ends in 8-14 days" },
  { k: "iron", label: "Running, but owes" },
];

function stageFor(st: MemberState): Stage {
  const d = st.daysLeft ?? 0;
  if (st.dues > 0 && (d > 7 || d < -14)) return "dues";
  if (d < 0) return "post3";
  if (d === 0) return "day0";
  if (d <= 3) return "pre3";
  return "pre7";
}

const amountOf = (st: MemberState) => (st.dues > 0 ? st.dues : st.plan?.price ?? 0);
const sizeOf = (paise: number) => {
  const r = paise / 100;
  const t = Math.max(0, Math.min(1, (Math.log(Math.max(300, r)) - Math.log(300)) / (Math.log(12000) - Math.log(300))));
  return Math.round(28 + t * 28);
};

export function Rack() {
  const { store, t, lang, mode, today } = useGym();
  const snap = useSnap();
  const d = useDerived();
  const actor = useGymState((s) => s.actor);
  const router = useRouter();
  const sp = useSearchParams();
  const [loaded, setLoaded] = useState<string[]>([]);
  const [focus, setFocus] = useState(0);
  const [tplLang, setTplLang] = useState<Lang>(lang);
  const [tplStage, setTplStage] = useState<Stage | "auto">("auto");
  const [walk, setWalk] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const f = { state: sp.get("state"), plan: sp.get("plan"), trainer: sp.get("trainer"), rem: sp.get("rem"), view: sp.get("view") };
  const setParam = (k: string, v: string | null) => {
    const u = new URLSearchParams(sp.toString());
    if (v == null || u.get(k) === v) u.delete(k);
    else u.set(k, v);
    router.replace(`?${u.toString()}`, { scroll: false });
  };

  const lastOpened = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of snap?.reminders ?? []) if (r.openedAt && (!m.get(r.memberId) || r.openedAt > m.get(r.memberId)!)) m.set(r.memberId, r.openedAt);
    return m;
  }, [snap]);

  const hanging = useMemo(() => {
    if (!d) return [] as MemberState[];
    return d.list.filter((x) => {
      if (x.m.remindersOptOut || !x.term) return false;
      if (x.frozenNow) return false;
      const onPeg = x.plate !== "iron" || x.dues > 0;
      if (!onPeg) return false;
      if (x.daysLeft != null && x.daysLeft < -60 && x.dues === 0) return false;
      if (f.state && x.plate !== f.state) return false;
      if (f.plan && x.plan?.id !== f.plan) return false;
      if (f.trainer && x.m.trainerId !== f.trainer) return false;
      const lo = lastOpened.get(x.m.id);
      if (f.rem === "never" && lo) return false;
      if (f.rem === "old" && lo && todayIST(Date.parse(lo)) > addDays(today, -3)) return false;
      return true;
    });
  }, [d, f.state, f.plan, f.trainer, f.rem, lastOpened, today]);

  const byPeg = useMemo(() => {
    const m = new Map<Peg, MemberState[]>();
    for (const p of PEGS) m.set(p.k, []);
    for (const x of hanging) m.get(x.plate)!.push(x);
    return m;
  }, [hanging]);
  const flat = useMemo(() => PEGS.flatMap((p) => byPeg.get(p.k)!), [byPeg]);
  const cur = flat[Math.min(focus, flat.length - 1)];
  const loadedSet = new Set(loaded);
  const total = loaded.reduce((a, id) => a + amountOf(d?.byId.get(id) ?? ({ dues: 0 } as MemberState)), 0);
  const bend = Math.min(6, 0.8 * Math.log2(1 + total / 100 / 1000));

  // "Remind all" on the owner slate arrives with the bar already loaded
  const preload = sp.get("load");
  useEffect(() => {
    if (preload === "today" && d) setLoaded(d.list.filter((x) => x.endDate === today && !x.m.remindersOptOut).map((x) => x.m.id));
  }, [preload, d?.today]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => setLoaded((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const loadPeg = (k: Peg) => setLoaded((l) => [...new Set([...l, ...byPeg.get(k)!.map((x) => x.m.id)])]);

  useEffect(() => {
    if (walk) return;
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "j" || e.key === "ArrowDown") setFocus((i) => Math.min(flat.length - 1, i + 1));
      else if (e.key === "k" || e.key === "ArrowUp") setFocus((i) => Math.max(0, i - 1));
      else if (e.key === " " && cur) {
        if (e.shiftKey) loadPeg(cur.plate);
        else toggle(cur.m.id);
      } else if (/^[1-5]$/.test(e.key)) setParam("state", PEGS[Number(e.key) - 1].k);
      else if (e.key === "l" || e.key === "L") setParam("view", "table");
      else if (e.key === "Enter" && loaded.length) setWalk(true);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  if (!snap || !d) return <Shell />;
  const preview = cur ?? (loaded[0] ? d.byId.get(loaded[0]) : undefined);
  const staffName = snap.staff.find((s) => s.id === actor.staffId)?.name ?? "Desk";
  const plans = snap.plans.filter((p) => p.kind === "time");
  const trainers = snap.staff.filter((s) => s.role === "trainer");

  return (
    <div className="floor flex min-h-dvh flex-col">
      <TopBar />
      <div className="knurl-strip" />
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-5" role="toolbar" aria-label="Filters (also in the URL)">
        <Chip on={!f.state} onClick={() => setParam("state", null)}>
          All pegs
        </Chip>
        {PEGS.slice(0, 5).map((p, i) => (
          <Chip key={p.k} on={f.state === p.k} onClick={() => setParam("state", p.k)}>
            <span className="kbd !min-w-4 !h-4">{i + 1}</span> {PLATE[p.k].en}
          </Chip>
        ))}
        <select aria-label="Plan" className="t-teko h-9 bg-[var(--iron)] px-2 text-[15px] text-[var(--chalk)]" value={f.plan ?? ""} onChange={(e) => setParam("plan", e.target.value || null)}>
          <option value="">Any plan</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nameEn}
            </option>
          ))}
        </select>
        {trainers.length > 0 && (
          <select aria-label="Trainer" className="t-teko h-9 bg-[var(--iron)] px-2 text-[15px] text-[var(--chalk)]" value={f.trainer ?? ""} onChange={(e) => setParam("trainer", e.target.value || null)}>
            <option value="">Any trainer</option>
            {trainers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <Chip on={f.rem === "never"} onClick={() => setParam("rem", "never")}>
          Never reminded
        </Chip>
        <Chip on={f.rem === "old"} onClick={() => setParam("rem", "old")}>
          Reminded 3+ days ago
        </Chip>
        <Chip on={f.view === "table"} onClick={() => setParam("view", "table")}>
          <span className="kbd !h-4">L</span> Table
        </Chip>
      </div>

      <div className="grid flex-1 gap-4 px-3 pb-44 sm:px-5 lg:grid-cols-[300px_1fr]">
        {/* the collar: language, template, live preview */}
        <aside className="iron order-2 flex flex-col gap-3 p-4 lg:order-1" aria-label="Message">
          <div className="flex gap-1" role="radiogroup" aria-label="Language">
            {(["en", "hi"] as Lang[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={tplLang === l} className="btn-iron flex-1" aria-pressed={tplLang === l} onClick={() => setTplLang(l)}>
                {l === "en" ? "English" : "Hinglish"}
              </button>
            ))}
          </div>
          <label className="t-teko text-[15px] muted">
            Template
            <select className="mt-1 block h-9 w-full bg-[var(--rubber)] px-2 text-[15px] text-[var(--chalk)]" value={tplStage} onChange={(e) => setTplStage(e.target.value as Stage | "auto")}>
              <option value="auto">Match each member (7 days, 3 days, today, after, dues)</option>
              {(["pre7", "pre3", "day0", "post3", "dues"] as Stage[]).map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          {preview ? (
            <>
              <div className="t-teko text-[14px] muted">
                Preview for {preview.m.name} · {STAGE_LABEL[tplStage === "auto" ? stageFor(preview) : tplStage]}
              </div>
              <Bubble text={message(snap, mode, preview, tplStage === "auto" ? stageFor(preview) : tplStage, tplLang, staffName)} />
            </>
          ) : (
            <p className="t-hand text-[16px]" style={{ color: "var(--chalk-dust)" }}>
              Focus a plate with J and K to preview its message.
            </p>
          )}
          <p className="t-hand text-[14px]" style={{ color: "var(--chalk-dust)" }}>
            Each message opens WhatsApp with the text typed. You still press Send, one tap each.
          </p>
        </aside>

        {/* the plate tree */}
        <section className="order-1 lg:order-2" aria-label="Plate tree">
          {f.view === "table" ? (
            <RackTable list={flat} loaded={loadedSet} toggle={toggle} focus={focus} lastOpened={lastOpened} />
          ) : (
            <div className="relative pl-6">
              <div className="absolute bottom-2 left-2 top-2 w-3" style={{ background: "linear-gradient(to right, var(--steel-lo), var(--steel-hi), var(--steel-lo))", borderRadius: 2 }} aria-hidden />
              {PEGS.map((p) => {
                const items = byPeg.get(p.k)!;
                if (!items.length && f.state) return null;
                const stacked = items.length > 24;
                return (
                  <div key={p.k} className="relative mb-4 min-h-[70px]">
                    <div className="absolute left-[-14px] right-0 top-[30px] h-[7px] knurl" style={{ borderRadius: 3 }} aria-hidden />
                    <div className="relative flex items-baseline gap-3 pl-2">
                      <span className="t-teko text-[17px]" style={{ color: "var(--chalk)" }}>
                        {lang === "hi" ? PLATE[p.k].hi : PLATE[p.k].en}
                      </span>
                      <span className="t-teko text-[14px] muted">{p.label}</span>
                      <span className="t-mono text-[13px]" style={{ color: "var(--brass-hi)" }}>
                        {items.length}
                      </span>
                      {items.length > 0 && (
                        <button type="button" className="t-teko text-[14px] underline" style={{ color: "var(--brass-hi)" }} onClick={() => loadPeg(p.k)} title="Shift+Space">
                          Load whole peg
                        </button>
                      )}
                    </div>
                    <div className="relative mt-1 flex flex-wrap items-start gap-1 pl-2">
                      {stacked ? (
                        <motion.button type="button" drag dragSnapToOrigin onDragEnd={(_, i) => overBar(barRef, i.point.y) && loadPeg(p.k)} className="grip relative" onClick={() => loadPeg(p.k)} aria-label={`Stack of ${items.length}, load all`}>
                          {[0, 1, 2].map((k) => (
                            <span key={k} className="absolute" style={{ left: k * 6, top: k * -3 }}>
                              <Plate state={p.k} size={56} label="" />
                            </span>
                          ))}
                          <span className="relative block h-[56px] w-[72px]" />
                          <span className="t-stencil absolute -right-6 top-3 text-[26px]" style={{ color: "var(--chalk)" }}>
                            ×{items.length}
                          </span>
                        </motion.button>
                      ) : (
                        items.map((x) => {
                          const i = flat.indexOf(x);
                          const isOn = loadedSet.has(x.m.id);
                          return (
                            <motion.button
                              key={x.m.id}
                              type="button"
                              drag
                              dragSnapToOrigin
                              onDragEnd={(_, info) => overBar(barRef, info.point.y) && !isOn && toggle(x.m.id)}
                              onClick={() => {
                                setFocus(i);
                                toggle(x.m.id);
                              }}
                              className="grip relative flex flex-col items-center"
                              style={{ outline: i === focus ? "2px solid var(--focus)" : undefined, outlineOffset: 2, opacity: isOn ? 0.28 : 1 }}
                              aria-pressed={isOn}
                              aria-label={`${x.m.name}, ${rupees(amountOf(x))}, ${isOn ? "on the bar" : "on the peg"}`}
                              layout
                              transition={PLATE_SPRING}
                            >
                              <Plate state={x.plate} size={sizeOf(amountOf(x))} label="" />
                              <span className="t-teko max-w-[64px] truncate text-[12px]" style={{ color: "var(--chalk-dust)" }}>
                                {x.m.name.split(" ")[0]}
                              </span>
                            </motion.button>
                          );
                        })
                      )}
                      {!items.length && <span className="t-hand pl-1 pt-3 text-[15px]" style={{ color: "var(--chalk-dust)" }}>empty peg</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* the loaded bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-[var(--iron-rim)] bg-[var(--rubber-raised)] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 sm:px-6" ref={barRef}>
        <Barbell
          height={84}
          bend={bend}
          label={`${loaded.length} plates loaded, ${rupees(total)}`}
          left={
            <>
              {loaded.filter((_, k) => k % 2 === 0).slice(0, 12).map((id) => {
                const x = d.byId.get(id);
                return x ? (
                  <motion.span key={id} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={PLATE_SPRING}>
                    <PlateSide state={x.plate} h={Math.round(sizeOf(amountOf(x)) * 1.2)} w={8} />
                  </motion.span>
                ) : null;
              })}
            </>
          }
          right={<>{loaded.filter((_, k) => k % 2 === 1).slice(0, 12).map((id) => { const x = d.byId.get(id); return x ? <PlateSide key={id} state={x.plate} h={Math.round(sizeOf(amountOf(x)) * 1.2)} w={8} /> : null; })}</>}
        >
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-center">
            <div className="t-mono tnum text-[14px]" style={{ color: "var(--brass-hi)" }}>
              {loaded.length} plates · {rupees(total)}
            </div>
          </div>
        </Barbell>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" className="btn-brass" disabled={!loaded.length} onClick={() => setWalk(true)}>
            Rack it (Enter)
          </button>
          <button type="button" className="btn-iron" disabled={!loaded.length} onClick={() => setLoaded([])}>
            Unload
          </button>
          <span className="t-teko text-[14px] muted">J K move · Space load · Shift+Space whole peg · drag plates onto the bar</span>
        </div>
      </div>

      {walk && (
        <SendWalk
          ids={loaded}
          lang={tplLang}
          stage={tplStage}
          onDone={(left) => {
            setWalk(false);
            setLoaded(left);
          }}
        />
      )}
      <MarginNotes />
      {mode === "demo" && <span className="sr-only">{t.demoTag}</span>}
    </div>
  );
}

function overBar(ref: React.RefObject<HTMLDivElement | null>, y: number) {
  const r = ref.current?.getBoundingClientRect();
  return !!r && y - window.scrollY >= r.top - 20;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="t-teko inline-flex h-9 items-center gap-1 pr-3 text-[15px]" style={{ background: on ? "var(--brass)" : "var(--iron)", color: on ? "var(--brass-ink)" : "var(--chalk)", border: "1px solid var(--iron-rim)" }}>
      <span className="knurl block h-full w-2" aria-hidden />
      {children}
    </button>
  );
}

export function Bubble({ text }: { text: string }) {
  return (
    <div className="relative px-3 py-2 text-[14px] leading-snug" style={{ background: "var(--ledger)", color: "var(--text-on-paper)", border: "2px solid var(--chalk)", borderRadius: "14px 14px 14px 3px", boxShadow: "3px 3px 0 rgba(0,0,0,.35)" }}>
      {text}
      <div className="t-mono mt-1 text-right text-[11px]" style={{ color: "var(--muted-on-paper)" }}>
        {text.length} chars
      </div>
    </div>
  );
}

function RackTable({ list, loaded, toggle, focus, lastOpened }: { list: MemberState[]; loaded: Set<string>; toggle: (id: string) => void; focus: number; lastOpened: Map<string, string> }) {
  return (
    <div className="ledger overflow-x-auto pb-2">
      <div className="t-teko grid h-8 min-w-[620px] items-center gap-2 pl-[72px] pr-3 text-[14px]" style={{ gridTemplateColumns: "36px 1fr 100px 70px 90px 110px", color: "var(--carbon)" }}>
        <span>Bar</span>
        <span>Member</span>
        <span>Plan</span>
        <span>Ends</span>
        <span className="text-right">Amount</span>
        <span>Last reminded</span>
      </div>
      {list.map((x, i) => (
        <label key={x.m.id} className="grid h-8 min-w-[620px] cursor-pointer items-center gap-2 pl-[72px] pr-3 text-[13px]" style={{ gridTemplateColumns: "36px 1fr 100px 70px 90px 110px", outline: i === focus ? "1.5px solid var(--ink)" : undefined, outlineOffset: -2 }}>
          <input type="checkbox" checked={loaded.has(x.m.id)} onChange={() => toggle(x.m.id)} className="size-4" />
          <span className="flex items-center gap-2 truncate" style={{ color: "var(--ink)" }}>
            <Plate state={x.plate} size={18} label="" /> {x.m.name}
          </span>
          <span className="t-teko text-[14px]">{x.plan?.nameEn}</span>
          <span className="t-mono text-[12px]">{fmtDay(x.endDate)}</span>
          <span className="t-mono text-right text-[12px]">{rupees(amountOf(x))}</span>
          <span className="t-mono text-[12px]" style={{ color: "var(--muted-on-paper)" }}>
            {lastOpened.get(x.m.id) ? fmtDay(todayIST(Date.parse(lastOpened.get(x.m.id)!))) : "never"}
          </span>
        </label>
      ))}
    </div>
  );
}

function Shell() {
  return (
    <div className="floor min-h-dvh">
      <div className="h-14 iron" style={{ clipPath: "none" }} />
      <div className="p-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton mb-6 h-14 w-full" style={{ background: "linear-gradient(to right, var(--iron), transparent)" }} />
        ))}
      </div>
    </div>
  );
}

/** One plate at a time, the exact message, one big button. Re-checks state before each plate. */
function SendWalk({ ids, lang, stage, onDone }: { ids: string[]; lang: Lang; stage: Stage | "auto"; onDone: (left: string[]) => void }) {
  const { store, mode } = useGym();
  const snap = useSnap()!;
  const d = useDerived()!;
  const actor = useGymState((s) => s.actor);
  const [i, setI] = useState(0);
  const [ticks, setTicks] = useState<Record<string, { at: number; rid: string }>>({});
  const [fell, setFell] = useState<string | null>(null);
  const [skipAsk, setSkipAsk] = useState(false);
  const [quietOk, setQuietOk] = useState(false);
  const [demoLink, setDemoLink] = useState("");
  const startState = useRef(new Map(ids.map((id) => [id, { dues: d.byId.get(id)?.dues ?? 0, end: d.byId.get(id)?.endDate }]))).current;
  const staffName = snap.staff.find((s) => s.id === actor.staffId)?.name ?? "Desk";
  const id = ids[i];
  const st = id ? d.byId.get(id) : undefined;
  const h = istParts().h;
  const quiet = h < 8 || h >= 21;

  useEffect(() => {
    if (mode === "live") void store.refresh();
  }, [mode, store]);

  // check before sending: anyone who paid or froze since the batch was built falls off the bar
  useEffect(() => {
    if (!st || !id) return;
    const was = startState.get(id);
    const paidSince = was && ((was.dues > 0 && st.dues < was.dues) || (st.endDate ?? "") > (was.end ?? ""));
    if (paidSince || st.frozenNow) {
      const last = snap.payments.filter((p) => p.memberId === id && p.state === "confirmed").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
      setFell(st.frozenNow ? `${st.m.name} is frozen, skipped` : `Paid ${last ? rupees(last.amount) : ""} at ${last ? istClock(last.createdAt) : "just now"}, skipped`);
      const t = setTimeout(() => {
        setFell(null);
        setI((x) => x + 1);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [id, st, snap.payments, startState]);

  const stg = st ? (stage === "auto" ? stageFor(st) : stage) : "dues";
  const text = st ? message(snap, mode, st, stg, lang, staffName) : "";

  const open = () => {
    if (!st) return;
    if (quiet && !quietOk) return setQuietOk(true);
    // make sure a reminder row exists, then mark it opened
    let rid = snap.reminders.find((x) => x.memberId === st.m.id && x.state === "queued")?.id;
    if (!rid) {
      rid = uid();
      store.run("reminder.add", { reminders: [{ id: rid, memberId: st.m.id, membershipId: st.term?.id ?? null, stage: "manual", dueDate: todayIST() }] });
    }
    store.run("reminder.mark", { id: rid, state: "opened" });
    const tickId = rid;
    setTicks((tk) => ({ ...tk, [st.m.id]: { at: Date.now(), rid: tickId } }));
    if (mode === "live") window.open(waLink(st.m.phone, text), "_blank", "noopener");
    else setDemoLink(waLink(st.m.phone, text));
    setQuietOk(false);
    setTimeout(() => setI((x) => (ids[x] === st.m.id ? x + 1 : x)), 600);
  };

  const skip = (reason: string, optOut = false) => {
    if (!st) return;
    if (optOut) store.run("member.update", { id: st.m.id, fields: { remindersOptOut: true } });
    const r = snap.reminders.find((x) => x.memberId === st.m.id && x.state === "queued");
    if (r) store.run("reminder.mark", { id: r.id, state: "skipped_manual", reason });
    store.note(`${st.m.name}: ${optOut ? "stopped all reminders" : `skipped, ${reason}`}`, "ink");
    setSkipAsk(false);
    setI((x) => x + 1);
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea")) return;
      if (e.key === "Enter") open();
      else if (e.key === "ArrowRight") setI((x) => x + 1);
      else if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
      else if (e.key === "s" || e.key === "S") setSkipAsk(true);
      else if (e.key === "o" || e.key === "O") skip("asked to stop", true);
      else if (e.key === "Escape") onDone(ids.slice(i));
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        const last = Object.entries(ticks).sort((a, b) => b[1].at - a[1].at)[0];
        if (last && Date.now() - last[1].at < 10000) {
          store.run("reminder.mark", { id: last[1].rid, state: "queued" });
          setTicks((tk) => Object.fromEntries(Object.entries(tk).filter(([k]) => k !== last[0])));
          store.note("Tick cleared.", "ink");
        }
      } else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  });

  const done = i >= ids.length;
  return (
    <motion.div className="fixed inset-0 z-[60] flex flex-col bg-black/70 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="dialog" aria-modal="true" aria-label="Send walk">
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center gap-3">
        <div className="flex items-center justify-between">
          <span className="t-teko text-[18px]" style={{ color: "var(--chalk)" }}>
            {Math.min(i + 1, ids.length)} of {ids.length}
          </span>
          <span className="t-teko text-[15px] muted">Enter open · → next · S skip · O stop reminders · Esc pause</span>
        </div>
        <div className="relative min-h-[360px]">
          <AnimatePresence mode="popLayout">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="iron p-6 text-center">
                <div className="t-stencil text-[40px]" style={{ color: "var(--brass)" }}>
                  Bar racked
                </div>
                <p className="t-hand mt-2 text-[18px]">{Object.keys(ticks).length} opened in WhatsApp. Whether each was sent is up to the person who pressed Send.</p>
                <button type="button" autoFocus className="btn-brass mt-4" onClick={() => onDone([])}>
                  Back to the rack
                </button>
              </motion.div>
            ) : st ? (
              <motion.div key={st.m.id} initial={{ x: 120, opacity: 0, rotate: 3 }} animate={fell ? { y: 400, rotate: 12, opacity: 0 } : { x: 0, opacity: 1, rotate: 0 }} exit={{ x: -120, opacity: 0 }} transition={fell ? { duration: 0.4, ease: "easeIn" } : PLATE_SPRING} className="flex flex-col gap-3">
                <div className="mx-auto w-full max-w-[420px]">
                  <IdCard st={st} gym={snap.org.name} band={snap.branch.color} layout={false} stamp={ticks[st.m.id] ? <Stamp kind="paid" word="OPENED" sub={istClock(ticks[st.m.id].at)} seed={st.m.id + "o"} size={0.6} /> : undefined} />
                </div>
                <Bubble text={text} />
                {fell && <p className="t-hand text-[18px]" style={{ color: "var(--hazard)" }}>{fell}</p>}
                {quiet && quietOk && <p className="t-hand text-[17px]" style={{ color: "var(--hazard)" }}>It is {istClock(Date.now())}, outside 8 am to 9 pm. Press Enter again if you still want to open it.</p>}
                {ticks[st.m.id] && (
                  <p className="t-hand flex items-center gap-2 text-[16px]" style={{ color: "var(--chalk)" }}>
                    <InkTick color="var(--chalk)" /> opened {istClock(ticks[st.m.id].at)} by {staffName}
                  </p>
                )}
                {demoLink && mode === "demo" && <p className="t-mono break-all text-[11px] muted">Demo: would open {demoLink.slice(0, 90)}…</p>}
                <button type="button" className="btn-brass !min-h-14 !text-[24px]" onClick={open}>
                  Open WhatsApp (Enter)
                </button>
                {skipAsk && (
                  <div className="flex flex-wrap gap-2">
                    {["asked to wait", "wrong number", "already spoke in person"].map((r) => (
                      <button key={r} type="button" className="btn-iron" onClick={() => skip(r)}>
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
