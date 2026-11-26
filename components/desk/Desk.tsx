"use client";
// The front desk. Left: find a member (last 4 digits, name or member number), filters with counts,
// the list. Right: the member's card with every action as a labelled button, and the renewal flow
// in the same place. Keyboard keys are optional extras shown as faint hints on the buttons.
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppScreen, useShell } from "@/components/shell/AppShell";
import { useDerived, useGym, useGymState, useSnap } from "@/components/shell/Gym";
import { message } from "@/components/shell/links";
import { Sheet } from "@/components/shell/Overlays";
import { setTourDone, Tour, tourDone } from "@/components/shell/Tour";
import { Icon } from "@/components/ui/Icon";
import { Chip, chipsFor, DaysRing, Initials } from "@/components/ui/Status";
import { EmptyArt } from "@/components/world/Vignettes";
import { forceLite } from "@/lib/client/fx";
import { lsGet, lsSet } from "@/lib/client/idb";
import { undoPayment } from "@/lib/client/undo";
import { fmtDate, fmtDay, fmtSpan, istClock, todayIST } from "@/lib/core/dates";
import { rupees, uid } from "@/lib/core/money";
import { search, uniqueByLast4 } from "@/lib/core/search";
import { computeSlate } from "@/lib/core/slate";
import { isRushHour, planLabel, type MemberState } from "@/lib/core/state";
import type { Snapshot } from "@/lib/core/types";
import { CameraStrip } from "./Camera";
import { useCheckin, type ScanEvent } from "./checkin";
import { NewMember } from "./NewMember";
import { RenewFlow, type Landed } from "./RenewFlow";
import { useWhatsApp, WaProvider } from "./WaSheet";

type FilterKey = "all" | "today" | "week" | "dues" | "lapsed" | "frozen" | "waiting";
const FILTERS: { k: FilterKey; label: string }[] = [
  { k: "all", label: "All" },
  { k: "today", label: "Ends today" },
  { k: "week", label: "This week" },
  { k: "dues", label: "Owes money" },
  { k: "lapsed", label: "Ended" },
  { k: "frozen", label: "Frozen" },
  { k: "waiting", label: "Waiting for money" },
];

function useNarrow() {
  const [n, setN] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 1023px)");
    const on = () => setN(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return n;
}

export function Desk() {
  return (
    <WaProvider>
      <DeskInner />
    </WaProvider>
  );
}

