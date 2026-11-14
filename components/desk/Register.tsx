"use client";
import { animate, AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { InkTick, Plate, PLATE, SPRING } from "@/components/art";
import { fmtDay, istClock, todayIST } from "@/lib/core/dates";
import { fmtPhone, rupees } from "@/lib/core/money";
import type { MemberState } from "@/lib/core/state";
import type { Payment, Snapshot } from "@/lib/core/types";
import { useGym } from "@/components/shell/Gym";

/** Last 4 digits, a name, or a member number. Digits match the phone end first. */
export function search(list: MemberState[], q: string): MemberState[] {
  const s = q.replace(/^\//, "").trim().toLowerCase();
  if (!s) return list;
  const digits = s.replace(/\D/g, "");
  if (/^\d{3,}$/.test(s.replace(/[\s+-]/g, ""))) {
    const d = digits.length > 10 ? digits.slice(-10) : digits;
    const ends = list.filter((x) => x.m.phone.endsWith(d));
    const has = list.filter((x) => !x.m.phone.endsWith(d) && (x.m.phone.includes(d) || x.m.memberNo.replace(/\D/g, "").endsWith(d.padStart(4, "0"))));
    return [...ends, ...has];
  }
  if (/^[a-z]{2}-?\d+$/.test(s)) return list.filter((x) => x.m.memberNo.toLowerCase().replace("-", "") === s.replace("-", "") || x.m.memberNo.toLowerCase().startsWith(s));
  const toks = s.split(/\s+/);
  return list.filter((x) => {
    const n = x.m.name.toLowerCase();
    return toks.every((t) => n.split(/\s+/).some((w) => w.startsWith(t)) || n.includes(t));
  });
}

function Phone({ phone, q }: { phone: string; q: string }) {
  const d = q.replace(/\D/g, "");
  const f = fmtPhone(phone);
  if (d.length < 3 || !phone.endsWith(d.slice(-10))) return <span>{f}</span>;
  const cut = f.length - d.slice(-10).length - (d.length > 5 ? 1 : 0);
  return (
    <span>
      {f.slice(0, cut)}
      <span className="relative">
        {f.slice(cut)}
        <svg className="absolute -bottom-[3px] left-0 h-[5px] w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 40 5" aria-hidden>
          <motion.path d="M1 3 C10 1.5 25 4.5 39 2.5" stroke="var(--margin-red)" strokeWidth="1.6" fill="none" className="fx-filter" style={{ filter: "url(#chalk)" }} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2 }} />
        </svg>
      </span>
    </span>
  );
}

export function Register({ list, q, focus, selected, onPick, onFocus, unsynced, snap, dense, limit }: { list: MemberState[]; q: string; focus: number; selected: string | null; onPick: (id: string) => void; onFocus: (i: number) => void; unsynced: Set<string>; snap: Snapshot; dense?: boolean; limit: number }) {
  const { t, lang } = useGym();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>(`[data-i="${focus}"]`)?.scrollIntoView({ block: "nearest" });
  }, [focus]);
  const h = dense ? 64 : 32; // two ruled lines in Queue Mode, so rows never sit across a rule
  const shown = list.slice(0, limit);
  return (
    <div ref={box} role="listbox" aria-label="Members" className="relative">
      {shown.map((st, i) => {
        const c = PLATE[st.plate];
        const on = i === focus;
        const sel = st.m.id === selected;
        const recent = unsynced.has(st.m.id);
        return (
          <motion.div
            layout="position"
            layoutId={`row-${st.m.id}`}
            transition={SPRING}
            key={st.m.id}
            data-i={i}
            role="option"
            aria-selected={sel}
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onFocus(i);
              onPick(st.m.id);
            }}
            className={`reg-row grid cursor-pointer items-center gap-2 pr-3 ${dense ? "reg-dense text-[16px]" : "text-[13px] max-[640px]:!h-auto max-[640px]:py-1"}`}
            style={{
              height: h,
              gridTemplateColumns: dense ? "64px 76px 1fr 110px 96px" : "64px 70px minmax(110px,1.3fr) 110px minmax(70px,.8fr) 64px 80px",
              background: sel ? "rgba(29,58,107,.10)" : on ? "rgba(29,58,107,.05)" : undefined,
              outline: on ? "1.5px solid var(--ink)" : undefined,
              outlineOffset: -2,
            }}
          >
            <span className={`flex items-center justify-end gap-1 ${dense ? "pr-[10px]" : "pr-2"}`}>
              <Plate state={st.plate} size={dense ? 28 : 22} frozen={!!st.frozenNow} title={`${c.en}`} label="" />
            </span>
            <span className="t-mono text-[12px]" style={{ color: "var(--muted-on-paper)" }}>
              {st.m.memberNo}
            </span>
            <span className="truncate font-medium max-[640px]:col-span-2" style={{ color: "var(--ink)" }}>
              {st.m.name}
              {recent && <span className="steel-tag ml-2 !text-[11px]">{t.unsynced}</span>}
            </span>
            <span className="t-mono max-[640px]:hidden">
              <Phone phone={st.m.phone} q={q} />
            </span>
            {!dense && (
              <>
                <span className="t-teko truncate text-[15px] max-[640px]:hidden" style={{ color: "var(--carbon)" }}>
                  {st.plan ? (lang === "hi" ? st.plan.nameHi : st.plan.nameEn) : "-"}
                </span>
                <span className="t-mono text-[12px] max-[640px]:hidden">{fmtDay(st.endDate)}</span>
              </>
            )}
            <span className="t-mono text-right text-[12px]">
              {st.dues > 0 ? <span style={{ color: "var(--stamp-due)" }}>{rupees(st.dues)}</span> : st.frozenNow ? <span style={{ color: "var(--stamp-freeze)" }}>FROZEN</span> : st.pending > 0 ? <span style={{ color: "var(--stamp-pending)" }}>PENDING</span> : <span className="t-teko text-[14px]" style={{ color: "var(--muted-on-paper)" }}>{lang === "hi" ? c.hi : c.en}</span>}
            </span>
          </motion.div>
        );
      })}
      {!shown.length && <div className="t-hand flex h-24 items-center pl-[72px] text-[18px]" style={{ color: "var(--muted-on-paper)" }}>{t.noMatch}{q ? ` "${q}"` : ""}. Press N to add them.</div>}
    </div>
  );
}

