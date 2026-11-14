"use client";
// The Desk: a dense ruled register on the left, one card in the well, and the
// "Needs a word" pile on the right. Everything is reachable from the keyboard.
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChalkPath, Icon, Stamp } from "@/components/art";
import { ShutterDown, ShutterUp } from "@/components/art/Shutter";
import { MarginNotes, RegisterSkeleton, TopBar } from "@/components/shell/TopBar";
import { useDerived, useGym, useGymState, useSnap } from "@/components/shell/Gym";
import { message } from "@/components/shell/links";
import { DEMO_PINS } from "@/lib/core/demo-seed";
import { istClock } from "@/lib/core/dates";
import { rupees, uid } from "@/lib/core/money";
import { isRushHour } from "@/lib/core/state";
import { forceLite, toggleCalm } from "@/lib/client/fx";
import { lsGet, lsSet } from "@/lib/client/idb";
import { useCheckin, type ScanEvent } from "./checkin";
import { CounterStamp, type Landed, type WellApi } from "./CounterStamp";
import { DrawerTray, type DrawerFigures } from "./DrawerTray";
import { NewMember } from "./NewMember";
import { CameraStrip, KeyMap, MemberLedger, UpiMatch } from "./Panels";
import { Arrivals, NeedsAWord } from "./Pile";
import { Register, search, TodayPage } from "./Register";
import { useWhatsApp, WaProvider } from "./WaSheet";

type Overlay = null | "drawer" | "new" | "upi" | "keys";
type Undo = { kind: "pay"; l: Landed } | { kind: "checkin"; opId: string; at: number; name: string } | { kind: "close"; id: string; at: number };

const FILTERS = [
  { k: "all", en: "All" },
  { k: "today", en: "Ending today" },
  { k: "week", en: "This week" },
  { k: "dues", en: "Dues" },
  { k: "lapsed", en: "Lapsed" },
  { k: "frozen", en: "Frozen" },
] as const;

export function Desk() {
  return (
    <WaProvider>
      <DeskInner />
    </WaProvider>
  );
}