function DeskInner() {
  const { store, mode, base, lang, today } = useGym();
  const status = useGymState((s) => s.status);
  const actor = useGymState((s) => s.actor);
  const snap = useSnap();
  const d = useDerived();
  const router = useRouter();
  const params = useSearchParams();
  const wa = useWhatsApp();
  const { checkIn, scan } = useCheckin();
  const narrow = useNarrow();

  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(-1);
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<"card" | "renew" | "pay">("card");
  const [overlay, setOverlay] = useState<null | "new" | "present" | "more" | "edit">(null);
  const [camera, setCamera] = useState(false);
  const [pile, setPile] = useState<ScanEvent[]>([]);
  const [queue, setQueue] = useState(false);
  const [last, setLast] = useState<Landed | null>(null);
  const [limit, setLimit] = useState(80);
  const [tour, setTour] = useState(0);
  const [dismissedQ, setDismissedQ] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const lastG = useRef(0);
  const filter = (params.get("f") ?? "all") as FilterKey;
  const staffName = snap?.staff.find((s) => s.id === actor.staffId)?.name ?? "Desk";

  // ?m= opens a member (from the report, the freeze board, the home page)
  useEffect(() => {
    const m = params.get("m");
    if (m) setSel(m);
  }, [params]);

  // the tour: first visit to the demo desk, or "Show me the tour again"
  useEffect(() => {
    if (mode !== "demo") return;
    if (params.get("tour") === "1") setTourDone(false);
    if (!tourDone()) setTour(1);
  }, [mode, params]);

  // rush hour mode switches itself on in the owner's rush hours, unless turned off today
  useEffect(() => {
    if (snap && isRushHour(snap.branch.settings.rushHours) && lsGet(`kb_queue_off_${today}`) !== "1") setQueue(true);
  }, [snap?.branch.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    forceLite(queue);
    return () => forceLite(false);
  }, [queue]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: 0, today: 0, week: 0, dues: 0, lapsed: 0, frozen: 0, waiting: 0 };
    for (const x of d?.list ?? []) {
      c.all++;
      if (x.endDate === today) c.today++;
      if (x.daysLeft != null && x.daysLeft >= 0 && x.daysLeft <= 7) c.week++;
      if (x.dues > 0) c.dues++;
      if (x.status === "lapsed") c.lapsed++;
      if (x.frozenNow) c.frozen++;
      if (x.pending > 0) c.waiting++;
    }
    return c;
  }, [d, today]);

  const list = useMemo(() => {
    if (!d) return [];
    let l = d.list;
    if (filter === "today") l = l.filter((x) => x.endDate === today);
    else if (filter === "week") l = l.filter((x) => x.daysLeft != null && x.daysLeft >= 0 && x.daysLeft <= 7);
    else if (filter === "dues") l = l.filter((x) => x.dues > 0);
    else if (filter === "lapsed") l = l.filter((x) => x.status === "lapsed");
    else if (filter === "frozen") l = l.filter((x) => !!x.frozenNow);
    else if (filter === "waiting") l = l.filter((x) => x.pending > 0);
    return search(l, q);
  }, [d, q, filter, today]);
  const one = useMemo(() => (d ? uniqueByLast4(d.list, q) : null), [d, q]);
  const st = sel && d ? d.byId.get(sel) ?? null : null;

  const pick = useCallback((id: string) => {
    setSel(id);
    setView("card");
  }, []);

  // exactly one phone ends with the 4 digits typed: open that card
  useEffect(() => {
    if (one && one.m.id !== sel && dismissedQ !== q.trim()) pick(one.m.id);
  }, [one, sel, q, dismissedQ, pick]);

  // the tour moves on only when the real thing happens
  const maheshId = useMemo(() => d?.list.find((x) => x.m.phone.endsWith("4521"))?.m.id ?? null, [d]);
  useEffect(() => {
    if (tour === 1 && sel && sel === maheshId) setTour(2);
    if (tour === 2 && view === "renew") setTour(3);
  }, [tour, sel, maheshId, view]);

  const refocus = useCallback(() => {
    if (!narrow) setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0);
  }, [narrow]);

  const handleEvent = useCallback(
    (ev: ScanEvent) => {
      if (ev.kind === "ok") store.note(`${ev.st?.m.name ?? "Member"} checked in at ${ev.time}.`, "ink");
      else if (["dues", "frozen", "lapsed", "photo"].includes(ev.kind)) setPile((p) => [ev, ...p.filter((x) => x.st?.m.id !== ev.st?.m.id)].slice(0, 20));
      else store.note(ev.st ? `${ev.st.m.name}: ${ev.text}` : ev.text, ev.kind === "already" ? "ink" : "red");
    },
    [store],
  );
  const onScan = useCallback(async (code: string) => handleEvent(await scan(code, "desk_scan")), [scan, handleEvent]);

  // USB scanners type like a keyboard: "KB1." arriving within 50 ms is a scan, not search text
  useEffect(() => {
    let buf = "";
    let lastAt = 0;
    const on = (e: KeyboardEvent) => {
      const now = performance.now();
      if (e.key.length === 1) {
        if (now - lastAt > 50) buf = "";
        buf += e.key;
        lastAt = now;
        if (buf.startsWith("KB1.")) {
          e.preventDefault();
          e.stopPropagation();
        }
      } else if (e.key === "Enter" && buf.startsWith("KB1.") && now - lastAt < 80) {
        e.preventDefault();
        e.stopPropagation();
        const code = buf;
        buf = "";
        setQ((v) => v.replace(/K?B?1?\.?$/, ""));
        void onScan(code);
      }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, [onScan]);

  // demo: a member card open in another tab can "scan" at this desk, and hears the answer
  useEffect(() => {
    if (mode !== "demo" || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("kb-demo");
    ch.onmessage = async (m) => {
      if (m.data?.type !== "scan") return;
      const ev = await scan(m.data.code, "desk_scan");
      handleEvent(ev);
      ch.postMessage({ type: "scan-result", kind: ev.kind, text: ev.text, memberId: ev.st?.m.id ?? null, at: Date.now() });
    };
    return () => ch.close();
  }, [mode, scan, handleEvent]);

  const remind = useCallback(
    (x: MemberState) => {
      if (!snap) return;
      const stage = x.dues > 0 ? "dues" : x.status === "lapsed" ? "post3" : x.daysLeft != null && x.daysLeft <= 0 ? "day0" : x.daysLeft != null && x.daysLeft <= 3 ? "pre3" : "pre7";
      const id = uid();
      const r = store.run("reminder.add", { reminders: [{ id, memberId: x.m.id, membershipId: x.term?.id ?? null, stage: "manual", dueDate: today }] });
      if (r.ok) store.run("reminder.mark", { id, state: "opened" });
      wa({ phone: x.m.phone, text: message(snap, mode, x, stage, lang, staffName), to: x.m.name });
    },
    [snap, store, today, wa, mode, lang, staffName],
  );

  const runAction = useCallback(
    (k: string) => {
      if (!st) return;
      if (k === "r") setView("renew");
      else if (k === "p" && st.dues > 0) setView("pay");
      else if (k === "c") {
        handleEvent(checkIn(st.m.id, "desk_manual"));
        if (queue) refocus();
      } else if (k === "f") router.push(`${base}/freeze?m=${st.m.id}${mode === "demo" && snap?.branch.code === "LV" ? "&b=LV" : ""}`);
      else if (k === "w") remind(st);
    },
    [st, handleEvent, checkIn, queue, refocus, router, base, mode, snap, remind],
  );

  const doUndo = useCallback(() => {
    if (!last) return;
    const r = undoPayment(store, last);
    store.note(r.text, r.ok ? "ink" : "red");
    if (r.ok) setLast(null);
  }, [last, store]);

  // the desk keyboard
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (overlay || document.querySelector('[aria-modal="true"]:not([data-member-sheet])')) return;
      const el = e.target as HTMLElement;
      const inField = !!el.closest("input,textarea,select");
      const inSearch = el === searchRef.current;
      const mod = e.ctrlKey || e.metaKey || e.altKey;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !inField) {
        e.preventDefault();
        return doUndo();
      }
      if (view !== "card") return;
      const letter = e.key.length === 1 ? e.key.toLowerCase() : "";
      if (inSearch) {
        // 4521 then R: with only digits typed and that one card open, the letter is an action, not text
        if (!mod && "rpcfw".includes(letter) && letter && /^\d{1,4}$/.test(q.trim()) && st && one && one.m.id === st.m.id) {
          e.preventDefault();
          runAction(letter);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setFocus((f) => Math.min(list.length - 1, f + 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setFocus((f) => Math.max(0, f - 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          const hit = focus >= 0 ? list[focus] : one ?? (q.trim() && list.length === 1 ? list[0] : undefined);
          if (hit) pick(hit.m.id);
        } else if (e.key === "Escape") {
          if (q) setQ("");
          else if (sel) setSel(null);
          setFocus(-1);
        }
        return;
      }
      if (inField || mod) return;
      // G then a letter belongs to the menu (G W is Freeze), never to the open card
      if (e.key === "g" || e.key === "G") {
        lastG.current = Date.now();
        return;
      }
      if (Date.now() - lastG.current < 1200) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setQ((v) => v + e.key);
        setFocus(-1);
        searchRef.current?.focus({ preventScroll: true });
        return;
      }
      if (st && "rpcfw".includes(letter) && letter) {
        e.preventDefault();
        return runAction(letter);
      }
      switch (e.key) {
        case "/":
          e.preventDefault();
          searchRef.current?.focus();
          return;
        case "c":
        case "C":
          return setCamera((v) => !v);
        case "n":
        case "N":
          e.preventDefault();
          return setOverlay("new");
        case "q":
        case "Q":
          setQueue((v) => {
            if (v) lsSet(`kb_queue_off_${today}`, "1");
            return !v;
          });
          return refocus();
        case "j":
        case "ArrowDown":
          e.preventDefault();
          return setFocus((f) => Math.min(list.length - 1, f + 1));
        case "k":
        case "ArrowUp":
          e.preventDefault();
          return setFocus((f) => Math.max(0, f - 1));
        case "Enter":
          if (focus >= 0 && list[focus]) pick(list[focus].m.id);
          return;
        case "Escape":
          if (camera) setCamera(false);
          else if (sel) {
            setSel(null);
            setDismissedQ(q.trim());
          }
          return refocus();
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  const onLanded = (l: Landed) => {
    setLast(l);
    if (tour === 3) setTour(4);
  };
  const closeFlow = () => {
    setView("card");
    if (queue) {
      setQ("");
      setSel(null);
      refocus();
    }
  };
  const sendReceipt = (l: Landed) => {
    if (!snap || !d) return;
    const s2 = d.byId.get(l.memberId);
    if (!s2) return;
    try {
      const sent = JSON.parse(lsGet("kb_receipts_sent") ?? "[]") as string[];
      lsSet("kb_receipts_sent", JSON.stringify([...sent, ...l.paymentIds].slice(-400)));
    } catch {}
    wa({ phone: s2.m.phone, text: message(snap, mode, s2, "receipt", lang, staffName, { amount: l.amount, paymentId: l.paymentIds[0], planName: l.planName, expiry: l.newEnd ?? s2.endDate }), to: s2.m.name });
  };

  const pileAct = (ev: ScanEvent, a: "open" | "credit" | "away" | "photo-ok" | "end-freeze") => {
    const id = ev.st?.m.id;
    if (!id) return;
    const drop = () => setPile((p) => p.filter((x) => x.id !== ev.id));
    if (a === "open") {
      drop();
      pick(id);
      setView(ev.kind === "dues" ? "pay" : "renew");
    } else if (a === "credit") {
      const r = checkIn(id, "desk_manual", { force: true, onCredit: true });
      if (r.kind === "ok") {
        drop();
        store.note(`${ev.st?.m.name} let in on credit by ${staffName}.`, "ink");
      } else store.note(r.text);
    } else if (a === "photo-ok") {
      drop();
      handleEvent(checkIn(id, "photo_check"));
    } else if (a === "end-freeze") {
      const f = ev.st?.frozenNow;
      if (!f) return;
      const r = store.run("freeze.end", { id: f.id });
      if (!r.ok) return store.note(r.error ?? "Not saved");
      drop();
      handleEvent(checkIn(id, "desk_manual"));
    } else drop();
  };

  if (status === "error") return <ErrorPanel />;
  const slate = snap ? computeSlate(snap, today) : null;
  const todayLine = slate ? `Ending today ${slate.endingToday.length} · Owes money ${rupees(slate.dues.total)} · ${slate.checkinsToday} checked in` : "";
  const empty = !!snap && d?.list.length === 0;
  const flowOpen = !!st && view !== "card";

  const cardZone = st ? (
    flowOpen ? (
      <section className="panel p-4" data-tour="flow">
        <RenewFlow key={`${st.m.id}-${view}`} st={st} snap={snap!} duesOnly={view === "pay"} keyboard={!narrow} onCancel={closeFlow} onLanded={onLanded} onReceipt={sendReceipt} />
      </section>
    ) : (
      <MemberPanel st={st} snap={snap!} onAction={runAction} onMore={() => setOverlay("more")} keys={!narrow} />
    )
  ) : null;

  return (
    <AppScreen
      screen="desk"
      title="Front desk"
      sentence={todayLine || "Find a member, renew, take fees and check people in."}
      vignette="desk"
      actions={
        <>
          <button type="button" className="btn" onClick={() => setOverlay("new")}>
            <Icon name="plus" size={18} /> New member <span className="kc">N</span>
          </button>
          <button type="button" className="btn hidden sm:inline-flex" onClick={() => setCamera((v) => !v)} aria-pressed={camera}>
            <Icon name="camera" size={18} /> Check in by QR
          </button>
        </>
      }
    >
      {!snap || !d ? (
        <div className="island-skel mx-auto w-full max-w-[1440px]" aria-hidden>
          <i style={{ height: 56 }} />
          <i style={{ height: 36, width: "70%" }} />
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} style={{ height: 52 }} />
          ))}
        </div>
      ) : empty ? (
        <EmptyGym onAdd={() => setOverlay("new")} importHref={`${base}/import`} />
      ) : (
        <div className="mx-auto grid w-full max-w-[1440px] flex-1 gap-4 px-3 py-4 md:px-6 lg:grid-cols-[minmax(0,56fr)_minmax(0,44fr)]">
          {/* left: find, filter, list */}
          <section className="flex min-w-0 flex-col gap-3" aria-label="Members">
            {mode === "live" && <GettingStarted snap={snap} base={base} />}
            {queue && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--marigold-pale)] px-3 py-2 text-[14px] font-semibold">
                <Icon name="clock" size={18} /> Rush hour mode is on: the search box stays ready after every action.
                <button
                  type="button"
                  className="btn btn-sm ml-auto"
                  onClick={() => {
                    lsSet(`kb_queue_off_${today}`, "1");
                    setQueue(false);
                  }}
                >
                  Turn off
                </button>
              </div>
            )}
            <label className="block">
              <span className="label">Find a member</span>
              <span className="relative mt-1 block">
                <Icon name="search" size={22} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchRef}
                  data-tour="search"
                  type="search"
                  inputMode="search"
                  autoComplete="off"
                  className="input !min-h-14 !pl-11 !pr-16 text-[18px]"
                  placeholder="Last 4 digits of phone, or name"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setFocus(-1);
                    setDismissedQ(null);
                  }}
                  aria-controls="kb-members"
                />
                <span className="kc pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">Ctrl K</span>
              </span>
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
              {FILTERS.map((f) => (
                <button
                  key={f.k}
                  type="button"
                  className="chip chip-filter"
                  aria-pressed={filter === f.k}
                  onClick={() => {
                    const u = new URLSearchParams(params.toString());
                    if (f.k === "all") u.delete("f");
                    else u.set("f", f.k);
                    router.replace(`?${u.toString()}`, { scroll: false });
                    setFocus(-1);
                  }}
                >
                  {f.label} <span className="t-mono text-[12px] opacity-80">{counts[f.k]}</span>
                </button>
              ))}
            </div>
            {pile.length > 0 && <TalkToThem items={pile} onAct={pileAct} />}
            {camera && (
              <div className="flex flex-col gap-2">
                <CameraStrip onCode={(c) => void onScan(c)} onClose={() => setCamera(false)} />
                {mode === "demo" && <SimulateScan d={d.list} onEvent={handleEvent} checkIn={checkIn} />}
              </div>
            )}
            <ul id="kb-members" className="panel-flat divide-y divide-[var(--line)] overflow-hidden" aria-label={`${list.length} members`}>
              {list.slice(0, limit).map((x, i) => (
                <li key={x.m.id}>
                  <Row x={x} on={x.m.id === sel} focused={i === focus} q={q} onPick={() => pick(x.m.id)} dense={queue} />
                </li>
              ))}
              {!list.length && <li className="p-4 text-[15px]">{q ? `No member matches "${q}". Check the number, or add them with New member.` : "Nobody in this list today."}</li>}
            </ul>
            {list.length > limit && (
              <button type="button" className="btn self-start" onClick={() => setLimit((l) => l + 120)}>
                Show {Math.min(120, list.length - limit)} more of {list.length}
              </button>
            )}
          </section>

          {/* right: the card and its actions (desktop) */}
          <section className="hidden min-w-0 flex-col gap-3 lg:flex" aria-label="Member">
            <div className="sticky top-[120px] flex flex-col gap-3">
              {cardZone ?? (
                <div className="panel flex flex-col items-center gap-3 p-6 text-center">
                  <EmptyArt kind="desk" />
                  <p className="text-[17px] font-semibold">No member selected.</p>
                  <p className="text-[15px] text-[var(--muted-ink)]">Search above, or tap a name in the list.</p>
                  {mode === "demo" && (
                    <button type="button" className="btn btn-sm" onClick={() => (setTourDone(false), setTour(1))}>
                      New here? Show me the tour
                    </button>
                  )}
                </div>
              )}
              {st && !flowOpen && <History snap={snap} memberId={st.m.id} />}
              <button type="button" className="btn self-start" onClick={() => setOverlay("present")}>
                <Icon name="door" size={18} /> Checked in today ({slate?.checkinsToday ?? 0})
              </button>
              {mode === "demo" && !camera && <SimulateScan d={d.list} onEvent={handleEvent} checkIn={checkIn} />}
            </div>
          </section>
        </div>
      )}

      {/* phone and tablet: the card comes up as a sheet, its actions pinned at the bottom */}
      {narrow && st && (
        <MemberSheet onClose={() => (setSel(null), setView("card"), setDismissedQ(q.trim()))} title={st.m.name}>
          {flowOpen ? (
            <div data-tour="flow">
              <RenewFlow key={`${st.m.id}-${view}`} st={st} snap={snap!} duesOnly={view === "pay"} onCancel={closeFlow} onLanded={onLanded} onReceipt={sendReceipt} />
            </div>
          ) : (
            <>
              <MemberPanel st={st} snap={snap!} onAction={runAction} onMore={() => setOverlay("more")} pinned />
              <History snap={snap!} memberId={st.m.id} />
            </>
          )}
        </MemberSheet>
      )}

      {overlay === "new" && snap && (
        <NewMember
          snap={snap}
          onCancel={() => setOverlay(null)}
          onExisting={(id) => {
            setOverlay(null);
            pick(id);
          }}
          onDone={(id) => {
            setOverlay(null);
            pick(id);
            setView("renew");
          }}
        />
      )}
      {overlay === "present" && snap && d && <PresentSheet snap={snap} onClose={() => setOverlay(null)} onPick={(id) => (setOverlay(null), pick(id))} />}
      {overlay === "more" && st && snap && <MoreSheet st={st} snap={snap} onClose={() => setOverlay(null)} onEdit={() => setOverlay("edit")} />}
      {overlay === "edit" && st && <EditSheet st={st} onClose={() => setOverlay(null)} />}
      {tour > 0 && (
        <Tour
          step={tour}
          onSkip={() => {
            setTourDone(true);
            setTour(0);
          }}
          onDoIt={() => {
            setQ("4521");
            setDismissedQ(null);
            searchRef.current?.focus({ preventScroll: true });
          }}
          onFees={() => {
            setTourDone(true);
            setTour(0);
            router.push(`${base}/fees`);
          }}
        />
      )}
    </AppScreen>
  );
}