/** Today's page: the newest entries as carbon-copy lines. */
/** Plays the card-to-line landing: the fresh line starts where the card was and settles into the page. */
function FlyIn({ from, children }: { from: DOMRect | null; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !from) return;
    const to = el.getBoundingClientRect();
    void animate(el, { x: [from.left - to.left, 0], y: [from.top - to.top, 0], scaleY: [Math.min(6, from.height / Math.max(1, to.height)), 1], opacity: [0.4, 1] }, { duration: 0.36, ease: [0.2, 0, 0, 1] });
  }, [from]);
  return (
    <div ref={ref} style={{ transformOrigin: "0 0" }}>
      {children}
    </div>
  );
}

export function TodayPage({ snap, unsynced, fresh, from }: { snap: Snapshot; unsynced: Set<string>; fresh: string | null; from?: DOMRect | null }) {
  const today = todayIST();
  const staff = new Map(snap.staff.map((s) => [s.id, s.name]));
  const members = new Map(snap.members.map((m) => [m.id, m]));
  const plans = new Map(snap.plans.map((p) => [p.id, p]));
  const ms = new Map(snap.memberships.map((m) => [m.id, m]));
  const lines = snap.payments
    .filter((p) => todayIST(Date.parse(p.createdAt)) === today)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 6);
  if (!lines.length) return <div className="t-hand flex h-8 items-center pl-[72px] text-[15px]" style={{ color: "var(--muted-on-paper)" }}>Nothing written on today&apos;s page yet.</div>;
  const mode = (p: Payment) => (p.mode === "cash" ? "cash" : p.mode === "card" ? "card" : "UPI");
  return (
    <div>
      <AnimatePresence initial={false}>
        {lines.map((p) => {
          const m = members.get(p.memberId);
          const plan = p.membershipId ? plans.get(ms.get(p.membershipId)?.planId ?? "") : null;
          const text = `${istClock(p.createdAt).padStart(5, " ")}  ${m?.memberNo ?? ""}  ${m?.name ?? ""}  ${plan?.nameEn ?? (p.reversesId ? "reversal" : "dues")}  ${rupees(p.amount)} ${mode(p)}${p.utrLast4 ? ` UTR ${p.utrLast4}` : ""}  ${staff.get(p.receivedBy ?? "") ?? "member"}`;
          const line = (
            <div className="flex h-8 items-center gap-2 pl-[72px] pr-3">
              <span className={`carbon carbon-ghost t-mono truncate whitespace-pre text-[12.5px] ${p.state === "rejected" ? "line-through opacity-60" : ""}`} data-ghost={text}>
                {text}
              </span>
              {p.state === "pending" && <span className="t-teko text-[14px]" style={{ color: "var(--stamp-pending)" }}>PENDING</span>}
              {unsynced.has(p.id) && <span className="steel-tag !text-[11px]">unsynced</span>}
              {fresh === p.id && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.36 }}>
                  <InkTick />
                </motion.span>
              )}
            </div>
          );
          return (
            <motion.div key={p.id} layout="position" transition={SPRING}>
              {fresh === p.id ? <FlyIn from={from ?? null}>{line}</FlyIn> : line}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