function DeskInner() {
  const { store, mode, base, t, calm, lang, today } = useGym();
  const status = useGymState((s) => s.status);
  const unsynced = useGymState((s) => s.unsynced);
  const actor = useGymState((s) => s.actor);
  const snap = useSnap();
  const d = useDerived();
  const router = useRouter();
  const params = useSearchParams();
  const wa = useWhatsApp();
  const { checkIn, scan } = useCheckin();

  const [raised, setRaised] = useState<boolean | null>(null);
  const [slateIn, setSlateIn] = useState(false);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [queue, setQueue] = useState(false);
  const [camera, setCamera] = useState(false);
  const [pile, setPile] = useState<ScanEvent[]>([]);
  const [pileFocus, setPileFocus] = useState(-1);
  const [flash, setFlash] = useState<ScanEvent | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [toast, setToast] = useState<null | { text: string; pay?: Landed }>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [closing, setClosing] = useState<null | { fig: DrawerFigures; stage: "matched" | "short" | "done"; closeId?: string }>(null);
  const [limit, setLimit] = useState(120);
  const searchRef = useRef<HTMLInputElement>(null);
  const well = useRef<WellApi>(null);
  const filter = (params.get("f") ?? "all") as (typeof FILTERS)[number]["k"];
  const branchId = snap?.branch.id ?? "";
  const shiftKey = `kb_shift_${branchId}`;
  const flagKey = `kb_shutter_${branchId}_${today}`;

  // Shutter Up once a day per branch per device
  useEffect(() => {
    if (status === "locked") return setRaised(false);
    if (!branchId) return;
    setRaised(lsGet(flagKey) === "1" && (mode === "demo" || status === "ready"));
  }, [branchId, flagKey, status, mode]);

  // 7 am Queue Mode switches itself on in the owner's rush hours
  useEffect(() => {
    if (snap && isRushHour(snap.branch.settings.rushHours) && lsGet(`kb_queue_off_${today}`) !== "1") setQueue(true);
  }, [snap?.branch.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    forceLite(queue);
    return () => forceLite(false);
  }, [queue]);

  // ?upi=1 opens the UPI strip (G then U from other screens)
  useEffect(() => {
    if (params.get("upi") === "1") setOverlay("upi");
    const m = params.get("m");
    if (m) setSel(m);
  }, [params]);

  const list = useMemo(() => {
    if (!d) return [];
    let l = d.list;
    if (filter === "today") l = l.filter((x) => x.endDate === today);
    else if (filter === "week") l = l.filter((x) => x.daysLeft != null && x.daysLeft >= 0 && x.daysLeft <= 7);
    else if (filter === "dues") l = l.filter((x) => x.dues > 0);
    else if (filter === "lapsed") l = l.filter((x) => x.status === "lapsed");
    else if (filter === "frozen") l = l.filter((x) => !!x.frozenNow);
    return search(l, q);
  }, [d, q, filter, today]);
  const st = sel && d ? d.byId.get(sel) ?? null : null;

  const staffName = snap?.staff.find((s) => s.id === actor.staffId)?.name ?? "Desk";

  const handleEvent = useCallback((ev: ScanEvent) => {
    if (ev.kind === "ok") {
      setFlash(ev);
      setUndo({ kind: "checkin", opId: "", at: Date.now(), name: ev.st?.m.name ?? "" });
    } else if (["dues", "frozen", "lapsed", "photo"].includes(ev.kind)) setPile((p) => [ev, ...p.filter((x) => x.st?.m.id !== ev.st?.m.id)].slice(0, 30));
    else store.note(ev.text, ev.kind === "already" ? "ink" : "red");
  }, [store]);

  const onScan = useCallback(async (code: string) => handleEvent(await scan(code, "desk_scan")), [scan, handleEvent]);

  // USB scanners type like a keyboard: KB1. arriving within 50 ms is a scan, not search text
  useEffect(() => {
    let buf = "";
    let lastAt = 0;
    let fast = true;
    const on = (e: KeyboardEvent) => {
      const now = performance.now();
      if (e.key.length === 1) {
        if (now - lastAt > 50) {
          buf = "";
          fast = true;
        }
        buf += e.key;
        lastAt = now;
        if (buf.startsWith("KB1.") && fast) {
          // keep scan text out of whatever field has focus
          e.preventDefault();
          e.stopPropagation();
        }
      } else if (e.key === "Enter" && buf.startsWith("KB1.") && now - lastAt < 80) {
        e.preventDefault();
        e.stopPropagation();
        const code = buf;
        buf = "";
        const inp = searchRef.current;
        if (inp && inp.value.includes("KB")) setQ((v) => v.replace(/K?B?1?\.?$/, ""));
        void onScan(code);
      }
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, [onScan]);

  // demo: a member card in another tab can "scan" at this desk
  useEffect(() => {
    if (mode !== "demo" || typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("kb-demo");
    ch.onmessage = (m) => m.data?.type === "scan" && void onScan(m.data.code);
    return () => ch.close();
  }, [mode, onScan]);

  const pick = useCallback((id: string) => {
    setSel(id);
  }, []);

  const doUndo = useCallback(() => {
    if (!undo) return;
    const age = Date.now() - (undo.kind === "pay" ? undo.l.at : undo.at);
    if (undo.kind === "pay") {
      if (age > 8000) return store.note("Past 8 seconds. Use a logged reversal with a manager PIN.");
      if (store.dropUnsynced(undo.l.opId)) store.note("Stamp lifted. Nothing was saved.", "ink");
      else {
        for (const id of undo.l.paymentIds) {
          const r = store.run("payment.reverse", { id, reversalId: uid(), undo: true });
          if (!r.ok) return store.note(r.error ?? "Could not reverse");
        }
        store.note("Stamp lifted. A reversal line was written.", "ink");
      }
      setToast(null);
      setFresh(null);
    } else if (undo.kind === "checkin") {
      if (age > 10000) return;
      store.note("Check-ins are kept as written. Duplicates in the same hour count once.", "ink");
    } else if (undo.kind === "close") {
      if (age > 10000) return store.note("Only an owner can reopen now.");
      const r = store.run("close.reopen", { id: undo.id });
      if (!r.ok) return store.note(r.error ?? "Not reopened");
      setClosing(null);
      store.note("Shift reopened.", "ink");
    }
    setUndo(null);
  }, [undo, store]);

  // the desk keyboard
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (raised === false || overlay || closing) return;
      const el = e.target as HTMLElement;
      const inField = !!el.closest("input,textarea,select");
      const inSearch = el === searchRef.current;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        return doUndo();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        return setOverlay("drawer");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        return searchRef.current?.focus();
      }
      if (e.key === "M" && e.shiftKey && !inField) return toggleCalm();
      // the well gets first say when a card is lifted
      if (st && well.current && !inSearch && well.current.key(e)) return;
      if (inSearch) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setFocus((f) => Math.min(list.length - 1, f + 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setFocus((f) => Math.max(0, f - 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          const hit = list[focus];
          if (hit) {
            pick(hit.m.id);
            searchRef.current?.blur();
          }
        } else if (e.key === "Escape") {
          if (q) setQ("");
          else searchRef.current?.blur();
        }
        return;
      }
      if (inField) return;
      if (pileFocus >= 0 && pile[pileFocus]) {
        const ev = pile[pileFocus];
        if (e.key === "Enter") return pileAct(ev, ev.kind === "photo" ? "photo-ok" : "open");
        if (e.key === "l" || e.key === "L") return pileAct(ev, "credit");
        if (e.key === "x" || e.key === "X") return pileAct(ev, "away");
      }
      switch (e.key) {
        case "/":
          e.preventDefault();
          searchRef.current?.focus();
          searchRef.current?.select();
          return;
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setFocus((f) => Math.min(list.length - 1, f + 1));
          return;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setFocus((f) => Math.max(0, f - 1));
          return;
        case "Enter":
          if (list[focus]) pick(list[focus].m.id);
          return;
        case "Escape":
          if (camera) setCamera(false);
          else if (sel) setSel(null);
          else setPileFocus(-1);
          return;
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
          setTimeout(() => searchRef.current?.focus(), 30);
          return;
        case "c":
        case "C":
          if (!st) setCamera((v) => !v);
          return;
        case "?":
          return setOverlay("keys");
        case "Tab":
          if (pile.length && !e.shiftKey && document.activeElement === document.body) {
            e.preventDefault();
            setPileFocus((p) => (p + 1) % pile.length);
          }
          return;
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  const pileAct = (ev: ScanEvent, a: "open" | "credit" | "away" | "photo-ok" | "end-freeze") => {
    const id = ev.st?.m.id;
    if (!id) return;
    const drop = () => {
      setPile((p) => p.filter((x) => x.id !== ev.id));
      setPileFocus(-1);
    };
    if (a === "open") {
      drop();
      pick(id);
      setTimeout(() => well.current?.openRenew(), 380);
    } else if (a === "credit") {
      const r = checkIn(id, "desk_manual", { force: true, onCredit: true });
      if (r.kind === "ok") {
        drop();
        handleEvent({ ...r, text: `On credit, by ${staffName}` });
      } else store.note(r.text);
    } else if (a === "photo-ok") {
      const r = checkIn(id, "photo_check");
      drop();
      handleEvent(r);
    } else if (a === "end-freeze") {
      const f = ev.st?.frozenNow;
      if (!f) return;
      const r = store.run("freeze.end", { id: f.id });
      if (!r.ok) return store.note(r.error ?? "Not saved");
      if (r.note) store.note(r.note, "ink");
      drop();
      handleEvent(checkIn(id, "desk_manual"));
    } else {
      drop();
      store.note(`${ev.st?.m.name} turned away at ${istClock(Date.now())} by ${staffName}.`, "ink");
    }
  };

  const wellBox = useRef<HTMLDivElement>(null);
  const [flyFrom, setFlyFrom] = useState<DOMRect | null>(null);
  const onLanded = (l: Landed) => {
    setFlyFrom(calm ? null : wellBox.current?.getBoundingClientRect() ?? null);
    setQ("");
    if (filter !== "all") router.replace("?", { scroll: false });
    setFresh(l.paymentIds[0] ?? null);
    setUndo({ kind: "pay", l });
    setToast({ text: `${rupees(l.amount)} written in today's page.`, pay: l });
    setTimeout(() => setToast((t0) => (t0?.pay === l ? null : t0)), 8000);
  };

  // W on the toast sends the receipt; Esc skips
  useEffect(() => {
    if (!toast?.pay) return;
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea")) return;
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        e.stopImmediatePropagation();
        sendReceipt(toast.pay!);
      } else if (e.key === "Escape") setToast(null);
    };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  });

  const sendReceipt = (l: Landed) => {
    if (!snap || !d) return;
    const s2 = d.byId.get(l.memberId);
    if (!s2) return;
    const text = message(snap, mode, s2, "receipt", lang, staffName, { amount: l.amount, paymentId: l.paymentIds[0], planName: l.planName, expiry: l.newEnd ?? s2.endDate });
    try {
      const sent = JSON.parse(lsGet("kb_receipts_sent") ?? "[]") as string[];
      lsSet("kb_receipts_sent", JSON.stringify([...sent, ...l.paymentIds].slice(-400)));
    } catch {}
    wa({ phone: s2.m.phone, text, to: s2.m.name });
    setToast(null);
  };

  const raise = async (pin: string): Promise<boolean | string> => {
    if (mode === "demo") {
      const hit = Object.entries(DEMO_PINS).find(([, p]) => p === pin);
      if (!hit) return false;
      const role = snap?.staff.find((s) => s.id === hit[0])?.role ?? "desk";
      store.setActor({ staffId: hit[0], role });
      return true;
    }
    const res = await fetch("/api/pin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branchId: branchIdFromBase(base), pin }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return body.error ?? false;
    await store.init();
    if (store.state.status !== "ready") return "Could not open the register";
    return true;
  };

  const opened = () => {
    lsSet(flagKey, "1");
    if (!lsGet(shiftKey) || (snap?.closes.some((c) => c.shiftEnd > (lsGet(shiftKey) ?? "")) ?? false)) lsSet(shiftKey, new Date().toISOString());
    setRaised(true);
    setTimeout(() => searchRef.current?.focus(), 20);
  };

  const finishClose = (fig: DrawerFigures, reason: string, pin: string) => {
    if (fig.counted !== fig.expected) {
      if (reason.trim().length < 8) return "Write a reason of at least 8 characters";
      if (mode === "demo" && DEMO_PINS[actor.staffId ?? ""] !== pin) return "That PIN is not yours";
    }
    const id = uid();
    const r = store.run("close.save", { id, counts: fig.counts, counted: fig.counted, expected: fig.expected, upiTotal: fig.upi, shiftStart: lsGet(shiftKey) ?? undefined, reason, pin });
    if (!r.ok) return r.error ?? "Not saved";
    setClosing({ fig, stage: "done", closeId: id });
    setUndo({ kind: "close", id, at: Date.now() });
    lsSet(shiftKey, "");
    return null;
  };

  const shiftSince = (snap && lsGet(shiftKey)) || `${today}T00:00:00+05:30`;
  const arrivals: ScanEvent[] = useMemo(() => {
    if (!snap || !d) return [];
    return snap.checkins
      .filter((c) => c.istDate === today)
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 8)
      .map((c) => ({ id: c.id, kind: "ok" as const, st: d.byId.get(c.memberId), time: istClock(c.at), text: c.onCredit ? "On credit" : c.method === "self_geo" ? "Self, by location" : c.method === "photo_check" ? "Photo check" : "Present" }));
  }, [snap, d, today]);
  const inToday = snap ? snap.checkins.filter((c) => c.istDate === today).length : 0;

  if (status === "error") return <ErrorSlate />;

  return (
    <LayoutGroup>
      <div className="floor flex min-h-dvh flex-col">
        <div className="dust-frame fx-off" />
        <TopBar
          right={
            <>
              <button type="button" className="btn-iron !min-h-8" aria-pressed={queue} onClick={() => setQueue((v) => !v)} title="Queue Mode (Q)">
                {t.queue}
              </button>
              <button type="button" className="btn-iron !min-h-8" onClick={() => setOverlay("upi")} title="UPI to match (G U)">
                UPI {snap ? `(${snap.payments.filter((p) => p.state === "pending").length})` : ""}
              </button>
              <button type="button" className="btn-iron !min-h-8" onClick={() => setOverlay("drawer")} title="Ctrl+Shift+D">
                {t.closeShift}
              </button>
              <button type="button" className="btn-iron !min-h-8" onClick={() => setOverlay("keys")} aria-label="Keyboard map">
                ?
              </button>
            </>
          }
        />
        <div className="knurl-strip" />
        {status === "loading" || !snap || !d ? (
          <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_440px]">
            <RegisterSkeleton />
            <div className="hidden p-6 lg:block">
              <div className="pvc w-full opacity-30" style={{ aspectRatio: "3.375/2.125", borderRadius: "3.2%/5%" }} />
            </div>
          </div>
        ) : (
          <motion.div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_460px_280px]" initial={false} animate={{ opacity: raised === false && !slateIn ? 0.6 : 1 }} transition={{ duration: 0.3 }}>
            {/* the register */}
            <section className="ledger holes relative flex min-h-[60vh] flex-col lg:max-h-[calc(100dvh-64px)]" aria-label={t.register}>
              <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 pb-1 pl-[72px] pr-3 pt-2" style={{ background: "var(--ledger)" }}>
                <label className="relative flex min-w-[220px] flex-1 items-center">
                  <span className="sr-only">{t.searchPh}</span>
                  <input
                    ref={searchRef}
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value.replace(/^\//, ""));
                      setFocus(0);
                    }}
                    placeholder={`/  ${t.searchPh}`}
                    className="field h-10 text-[16px]"
                    inputMode="search"
                    autoComplete="off"
                    aria-controls="kb-register"
                  />
                  {queue && <span className="t-teko absolute right-1 text-[14px]" style={{ color: "var(--margin-red)" }}>QUEUE · scans land here</span>}
                </label>
                {!queue && (
                  <div className="flex flex-wrap gap-1" role="group" aria-label="Filters">
                    {FILTERS.map((f) => (
                      <button
                        key={f.k}
                        type="button"
                        aria-pressed={filter === f.k}
                        className="t-teko h-8 px-2 text-[15px]"
                        style={{ color: filter === f.k ? "var(--chalk)" : "var(--ink)", background: filter === f.k ? "var(--ink)" : "transparent", borderLeft: "4px solid", borderImage: "repeating-linear-gradient(45deg,var(--knurl) 0 1px,transparent 1px 3px) 4" }}
                        onClick={() => {
                          const u = new URLSearchParams(params.toString());
                          if (f.k === "all") u.delete("f");
                          else u.set("f", f.k);
                          router.replace(`?${u.toString()}`, { scroll: false });
                          setFocus(0);
                        }}
                      >
                        {f.en}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!q && !queue && filter === "all" && (
                <div className="pb-1">
                  <div className="t-teko flex h-8 items-center pl-[72px] text-[16px]" style={{ color: "var(--margin-red)" }}>
                    <span lang="hi">आज</span>&nbsp;· Today&apos;s page
                  </div>
                  <TodayPage snap={snap} unsynced={unsynced} fresh={fresh} from={flyFrom} />
                </div>
              )}
              <div className="t-teko grid h-8 items-center gap-2 pr-3 text-[14px] max-[640px]:hidden" style={{ gridTemplateColumns: queue ? "40px 76px 1fr 110px 96px" : "64px 70px minmax(110px,1.3fr) 110px minmax(70px,.8fr) 64px 80px", color: "var(--carbon)" }}>
                <span />
                <span>No.</span>
                <span>Name</span>
                <span>Phone</span>
                {!queue && (
                  <>
                    <span>Plan</span>
                    <span>Ends</span>
                  </>
                )}
                <span className="text-right">
                  <span lang="hi">बाकी</span> / state
                </span>
              </div>
              <div id="kb-register" className="scroll-thin min-h-0 flex-1 overflow-y-auto">
                <Register list={list} q={q} focus={focus} selected={sel} onPick={pick} onFocus={setFocus} unsynced={unsynced} snap={snap} dense={queue} limit={limit} />
                {list.length > limit && (
                  <button type="button" className="btn-ink my-2 ml-[72px]" onClick={() => setLimit((l) => l + 200)}>
                    Show {Math.min(200, list.length - limit)} more of {list.length}
                  </button>
                )}
              </div>
            </section>

            {/* the card well */}
            {!queue && (
              <section className="relative flex flex-col gap-3 p-4 lg:max-h-[calc(100dvh-64px)] lg:overflow-y-auto scroll-thin" aria-label="Card well">
                {camera && <CameraStrip onCode={(c) => void onScan(c)} onClose={() => setCamera(false)} />}
                {st ? (
                  <>
                    <div ref={wellBox}>
                    <CounterStamp
                      ref={well}
                      st={st}
                      snap={snap}
                      landing={null}
                      onLanded={onLanded}
                      onCheckin={() => handleEvent(checkIn(st.m.id, "desk_manual"))}
                      onFreeze={() => router.push(`${base}/board?m=${st.m.id}${snap.branch.code === "LV" && mode === "demo" ? "&b=LV" : ""}`)}
                      onWhatsApp={(pid) => {
                        if (pid && undo?.kind === "pay") return sendReceipt(undo.l);
                        wa({ phone: st.m.phone, text: message(snap, mode, st, st.dues > 0 ? "dues" : st.status === "lapsed" ? "post3" : "pre7", lang, staffName), to: st.m.name });
                      }}
                      onRelink={async () => {
                        if (mode === "demo") return store.note("Demo cards keep one link. In a real gym Shift+L cancels the old link and issues a new one.", "ink");
                        const r = await fetch(`/api/b/${snap.branch.id}/relink`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId: st.m.id }) });
                        if (r.ok) {
                          await store.refresh();
                          store.note("Old card link cancelled. New link ready to send.", "ink");
                        } else store.note("Could not issue a new link");
                      }}
                    />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        ["R", "Renew", () => well.current?.key(new KeyboardEvent("keydown", { key: "r" }))],
                        ["C", t.checkIn, () => handleEvent(checkIn(st.m.id, "desk_manual"))],
                        ["F", t.freeze, () => router.push(`${base}/board?m=${st.m.id}`)],
                        ["W", "WhatsApp", () => well.current?.key(new KeyboardEvent("keydown", { key: "w" }))],
                      ].map(([k, label, f]) => (
                        <button key={k as string} type="button" className="btn-iron !min-h-9" onClick={f as () => void}>
                          <span className="kbd">{k as string}</span> {label as string}
                        </button>
                      ))}
                      <a className="btn-iron !min-h-9" href={mode === "demo" ? `/demo/m/${st.m.memberNo}` : snap.links?.[st.m.id] ? `/m/${snap.links[st.m.id]}` : "#"} target="_blank" rel="noreferrer">
                        See it as a member
                      </a>
                      {st.dues > 0 && (
                        <span className="t-teko self-center text-[14px]" style={{ color: "var(--hazard)" }}>
                          P / Shift+P takes {rupees(st.dues)} dues
                        </span>
                      )}
                    </div>
                    <MemberLedger snap={snap} memberId={st.m.id} />
                  </>
                ) : (
                  <EmptyWell />
                )}
              </section>
            )}

            {/* attendance and the pile */}
            <aside className="iron flex min-h-[240px] flex-col lg:col-span-2 xl:col-span-1 xl:max-h-[calc(100dvh-64px)]" style={{ clipPath: "none", borderWidth: "0 0 0 2px" }} aria-label="Check-ins">
              <div className="flex items-center justify-between px-3 pt-2">
                <button type="button" className="btn-iron !min-h-8" onClick={() => setCamera((v) => !v)}>
                  <Icon name="scanner" size={16} /> Camera (C)
                </button>
                {mode === "demo" && (
                  <button
                    type="button"
                    className="btn-iron !min-h-8"
                    onClick={() => {
                      const pool = d.list.filter((x) => !x.visitsToday);
                      const who = pool[Math.floor(Math.random() * Math.min(pool.length, 40))];
                      if (who) handleEvent(checkIn(who.m.id, "desk_scan"));
                    }}
                    title="Pretend a member scanned their card"
                  >
                    Simulate scan
                  </button>
                )}
              </div>
              {queue && camera && <div className="px-3 pt-2"><CameraStrip onCode={(c) => void onScan(c)} onClose={() => setCamera(false)} /></div>}
              <Arrivals items={arrivals} count={inToday} />
              <div className="knurl-strip mx-3" />
              <NeedsAWord items={pile} focus={pileFocus} onAct={pileAct} />
            </aside>
          </motion.div>
        )}

        {/* check-in flash: the handwritten line, never blocking */}
        <AnimatePresence>
          {flash && (
            <motion.div key={flash.id} className="pointer-events-none fixed right-6 top-20 z-50" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} onAnimationComplete={() => setTimeout(() => setFlash((f) => (f?.id === flash.id ? null : f)), 1600)}>
              <div className="ledger-plain px-4 py-2 t-hand text-[20px]" style={{ color: "var(--ink)", boxShadow: "0 8px 20px -10px #000" }}>
                <span lang="hi">हाज़िरी लगी</span> · {flash.st?.m.name} · {flash.time}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <div className="iron flex flex-wrap items-center gap-3 px-4 py-2">
                <span className="t-teko text-[17px]">{toast.text}</span>
                {toast.pay && (
                  <button type="button" className="btn-brass !min-h-8" onClick={() => sendReceipt(toast.pay!)}>
                    <Icon name="bubble" size={16} /> Receipt (W)
                  </button>
                )}
                <span className="t-teko text-[14px] muted">Esc skip · Ctrl+Z undo 8 s</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <MarginNotes />

        {overlay === "keys" && <KeyMap onClose={() => setOverlay(null)} />}
        {overlay === "upi" && snap && <UpiMatch snap={snap} onClose={() => setOverlay(null)} />}
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
              setTimeout(() => well.current?.openRenew(), 420);
            }}
          />
        )}
        {overlay === "drawer" && snap && (
          <DrawerTray
            snap={snap}
            staffId={actor.staffId}
            since={shiftSince}
            onCancel={() => setOverlay(null)}
            onCount={(fig) => {
              setOverlay(null);
              if (fig.counted === fig.expected) {
                const err = finishClose(fig, "", "");
                if (err) store.note(err);
              } else setClosing({ fig, stage: "short" });
            }}
          />
        )}
        {closing && <CloseShutter closing={closing} calm={calm} onSign={finishClose} onCancel={() => setClosing(null)} undoAt={undo?.kind === "close" ? undo.at : 0} onReopen={doUndo} onNewShift={() => {
          setClosing(null);
          setRaised(false);
          try {
            localStorage.removeItem(flagKey);
          } catch {}
        }} />}

        {raised === false && (snap || status === "locked") && (
          <ShutterUp
            gym={snap?.org.name ?? "Khatabar"}
            branch={snap?.branch.name ?? "Desk"}
            calm={calm}
            pin={mode === "live" ? raise : undefined}
            hint={mode === "demo" ? <>Space, a scroll or a swipe raises it. In the demo you are Ravi at the desk; the manager PIN is 4321.</> : <>Only a staff PIN raises the shutter</>}
            onAct={(a) => a === "slate" && setSlateIn(true)}
            onOpen={opened}
          />
        )}
        {status === "locked" && !snap && <LockedSlate base={base} />}
      </div>
    </LayoutGroup>
  );
}