function Row({ x, on, focused, q, onPick, dense }: { x: MemberState; on: boolean; focused: boolean; q: string; onPick: () => void; dense: boolean }) {
  const { today } = useGym();
  const c = chipsFor(x)[0];
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);
  const digits = q.replace(/\D/g, "");
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPick}
      aria-current={on ? "true" : undefined}
      className={`flex w-full items-center gap-3 px-3 text-left ${dense ? "min-h-12" : "min-h-[52px] py-1.5"}`}
      style={{ background: on ? "var(--marigold-pale)" : focused ? "#f6ead0" : undefined, boxShadow: on ? "inset 4px 0 0 var(--saffron)" : focused ? "inset 4px 0 0 var(--ink)" : undefined }}
    >
      <Initials name={x.m.name} photo={x.m.photo} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold leading-tight">{x.m.name}</span>
        <span className="t-mono block text-[13px] text-[var(--muted-ink)]">
          {x.m.memberNo} · <span className={digits.length >= 3 && x.m.phone.endsWith(digits) ? "rounded bg-[var(--marigold)] px-0.5 text-[var(--ink)]" : ""}>•••• {x.m.phone.slice(-4)}</span>
        </span>
      </span>
      {!dense && <span className="hidden w-[110px] truncate text-[14px] xl:block">{planLabel(x)}</span>}
      {!dense && <span className="hidden w-[118px] text-[14px] text-[var(--muted-ink)] sm:block">{x.endDate ? `Valid till ${fmtDay(x.endDate)}` : ""}</span>}
      <span className="shrink-0">{c && <Chip {...c} />}</span>
      <span className="sr-only">{x.endDate ? `Valid till ${fmtDate(x.endDate, today)}` : ""}</span>
    </button>
  );
}

