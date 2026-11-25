"use client";
// Freeze: pause a membership when a member travels, has exams or is unwell. The end date moves
// forward by exactly the days frozen, so nobody argues about it later. Requests from members' phone
// cards wait at the top; the board shows who ends in the next two weeks.
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppScreen } from "@/components/shell/AppShell";
import { useDerived, useGym, useSnap } from "@/components/shell/Gym";
import { Sheet } from "@/components/shell/Overlays";
import { Icon } from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Status";
import { addDays, fmtDate, fmtDay, fmtSpan, weekday } from "@/lib/core/dates";
import { firstName, initials, uid } from "@/lib/core/money";
import { search } from "@/lib/core/search";
import { freezeRules, type MemberState } from "@/lib/core/state";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REASONS = ["Travel", "Exams", "Illness", "Other"];

export function Freeze() {
  const { store, base, mode, today } = useGym();
  const snap = useSnap();
  const d = useDerived();
  const router = useRouter();
  const sp = useSearchParams();
  const [menu, setMenu] = useState<string | null>(null);
  const [form, setForm] = useState<null | { memberId: string; days: number; custom: string; reason: string; from: string }>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const lv = mode === "demo" && snap?.branch.code === "LV" ? "&b=LV" : "";

  useEffect(() => {
    const m = sp.get("m");
    if (m) setForm({ memberId: m, days: 7, custom: "", reason: "Travel", from: today });
  }, [sp, today]);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const onBoard = useMemo(() => (d ? d.list.filter((x) => x.endDate && x.endDate >= today && x.endDate <= days[13]) : []), [d, today, days]);
  const requests = useMemo(() => (snap ? snap.freezes.filter((f) => f.state === "requested") : []), [snap]);
  const frozen = useMemo(
    () =>
      snap && d
        ? snap.freezes
            .filter((f) => f.state === "approved" && f.toDate >= today)
            .flatMap((f) => {
              const st: MemberState | undefined = d.byId.get(f.memberId);
              return st ? [{ f, st }] : [];
            })
        : [],
    [snap, d, today],
  );
  const hits = useMemo(() => (d && q.trim() ? search(d.list, q).slice(0, 6) : []), [d, q]);

  if (!snap || !d)
    return (
      <AppScreen screen="freeze" title="Freeze" sentence="Pause a membership when a member travels or is sick. Their end date moves forward." vignette="freeze">
        <div className="island-skel mx-auto w-full max-w-[1200px]" aria-hidden>
          <i style={{ height: 120 }} />
          <i style={{ height: 300 }} />
        </div>
      </AppScreen>
    );

  const decide = (id: string, approve: boolean, name: string) => {
    const r = store.run("freeze.decide", { id, state: approve ? "approved" : "rejected" });
    if (!r.ok) return store.note(r.error ?? "Not saved");
    store.note(approve ? `${name}'s freeze approved. The end date moved forward.` : `${name}'s request declined. They see this on their card.`, "ink");
    if (approve) setRecent((x) => [...x, id]);
  };
  const fst = form ? d.byId.get(form.memberId) : undefined;
  const nDays = form ? (form.custom ? Math.max(0, Math.round(Number(form.custom) || 0)) : form.days) : 0;
  const chk = fst ? freezeRules(snap, fst, nDays) : null;
  const doFreeze = () => {
    if (!form || !fst || !chk) return;
    if (!chk.ok) return setErr(`${chk.why}.`);
    const id = uid();
    const r = store.run("freeze.set", { id, memberId: form.memberId, fromDate: form.from, days: nDays, reason: form.reason });
    if (!r.ok) return setErr(r.error ?? "Not saved");
    setRecent((x) => [...x, id]);
    store.note(`${fst.m.name} frozen for ${nDays} days. New end date ${fmtDay(addDays(fst.endDate ?? today, nDays))}.`, "ink");
    setForm(null);
    setErr("");
    setMenu(null);
  };

  return (
    <AppScreen screen="freeze" title="Freeze" sentence="Pause a membership when a member travels or is sick. Their end date moves forward." vignette="freeze">
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-3 py-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="panel p-4" aria-label="Freeze requests">
            <h2 className="text-[17px] font-bold">Requests from members ({requests.length})</h2>
            {!requests.length && <p className="mt-1 text-[15px] text-[var(--muted-ink)]">No requests waiting. Members ask from the card on their phone.</p>}
            <ul className="mt-2 flex flex-col gap-2">
              {requests.map((f) => {
                const st = d.byId.get(f.memberId);
                if (!st) return null;
                const c = freezeRules(snap, st, f.days, f.id);
                return (
                  <li key={f.id} className="panel-flat flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-[220px] flex-1">
                      <p className="text-[15px]">
                        <b>{st.m.name}</b> wants to freeze for {f.days} days, {fmtSpan(f.fromDate, f.toDate)}. Reason: {f.reason}.
                      </p>
                      <p className="text-[14px] text-[var(--muted-ink)]">{c.maxDays ? `The ${st.plan?.nameEn ?? ""} plan allows up to ${c.maxDays} freeze days; ${c.usedDays} already used. ${c.ok ? "This fits." : c.why + "."}` : c.why}</p>
                    </div>
                    <button type="button" className="btn btn-success" onClick={() => decide(f.id, true, st.m.name)}>
                      <Icon name="tick" size={18} /> Approve
                    </button>
                    <button type="button" className="btn" onClick={() => decide(f.id, false, st.m.name)}>
                      Decline
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="whiteboard p-3 pb-6" aria-label="Who ends in the next 2 weeks">
            <h2 className="mb-2 text-[17px] font-bold">Who ends in the next 2 weeks</h2>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((day) => {
                const here = onBoard.filter((x) => x.endDate === day);
                return (
                  <div key={day} className="flex min-h-[96px] flex-col items-center gap-1 rounded-lg border border-[rgba(27,26,46,.25)] bg-[rgba(255,255,255,.55)] p-1">
                    <span className="text-center text-[12px] font-semibold leading-tight text-[var(--muted-ink)]">
                      {day === today ? "Today" : WD[weekday(day)]} {Number(day.slice(8))}
                    </span>
                    {here.slice(0, 4).map((x) => (
                      <button key={x.m.id} type="button" onClick={() => setMenu(menu === x.m.id ? null : x.m.id)} aria-expanded={menu === x.m.id} aria-label={`${x.m.name}, ${x.frozenNow ? "frozen" : "ends soon"}, ${fmtDay(x.endDate)}`} className="flex flex-col items-center">
                        <span className="grid size-9 place-items-center rounded-full border-2 border-[var(--ink)] text-[12px] font-bold shadow-[0_2px_0_var(--ink)]" style={{ background: x.frozenNow ? "var(--kingfisher)" : "var(--marigold-pale)", color: x.frozenNow ? "#fff" : "var(--ink)" }}>
                          {initials(x.m.name)}
                        </span>
                        <span className="max-w-[64px] truncate text-[11px] font-semibold">{firstName(x.m.name)}</span>
                      </button>
                    ))}
                    {here.length > 4 && <span className="text-[11px] font-semibold">+{here.length - 4} more</span>}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex flex-wrap gap-4 text-[13px] font-semibold">
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-full border-2 border-[var(--ink)] bg-[var(--marigold-pale)]" /> Ends soon
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-3 rounded-full border-2 border-[var(--ink)] bg-[var(--kingfisher)]" /> Frozen
              </span>
              <span>Tap a name to freeze or renew. No dragging needed.</span>
            </p>
          </section>
          {menu && d.byId.get(menu) && (
            <div className="panel flex flex-wrap items-center gap-2 p-3">
              <span className="w-full font-bold">{d.byId.get(menu)!.m.name}</span>
              <button type="button" className="btn" onClick={() => setForm({ memberId: menu, days: 7, custom: "", reason: "Travel", from: today })}>
                <Icon name="snow" size={18} /> Freeze…
              </button>
              <button type="button" className="btn" onClick={() => router.push(`${base}/desk?m=${menu}${lv}`)}>
                <Icon name="renew" size={18} /> Renew
              </button>
              <button type="button" className="btn" onClick={() => router.push(`${base}/desk?m=${menu}${lv}`)}>
                Open member
              </button>
            </div>
          )}
        </div>
        <aside className="flex flex-col gap-4">
          <section className="panel-flat p-3" aria-label="Freeze someone else">
            <label>
              <span className="label">Freeze someone else</span>
              <input type="search" className="input mt-1" placeholder="Last 4 digits of phone, or name" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <ul className="mt-2 flex flex-col gap-1">
              {hits.map((x) => (
                <li key={x.m.id}>
                  <button type="button" className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-left hover:bg-[var(--marigold-pale)]" onClick={() => setForm({ memberId: x.m.id, days: 7, custom: "", reason: "Travel", from: today })}>
                    <span className="font-semibold">{x.m.name}</span>
                    <span className="text-[13px] text-[var(--muted-ink)]">Freeze…</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel-flat p-3" aria-label="Frozen now">
            <h2 className="text-[16px] font-bold">Frozen now ({frozen.length})</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {frozen.map(({ f, st }) => (
                <li key={f.id} className="flex flex-col gap-1 border-b border-[var(--line)] pb-2 last:border-0">
                  <span className="font-semibold">{st.m.name}</span>
                  <Chip kind="frozen" text={`Frozen till ${fmtDay(f.toDate)}`} className="self-start" />
                  <span className="text-[13px] text-[var(--muted-ink)]">
                    {fmtSpan(f.fromDate, f.toDate)} · {f.reason} · ends {fmtDate(st.endDate, today)}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {f.fromDate <= today && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          const r = store.run("freeze.end", { id: f.id });
                          store.note(r.ok ? r.note ?? "Freeze ended." : r.error ?? "Not saved", r.ok ? "ink" : "red");
                        }}
                      >
                        End freeze early
                      </button>
                    )}
                    {recent.includes(f.id) && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          const r = store.run("freeze.cancel", { id: f.id });
                          store.note(r.ok ? "Freeze undone. The end date is back." : r.error ?? "Not undone", r.ok ? "ink" : "red");
                        }}
                      >
                        <Icon name="undo" size={16} /> Undo
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {!frozen.length && <li className="text-[14px] text-[var(--muted-ink)]">Nobody is frozen right now.</li>}
            </ul>
          </section>
        </aside>
      </div>
      {form && fst && chk && (
        <Sheet title={`Freeze ${fst.m.name}`} sentence={chk.maxCount ? `${chk.maxCount - chk.usedCount} of ${chk.maxCount} freezes left on the ${fst.plan?.nameEn ?? ""} plan, up to ${chk.maxNow} more days.` : chk.why} onClose={() => (setForm(null), setErr(""))}>
          <div className="flex flex-col gap-3">
            <label>
              <span className="label">From</span>
              <input type="date" className="input mt-1" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value || today })} />
            </label>
            <div>
              <span className="label">How many days</span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {[7, 10, 15, 30].map((n) => (
                  <button key={n} type="button" className="chip chip-filter" aria-pressed={!form.custom && form.days === n} onClick={() => setForm({ ...form, days: n, custom: "" })}>
                    {n} days
                  </button>
                ))}
                <input inputMode="numeric" aria-label="Or type the days" placeholder="Other" className="input !min-h-9 !w-24" value={form.custom} onChange={(e) => setForm({ ...form, custom: e.target.value.replace(/\D/g, "") })} />
              </div>
            </div>
            <div>
              <span className="label">Reason</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {REASONS.map((r) => (
                  <button key={r} type="button" className="chip chip-filter" aria-pressed={form.reason === r} onClick={() => setForm({ ...form, reason: r })}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {nDays > 0 && fst.endDate && <p className="text-[15px]">The end date moves from {fmtDate(fst.endDate, today)} to {fmtDate(addDays(fst.endDate, nDays), today)}.</p>}
            {(err || !chk.ok) && (
              <p role="alert" className="text-[14px] font-semibold text-[#9b0f3f]">
                {err || `${chk.why}.`}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary btn-lg" onClick={doFreeze}>
                Freeze membership
              </button>
              <button type="button" className="btn btn-lg" onClick={() => (setForm(null), setErr(""))}>
                Cancel
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </AppScreen>
  );
}