function branchIdFromBase(base: string) {
  return base.split("/")[2] ?? "";
}

function EmptyWell() {
  const { t } = useGym();
  return (
    <div className="relative grid place-items-center" style={{ aspectRatio: "3.375 / 2.125" }}>
      <svg viewBox="0 0 340 214" className="absolute inset-0 h-full w-full" aria-hidden>
        <ChalkPath d="M14 20 Q170 6 326 18 Q334 107 324 196 Q170 208 16 198 Q6 107 14 20" width={2} color="var(--chalk-dust)" duration={0.8} />
        <ChalkPath d="M150 22 L190 22" width={3} color="var(--chalk-dust)" delay={0.6} />
      </svg>
      <div className="relative px-8 text-center">
        <p className="t-hand text-[22px] chalk-text">Lift a card.</p>
        <p className="t-hand text-[17px]" style={{ color: "var(--chalk-dust)" }}>
          Press <span className="kbd">/</span> and type the last 4 digits, or scan their QR. <span className="kbd">N</span> {t.newMember.toLowerCase()}.
        </p>
      </div>
    </div>
  );
}

function CloseShutter({ closing, calm, onSign, onCancel, undoAt, onReopen, onNewShift }: { closing: { fig: DrawerFigures; stage: "matched" | "short" | "done"; closeId?: string }; calm: boolean; onSign: (f: DrawerFigures, reason: string, pin: string) => string | null; onCancel: () => void; undoAt: number; onReopen: () => void; onNewShift: () => void }) {
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [left, setLeft] = useState(10);
  const short = closing.fig.expected - closing.fig.counted;
  useEffect(() => {
    if (closing.stage !== "done") return;
    const id = setInterval(() => setLeft(Math.max(0, 10 - Math.floor((Date.now() - undoAt) / 1000))), 250);
    return () => clearInterval(id);
  }, [closing.stage, undoAt]);
  if (closing.stage === "done")
    return (
      <ShutterDown stopAt={1} calm={calm}>
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-4">
            <Stamp kind="closed" word="CLOSED" sub={istClock(Date.now())} seed={closing.closeId ?? "c"} size={1.6} />
            {short !== 0 && <span className="t-hand text-[18px]" style={{ color: "var(--iron-rim)" }}>Signed with a reason. The owner sees it on tomorrow&apos;s slate.</span>}
            {left > 0 ? (
              <button type="button" className="steel-tag !text-[16px]" onClick={onReopen}>
                Closed. Reopen (Ctrl+Z) {left}s
              </button>
            ) : (
              <button type="button" className="btn-brass" onClick={onNewShift}>
                Raise shutter for the next shift
              </button>
            )}
          </div>
        </div>
      </ShutterDown>
    );
  return (
    <ShutterDown stopAt={0.6} calm={calm}>
      <div className="absolute inset-x-0 bottom-0 top-[60%] flex items-center justify-center overflow-y-auto p-3">
        <form
          className="ledger-plain w-full max-w-[620px] px-5 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            const r = onSign(closing.fig, reason, pin);
            if (r) setErr(r);
          }}
        >
          <p className="t-hand text-[19px]" style={{ color: "var(--margin-red)" }}>
            Drawer is {short > 0 ? `${rupees(short)} short` : `${rupees(-short)} over`}: counted {rupees(closing.fig.counted)}, expected {rupees(closing.fig.expected)}.
          </p>
          {closing.fig.suspects.length > 0 ? (
            <ul className="t-hand mt-1 text-[15px]" style={{ color: "var(--margin-red)" }}>
              {closing.fig.suspects.slice(0, 5).map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          ) : (
            <p className="t-hand text-[15px]" style={{ color: "var(--margin-red)" }}>No unconfirmed UPI, reversals or unsent receipts this shift. Count once more?</p>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px]">
            <input autoFocus className="field !font-[family-name:var(--font-hand)] !text-[17px]" placeholder="What happened (at least 8 letters)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" />
            <input className="field" type="password" inputMode="numeric" maxLength={4} placeholder="Your PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} aria-label="Your PIN" />
          </div>
          {err && <p className="t-hand text-[15px]" style={{ color: "var(--margin-red)" }}>{err}</p>}
          <div className="mt-2 flex gap-2">
            <button type="submit" className="btn-brass">
              Sign and close
            </button>
            <button type="button" className="btn-ink" onClick={onCancel}>
              Count again
            </button>
          </div>
        </form>
      </div>
    </ShutterDown>
  );
}

function ErrorSlate() {
  const err = useGymState((s) => s.error);
  return (
    <div className="floor grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="t-stencil text-[40px]" style={{ color: "var(--brass)" }}>
          The register did not open
        </p>
        <p className="t-hand mt-2 text-[18px]">{err}</p>
        <button type="button" className="btn-brass mt-4" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    </div>
  );
}

function LockedSlate({ base }: { base: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[85] p-3 text-center">
      <a className="t-teko text-[15px] underline" style={{ color: "var(--iron-rim)" }} href={`/login?next=${encodeURIComponent(base + "/desk")}`}>
        Not paired? Owner login
      </a>
    </div>
  );
}