function MemberPanel({ st, snap, onAction, onMore, keys, pinned }: { st: MemberState; snap: Snapshot; onAction: (k: string) => void; onMore: () => void; keys?: boolean; pinned?: boolean }) {
  const { today, mode } = useGym();
  const { open } = useShell();
  const kc = (k: string) => (keys ? <span className="kc">{k}</span> : null);
  const pending = st.pending > 0;
  const buttons: ReactNode[] = [
    <button key="r" type="button" className="btn btn-primary" data-tour="renew" onClick={() => onAction("r")}>
      <Icon name="renew" size={18} /> Renew {kc("R")}
    </button>,
    st.dues > 0 ? (
      <button key="p" type="button" className="btn btn-success" onClick={() => onAction("p")}>
        <Icon name="rupee" size={18} /> Mark paid {rupees(st.dues)} {kc("P")}
      </button>
    ) : null,
    pending ? (
      <button key="u" type="button" className="btn" onClick={() => open("upi")}>
        <Icon name="clock" size={18} /> Money arrived?
      </button>
    ) : null,
    <button key="c" type="button" className="btn" onClick={() => onAction("c")}>
      <Icon name="door" size={18} /> Check in {kc("C")}
    </button>,
    <button key="w" type="button" className="btn" onClick={() => onAction("w")}>
      <Icon name="chat" size={18} /> Send reminder {kc("W")}
    </button>,
    <button key="f" type="button" className="btn" onClick={() => onAction("f")}>
      <Icon name="snow" size={18} /> Freeze {kc("F")}
    </button>,
    <button key="m" type="button" className="btn" onClick={onMore}>
      <Icon name="more" size={18} stroke={3} /> More
    </button>,
  ].filter(Boolean);
  return (
    <section className="panel overflow-hidden" data-tour="card" aria-label={`${st.m.name}'s card`}>
      <div className="h-2" style={{ background: snap.branch.color }} />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <Initials name={st.m.name} photo={st.m.photo} size={56} />
          <div className="min-w-0 flex-1">
            <h2 className="t-display text-[24px] leading-tight" style={{ fontWeight: 700 }}>
              {st.m.name}
            </h2>
            <p className="text-[14px] text-[var(--muted-ink)]">
              <span className="t-mono">{st.m.memberNo}</span> · •••• {st.m.phone.slice(-4)} · {planLabel(st) || "No plan yet"}
            </p>
            <p className="mt-1 text-[16px] font-semibold">
              {st.endDate ? `Valid till ${fmtDate(st.endDate, today)}` : "No plan yet"}
              {st.daysLeft != null && st.daysLeft >= 0 ? ` · ${st.daysLeft} ${st.daysLeft === 1 ? "day" : "days"} left` : ""}
            </p>
          </div>
          <DaysRing left={st.daysLeft} total={st.totalDays} size={72} frozen={!!st.frozenNow} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chipsFor(st).map((c) => (
            <Chip key={c.text} {...c} />
          ))}
        </div>
        {st.m.notes && <p className="rounded-lg bg-[var(--marigold-pale)] px-3 py-2 text-[14px]">Note: {st.m.notes}</p>}
        <div className={`grid gap-2 ${pinned ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-3"}`}>{buttons}</div>
        {mode === "demo" && (
          <a className="text-[14px] font-semibold underline" href={`/demo/m/${st.m.memberNo}`} target="_blank" rel="noreferrer">
            See {st.m.name.split(" ")[0]}&apos;s phone card
          </a>
        )}
      </div>
    </section>
  );
}

/** Every renewal, payment and freeze for one member, in plain words, newest first. */
function History({ snap, memberId }: { snap: Snapshot; memberId: string }) {
  const staff = new Map(snap.staff.map((s) => [s.id, s.name]));
  const plans = new Map(snap.plans.map((p) => [p.id, p]));
  const today = todayIST();
  const mode = (m: string) => (m === "cash" ? "cash" : m === "card" ? "card" : m.startsWith("upi") ? "UPI" : m);
  const lines: { at: string; text: string }[] = [];
  for (const p of snap.payments.filter((x) => x.memberId === memberId)) {
    const who = staff.get(p.receivedBy ?? "") ?? "the member";
    if (p.mode === "import") lines.push({ at: p.createdAt, text: p.amount < 0 ? `${rupees(-p.amount)} owed on the old sheet` : `${rupees(p.amount)} paid before Khatabar (from the old sheet)` });
    else if (p.reversesId) lines.push({ at: p.createdAt, text: `Payment of ${rupees(-p.amount)} undone · ${who}` });
    else if (p.state === "pending") lines.push({ at: p.createdAt, text: `Waiting for money: ${rupees(p.amount)} by UPI · ${who}` });
    else if (p.state === "rejected") lines.push({ at: p.createdAt, text: `${rupees(p.amount)} by UPI was not received` });
    else lines.push({ at: p.createdAt, text: `Paid ${rupees(p.amount)} by ${mode(p.mode)}${p.receiptNo ? ` · Receipt ${p.receiptNo}` : ""} · ${who}` });
  }
  for (const ms of snap.memberships.filter((x) => x.memberId === memberId && x.status === "active")) lines.push({ at: ms.createdAt, text: `${plans.get(ms.planId)?.nameEn ?? "Plan"} ${fmtSpan(ms.startDate, ms.baseEndDate)}` });
  for (const f of snap.freezes.filter((x) => x.memberId === memberId)) lines.push({ at: f.createdAt, text: `Freeze ${f.days} days, ${fmtSpan(f.fromDate, f.toDate)} (${f.reason}) · ${f.state === "requested" ? "waiting for approval" : f.state}` });
  lines.sort((a, b) => (a.at < b.at ? 1 : -1));
  return (
    <section className="panel-flat p-3" aria-label="History">
      <h3 className="mb-1 text-[15px] font-bold">History</h3>
      <ul className="flex flex-col">
        {lines.slice(0, 8).map((l, i) => (
          <li key={i} className="flex gap-3 border-b border-[var(--line)] py-1.5 text-[14px] last:border-0">
            <span className="t-mono w-[64px] shrink-0 text-[12px] text-[var(--muted-ink)]">{fmtDate(todayIST(Date.parse(l.at)), today)}</span>
            <span>{l.text}</span>
          </li>
        ))}
        {!lines.length && <li className="text-[14px] text-[var(--muted-ink)]">Nothing yet.</li>}
      </ul>
    </section>
  );
}

function TalkToThem({ items, onAct }: { items: ScanEvent[]; onAct: (e: ScanEvent, a: "open" | "credit" | "away" | "photo-ok" | "end-freeze") => void }) {
  return (
    <section className="rounded-2xl border-2 border-[var(--ink)] bg-[#fde2ea] p-3" aria-label="Talk to them" aria-live="polite">
      <h3 className="text-[15px] font-bold">Talk to them ({items.length})</h3>
      <ul className="mt-1 flex flex-col gap-2">
        {items.map((ev) => {
          const name = ev.st?.m.name ?? "Member";
          const text = ev.kind === "dues" ? `${name} is at the door and owes ${rupees(ev.st?.dues ?? 0)}` : ev.kind === "frozen" ? `${name} is frozen till ${fmtDay(ev.st?.frozenNow?.toDate)}` : ev.kind === "lapsed" ? `${name}'s membership ended${ev.st?.endDate ? ` on ${fmtDay(ev.st.endDate)}` : ""}` : `${name}: no signal on their phone. Check their photo.`;
          return (
            <li key={ev.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--paper)] px-3 py-2">
              <span className="min-w-[180px] flex-1 text-[15px] font-semibold">
                {text} <span className="t-mono text-[12px] text-[var(--muted-ink)]">{ev.time}</span>
              </span>
              {ev.kind === "photo" ? (
                <button type="button" className="btn btn-sm btn-success" onClick={() => onAct(ev, "photo-ok")}>
                  Looks right, check in
                </button>
              ) : ev.kind === "frozen" ? (
                <button type="button" className="btn btn-sm" onClick={() => onAct(ev, "end-freeze")}>
                  End freeze, check in
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => onAct(ev, "open")}>
                    Open
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => onAct(ev, "credit")}>
                    Let in on credit
                  </button>
                </>
              )}
              <button type="button" className="btn btn-sm" onClick={() => onAct(ev, "away")}>
                Dismiss
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SimulateScan({ d, onEvent, checkIn }: { d: MemberState[]; onEvent: (e: ScanEvent) => void; checkIn: ReturnType<typeof useCheckin>["checkIn"] }) {
  return (
    <button
      type="button"
      className="btn btn-sm self-start"
      onClick={() => {
        const pool = d.filter((x) => !x.visitsToday);
        const who = pool[Math.floor(Math.random() * Math.min(pool.length, 40))];
        if (who) onEvent(checkIn(who.m.id, "desk_scan"));
      }}
    >
      <Icon name="qr" size={16} /> Pretend a member scanned their card
    </button>
  );
}

function MemberSheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[55] lg:hidden">
      <div className="sheet-backdrop" onClick={onClose} />
      <div role="dialog" aria-modal="true" data-member-sheet aria-label={title} className="anim-sheet absolute inset-x-0 bottom-0 flex max-h-[90svh] flex-col rounded-t-3xl border-2 border-b-0 border-[var(--ink)] bg-[var(--cream)]">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="mx-auto h-1.5 w-12 rounded-full bg-[var(--ink)] opacity-30" aria-hidden />
        </div>
        <div className="flex justify-end px-4">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            <Icon name="close" size={16} /> Close
          </button>
        </div>
        <div className="scroll-thin flex flex-col gap-3 overflow-y-auto px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2">{children}</div>
      </div>
    </div>
  );
}

function PresentSheet({ snap, onClose, onPick }: { snap: Snapshot; onClose: () => void; onPick: (id: string) => void }) {
  const { today } = useGym();
  const names = new Map(snap.members.map((m) => [m.id, m]));
  const list = snap.checkins.filter((c) => c.istDate === today).sort((a, b) => (a.at < b.at ? 1 : -1));
  return (
    <Sheet title={`Checked in today (${list.length})`} sentence="Everyone who came in today, newest first." onClose={onClose}>
      <ul className="flex flex-col">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" className="flex min-h-12 w-full items-center gap-3 border-b border-[var(--line)] text-left" onClick={() => onPick(c.memberId)}>
              <span className="t-mono w-[76px] shrink-0 text-[14px]">{istClock(c.at)}</span>
              <span className="flex-1 font-semibold">{names.get(c.memberId)?.name}</span>
              <span className="text-[13px] text-[var(--muted-ink)]">{c.onCredit ? "on credit" : c.method === "self_geo" ? "by location" : c.method === "door" ? "at the door" : c.method === "photo_check" ? "photo check" : "at the desk"}</span>
            </button>
          </li>
        ))}
        {!list.length && <li className="py-4">Nobody has checked in yet today.</li>}
      </ul>
    </Sheet>
  );
}

function MoreSheet({ st, snap, onClose, onEdit }: { st: MemberState; snap: Snapshot; onClose: () => void; onEdit: () => void }) {
  const { mode, store } = useGym();
  const lastPaid = snap.payments.filter((p) => p.memberId === st.m.id && p.state === "confirmed" && p.amount > 0 && p.mode !== "import").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const cardHref = mode === "demo" ? `/demo/m/${st.m.memberNo}` : snap.links?.[st.m.id] ? `/m/${snap.links[st.m.id]}` : null;
  return (
    <Sheet title={`More for ${st.m.name}`} onClose={onClose}>
      <div className="grid gap-2">
        <button type="button" className="btn justify-start" onClick={onEdit}>
          <Icon name="user" size={18} /> Edit details
        </button>
        {cardHref ? (
          <a className="btn justify-start" href={cardHref} target="_blank" rel="noreferrer">
            <Icon name="card" size={18} /> Open the member&apos;s card
          </a>
        ) : (
          <p className="text-[14px] text-[var(--muted-ink)]">The member&apos;s card link appears after the next sync.</p>
        )}
        {lastPaid ? (
          <a className="btn justify-start" href={mode === "demo" ? `/demo/r/${lastPaid.id}${snap.branch.code === "LV" ? "?b=LV" : ""}` : `/r/${lastPaid.id}`} target="_blank" rel="noreferrer">
            <Icon name="print" size={18} /> Print the last receipt ({rupees(lastPaid.amount)})
          </a>
        ) : (
          <p className="text-[14px] text-[var(--muted-ink)]">No receipt yet: nothing has been paid.</p>
        )}
        <button
          type="button"
          className="btn justify-start"
          onClick={() => {
            const r = store.run("member.archive", { id: st.m.id });
            store.note(r.ok ? `${st.m.name} archived. Nothing was deleted.` : r.error ?? "Not saved", r.ok ? "ink" : "red");
            if (r.ok) onClose();
          }}
        >
          <Icon name="lock" size={18} /> Archive (owner or manager)
        </button>
      </div>
    </Sheet>
  );
}

function EditSheet({ st, onClose }: { st: MemberState; onClose: () => void }) {
  const { store } = useGym();
  const [name, setName] = useState(st.m.name);
  const [phone, setPhone] = useState(st.m.phone);
  const [notes, setNotes] = useState(st.m.notes);
  const [err, setErr] = useState("");
  return (
    <Sheet title="Edit details" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const r = store.run("member.update", { id: st.m.id, fields: { name, phone, notes } });
          if (!r.ok) return setErr(r.error ?? "Not saved");
          store.note("Saved.", "ink");
          onClose();
        }}
      >
        <label>
          <span className="label">Name</span>
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <span className="label">Phone number</span>
          <input className="input t-mono mt-1" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          <span className="label">Note for the desk</span>
          <textarea className="input mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {err && (
          <p role="alert" className="text-[14px] font-semibold text-[#9b0f3f]">
            {err}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">
            Save
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function EmptyGym({ onAdd, importHref }: { onAdd: () => void; importHref: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 px-4 py-10 text-center">
      <EmptyArt kind="desk" size={260} />
      <h2 className="t-display text-[26px]">Your front desk is empty.</h2>
      <p className="text-[16px]">Bring your members from Excel in a minute, or add the first one by hand.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <a href={importHref} className="btn btn-primary btn-lg">
          <Icon name="upload" size={18} /> Import members from Excel
        </a>
        <button type="button" className="btn btn-lg" onClick={onAdd}>
          <Icon name="plus" size={18} /> Add one member
        </button>
      </div>
    </div>
  );
}

function GettingStarted({ snap, base }: { snap: Snapshot; base: string }) {
  const key = `kb_gs_off_${snap.branch.id}`;
  const [off, setOff] = useState(true);
  useEffect(() => setOff(lsGet(key) === "1"), [key]);
  const imported = snap.members.filter((m) => !m.archivedAt).length > 0;
  const plans = snap.plans.some((p) => p.active && p.kind === "time");
  const renewed = snap.payments.some((p) => p.mode !== "import" && p.state === "confirmed" && !!p.receivedBy);
  if (off || (imported && plans && renewed)) return null;
  const steps: [boolean, string, string][] = [
    [imported, "Import members", `${base}/import`],
    [plans, "Check plans and prices", `${base}/settings`],
    [renewed, "Do your first renewal", `${base}/desk`],
  ];
  return (
    <section className="panel-flat flex flex-col gap-2 p-3" aria-label="Getting started">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-bold">Getting started</h3>
        <button type="button" className="btn btn-sm" onClick={() => (lsSet(key, "1"), setOff(true))}>
          Hide
        </button>
      </div>
      <ol className="flex flex-col gap-1">
        {steps.map(([done, label, href], i) => (
          <li key={label} className="flex items-center gap-2 text-[15px]">
            <span className="grid size-6 place-items-center rounded-full border-2 border-[var(--ink)] text-[12px]" style={{ background: done ? "var(--paan)" : "var(--paper)", color: done ? "#fff" : "var(--ink)" }}>
              {done ? <Icon name="tick" size={14} stroke={3} /> : i + 1}
            </span>
            <a href={href} className={done ? "line-through opacity-70" : "font-semibold underline"}>
              {label}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ErrorPanel() {
  const err = useGymState((s) => s.error);
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--cream)] p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <EmptyArt kind="desk" />
        <h1 className="t-display text-[28px]">The front desk did not open</h1>
        <p className="text-[16px]">{err}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    </div>
  );
}
