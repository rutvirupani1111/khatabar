"use client";
// Bahi Import: the gym's own sheet in, matched to our fields with chalk lines
// that write themselves. Parsed in the browser; nothing leaves the device until
// the person confirms. Importing never sends a single message.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChalkPath, SPRING } from "@/components/art";
import { MarginNotes, TopBar } from "@/components/shell/TopBar";
import { useGym, useSnap } from "@/components/shell/Gym";
import { ambiguous, FIELDS, guessMapping, headerRowOf, inferOrder, parseRows, type FieldKey, type ParsedRow } from "@/lib/core/importer";
import { fmtDate, fmtDay, todayIST } from "@/lib/core/dates";
import { rupees, uid } from "@/lib/core/money";
import type { ImportRec } from "@/lib/core/types";

const SAMPLE = `Sr no\tnaam\tmob no\tPackage\tDOJ\tvalid till\tfees\tbaki\tremark
1\tRamesh Pandya\t+91 90000 01101\t3 month\t02/09/26\t01/12/26\t3200\t0\tmorning batch
2\tSunita Rao\t090000-01102\tMonthly\t15-Oct-26\t14-Nov-26\t1200\t200\t
3\tFarooq Sheikh\t9000001103\tyearly\t1 जनवरी 26\t31 दिसंबर 26\t9999\t0\tknee issue
4\tPinky Shah\t900000110\tmonthly\t20/10/26\t19/11/26\t1200\t0\twrong number?
5\tVijay Kumar\t9000001105\t\t05.08.26\t04.11.26\t3200\t0\t
6\tSunita Rao\t9000001102\tMonthly\t15-Oct-26\t14-Nov-26\t1200\t200\tsame person twice
7\tAarti Joshi\t9000001107\tHalf yearly\t01/06/26\t30/11/26\t5800\t800\t
8\tDev Patel\t9000001108\tmonthly\t25/10/26\t24/10/26\t1200\t0\texpiry typo
9\tMeena Iyer\t9000001109\tQuarterly\t10 Sep 26\t9 Dec 26\t3200\tabc\t
10\tKaran Gill\t+919000001110\tmonthly\t01/11/26\t30/11/26\t1200\t0\t`;

type Step = "load" | "map" | "check" | "saving" | "done";

export function Importer() {
  const { store, mode, base, calm } = useGym();
  const snap = useSnap();
  const [step, setStep] = useState<Step>("load");
  const [fileName, setFileName] = useState("");
  // the whole sheet as read; the header row is chosen inside it (title lines above it are skipped)
  const [raw, setRaw] = useState<unknown[][]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const headers = useMemo(() => (raw[headerRow] ?? []).map((x) => String(x ?? "").trim()), [raw, headerRow]);
  const rows = useMemo(() => raw.slice(headerRow + 1), [raw, headerRow]);
  const [failed, setFailed] = useState(0);
  const [map, setMap] = useState<Record<number, FieldKey | null>>({});
  const [order, setOrder] = useState<"dmy" | "mdy" | null>(null);
  const [focusCol, setFocusCol] = useState(0);
  const [edits, setEdits] = useState<Record<number, { phone?: string; skip?: boolean }>>({});
  const [progress, setProgress] = useState(0);
  const [importId, setImportId] = useState("");
  const [err, setErr] = useState("");
  const [paste, setPaste] = useState("");

  const load = (all: unknown[][], name: string) => {
    const hr = headerRowOf(all);
    setRaw(all);
    setHeaderRow(hr);
    setFileName(name);
    setMap(guessMapping((all[hr] ?? []).map((x) => String(x ?? ""))));
    setOrder(null);
    setStep("map");
    setErr("");
  };
  const moveHeader = (to: number) => {
    const hr = Math.max(0, Math.min(Math.min(9, raw.length - 2), to));
    setHeaderRow(hr);
    setMap(guessMapping((raw[hr] ?? []).map((x) => String(x ?? ""))));
    setOrder(null);
  };

  const onFile = async (f: File) => {
    try {
      if (/\.csv$/i.test(f.name)) {
        const Papa = (await import("papaparse")).default;
        const res = Papa.parse<string[]>(await f.text(), { skipEmptyLines: true });
        load(res.data, f.name);
      } else {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await f.arrayBuffer(), { cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });
        load(data, f.name);
      }
    } catch {
      setErr("Could not read that file. Try saving it as .xlsx or .csv, or paste the rows.");
    }
  };
  const onPaste = (text: string, name = "pasted from a sheet") => {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (lines.length < 2) return setErr("Paste the header row and at least one member row.");
    const split = (l: string) => (l.includes("\t") ? l.split("\t") : l.split(","));
    load(lines.map(split), name);
  };

  const existing = useMemo(() => new Set((snap?.members ?? []).filter((m) => !m.archivedAt).map((m) => m.phone)), [snap]);
  const dateCols = Object.entries(map).filter(([, v]) => v === "start" || v === "end" || v === "dob").map(([k]) => Number(k));
  // one unambiguous date anywhere (30/11/2026) settles the order for every date column
  const inferred = useMemo(() => inferOrder(rows, dateCols), [rows, dateCols.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const useOrder = order ?? inferred.order ?? "dmy";
  const needsOrder = order == null && inferred.order == null && dateCols.some((c) => ambiguous(rows.map((r) => r[c])));
  const parsed: ParsedRow[] = useMemo(() => (snap ? parseRows(rows, map, snap.plans, useOrder, existing) : []), [rows, map, snap, useOrder, existing]);
  const fixed = parsed.map((r) => {
    const e = edits[r.i];
    if (!e?.phone) return r;
    const again = parseRows([rows[r.i]].map((x) => x.map((v, ci) => (map[ci] === "phone" ? e.phone : v))), map, snap!.plans, useOrder, existing)[0];
    return { ...again, i: r.i };
  });
  const usable = fixed.filter((r) => !edits[r.i]?.skip && r.dupOf == null && !r.problems.length);
  const needFix = fixed.filter((r) => !edits[r.i]?.skip && r.problems.length);
  const dups = fixed.filter((r) => r.dupOf != null);

  // keyboard: focus a column and press the field's number to re-match it
  useEffect(() => {
    if (step !== "map") return;
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea")) return;
      if (e.key === "ArrowDown" || e.key === "j") setFocusCol((c) => Math.min(headers.length - 1, c + 1));
      else if (e.key === "ArrowUp" || e.key === "k") setFocusCol((c) => Math.max(0, c - 1));
      else if (/^[0-9]$/.test(e.key) || e.key === "-") {
        const idx = e.key === "0" ? 9 : e.key === "-" ? 10 : Number(e.key) - 1;
        const k = FIELDS[idx]?.k ?? null;
        setMap((m) => ({ ...Object.fromEntries(Object.entries(m).map(([c, v]) => [c, v === k ? null : v])), [focusCol]: k }));
      } else if (e.key === "Backspace") setMap((m) => ({ ...m, [focusCol]: null }));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [step, headers.length, focusCol]);

  const confirm = async () => {
    if (!snap) return;
    const id = uid();
    setImportId(id);
    setStep("saving");
    setProgress(0);
    if (mode === "demo") {
      // one op files the whole batch with the same rules the server's import route uses
      const res = store.run("import.rows", { importId: id, fileName, rows: usable.map((r) => ({ memberId: uid(), membershipId: uid(), paymentId: uid(), name: r.name, phone: r.phone!, planId: r.plan?.id ?? null, start: r.start, end: r.end, paid: r.paid ?? 0, due: r.due ?? 0, notes: r.notes, gender: r.gender, dob: r.dob })) });
      const n = res.ok ? usable.length : 0;
      if (!res.ok) setErr(res.error ?? "Nothing was filed");
      setFailed(usable.length - n);
      // the cards fan into the file one by one while the count runs
      for (let k = 1; k <= n; k++) {
        setProgress(k);
        await new Promise((r2) => setTimeout(r2, calm ? 0 : 45));
      }
      setStep("done");
      return;
    }
    const payload = usable.map((r) => ({ name: r.name, phone: r.phone!, planId: r.plan?.id ?? null, start: r.start, end: r.end, paid: r.paid ?? 0, due: r.due ?? 0, notes: r.notes, gender: r.gender, dob: r.dob }));
    let done = 0;
    for (let i = 0; i < payload.length; i += 500) {
      const res = await fetch(`/api/b/${snap.branch.id}/import`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ importId: id, fileName, mapping: map, rows: payload.slice(i, i + 500) }) });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(b.error ?? "The import stopped. Nothing after this batch was saved.");
        break;
      }
      done += b.imported ?? 0;
      setProgress(done);
    }
    setFailed(Math.max(0, payload.length - done));
    await store.refresh();
    setStep("done");
  };

  const undo = async (which = importId) => {
    if (!snap) return;
    if (mode === "demo") {
      const r = store.run("import.undo", { id: which });
      if (!r.ok) return store.note(r.error ?? "Not undone");
    } else {
      const res = await fetch(`/api/b/${snap.branch.id}/import-undo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ importId: which }) });
      if (!res.ok) return store.note((await res.json().catch(() => ({}))).error ?? "Not undone");
      await store.refresh();
    }
    store.note("Import undone. Those members are archived, nothing was deleted.", "ink");
    setStep("load");
  };

  return (
    <div className="ledger-plain flex min-h-dvh flex-col" data-theme="light">
      <TopBar compact />
      <main className="mx-auto w-full max-w-[1100px] px-3 py-4 sm:px-5">
        <h1 className="t-stencil text-[36px]" style={{ color: "var(--ink)" }}>
          Bahi import
        </h1>
        <p className="t-hand text-[17px]" style={{ color: "var(--carbon)" }}>
          Bring the register you already keep. Your sheet stays on this device until you press Import. Importing never sends a message.
        </p>
        {err && <p className="t-hand mt-2 text-[16px]" style={{ color: "var(--margin-red)" }}>{err}</p>}

        {(step === "load" || step === "done") && snap && <RecentImports list={snap.imports} onUndo={(id) => void undo(id)} />}

        {step === "load" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="ledger flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--ink)]/40 p-6 text-center">
              <span className="t-teko text-[24px]" style={{ color: "var(--ink)" }}>
                Choose .xlsx, .xls or .csv
              </span>
              <span className="t-hand text-[15px]" style={{ color: "var(--muted-on-paper)" }}>
                Excel, Google Sheets download, or the CSV from your old app
              </span>
              <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
            </label>
            <div className="flex flex-col gap-2">
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Or paste rows straight from Google Sheets (with the header row)" className="ledger-plain min-h-[150px] w-full border border-[var(--ledger-rule)] p-3 t-mono text-[13px]" />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ink" onClick={() => onPaste(paste)}>
                  Use pasted rows
                </button>
                <button type="button" className="btn-ink" onClick={() => onPaste(SAMPLE, "sample-register.tsv")}>
                  Try a messy sample sheet
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "map" && (
          <MapStep headers={headers} rows={rows} map={map} setMap={setMap} focusCol={focusCol} setFocusCol={setFocusCol} onNext={() => setStep("check")} needsOrder={needsOrder} order={order ?? inferred.order} setOrder={setOrder} sample={rows[0] ?? []} headerRow={headerRow} maxHeader={Math.min(9, raw.length - 2)} onHeader={moveHeader} dateSample={inferred.sample} />
        )}

        {step === "check" && (
          <div className="mt-4">
            <div className="board flex flex-wrap items-center gap-4 p-4">
              <span className="t-hand text-[20px]" style={{ color: "var(--ink)" }}>
                {usable.length} members ready, {needFix.length} need a fix, {dups.length} duplicates merged, 0 reminders will be sent
              </span>
              <div className="ml-auto flex gap-2">
                <button type="button" className="btn-ink" onClick={() => setStep("map")}>
                  Back to matching
                </button>
                <button type="button" className="btn-brass" disabled={!usable.length} onClick={() => void confirm()}>
                  Import {usable.length}
                </button>
              </div>
            </div>
            <div className="ledger mt-3 overflow-x-auto pb-2">
              <div className="t-teko grid h-8 min-w-[840px] items-center gap-2 pl-[72px] pr-3 text-[14px]" style={{ gridTemplateColumns: "1.2fr 150px 100px 84px 84px 76px 76px 1.4fr", color: "var(--carbon)" }}>
                <span>Name</span>
                <span>Phone</span>
                <span>Plan</span>
                <span>Start</span>
                <span>Expiry</span>
                <span className="text-right">Paid</span>
                <span className="text-right">Due</span>
                <span>Check</span>
              </div>
              {fixed.map((r) => {
                const bad = r.problems.length > 0 && !edits[r.i]?.skip;
                return (
                  <div key={r.i} className={`grid h-8 min-w-[840px] items-center gap-2 pl-[72px] pr-3 text-[13px] ${bad ? "hazard-edge" : ""}`} style={{ gridTemplateColumns: "1.2fr 150px 100px 84px 84px 76px 76px 1.4fr", opacity: edits[r.i]?.skip || r.dupOf != null ? 0.45 : 1 }}>
                    <span className="truncate" style={{ color: "var(--ink)" }}>
                      {r.name || "-"}
                    </span>
                    {r.problems.some((p) => p.startsWith("phone") || p === "no phone") ? (
                      <input aria-label={`Fix phone for ${r.name}`} className="field !h-7 !text-[13px]" defaultValue={r.rawPhone} onBlur={(e) => setEdits((x) => ({ ...x, [r.i]: { ...x[r.i], phone: e.target.value } }))} />
                    ) : (
                      <span className="t-mono">{r.phone}</span>
                    )}
                    <span className="t-teko text-[14px]">{r.plan?.nameEn ?? "-"}</span>
                    <span className="t-mono text-[12px]">{fmtDate(r.start)}</span>
                    <span className="t-mono text-[12px]">{fmtDate(r.end)}</span>
                    <span className="t-mono text-right text-[12px]">{r.paid != null ? rupees(r.paid) : "?"}</span>
                    {/* the sheet's balance becomes this member's dues, so the owner checks it here before Import */}
                    <span className="t-mono text-right text-[12px]" style={{ color: r.due ? "var(--stamp-due)" : undefined }}>
                      {r.due != null ? (r.due ? rupees(r.due) : "-") : "?"}
                    </span>
                    <span className="t-hand truncate text-[14px]" style={{ color: bad ? "var(--margin-red)" : "var(--stamp-paid)" }}>
                      {r.dupOf != null ? `same phone as row ${r.dupOf + 1}, merged` : r.problems.length ? r.problems.join(", ") : "ok"}
                      {bad && (
                        <button type="button" className="ml-2 underline" onClick={() => setEdits((x) => ({ ...x, [r.i]: { ...x[r.i], skip: true } }))}>
                          leave out
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(step === "saving" || step === "done") && <CardFile total={usable.length} done={progress} failed={failed} finished={step === "done"} onUndo={() => void undo()} base={base} />}
      </main>
      <MarginNotes />
    </div>
  );
}

function MapStep({ headers, rows, map, setMap, focusCol, setFocusCol, onNext, needsOrder, order, setOrder, sample, headerRow, maxHeader, onHeader, dateSample }: { headers: string[]; rows: unknown[][]; map: Record<number, FieldKey | null>; setMap: (m: Record<number, FieldKey | null>) => void; focusCol: number; setFocusCol: (n: number) => void; onNext: () => void; needsOrder: boolean; order: "dmy" | "mdy" | null; setOrder: (o: "dmy" | "mdy") => void; sample: unknown[]; headerRow: number; maxHeader: number; onHeader: (n: number) => void; dateSample: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [lines, setLines] = useState<{ col: number; d: string }[]>([]);
  const [drag, setDrag] = useState<null | { col: number; x: number; y: number }>(null);
  useEffect(() => {
    const draw = () => {
      const b = box.current?.getBoundingClientRect();
      if (!b) return;
      const out: { col: number; d: string }[] = [];
      Object.entries(map).forEach(([c, k]) => {
        if (!k) return;
        const l = leftRefs.current[Number(c)]?.getBoundingClientRect();
        const r = rightRefs.current[FIELDS.findIndex((f) => f.k === k)]?.getBoundingClientRect();
        if (!l || !r) return;
        const x1 = l.right - b.left;
        const y1 = l.top + l.height / 2 - b.top;
        const x2 = r.left - b.left;
        const y2 = r.top + r.height / 2 - b.top;
        out.push({ col: Number(c), d: `M${x1} ${y1} C${x1 + 70} ${y1} ${x2 - 70} ${y2} ${x2} ${y2}` });
      });
      setLines(out);
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [map, headers]);

  const dropOn = (clientX: number, clientY: number, col: number) => {
    const idx = rightRefs.current.findIndex((el) => {
      const r = el?.getBoundingClientRect();
      return r && clientX >= r.left - 20 && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    });
    if (idx < 0) return;
    const k = FIELDS[idx].k;
    setMap({ ...Object.fromEntries(Object.entries(map).map(([c, v]) => [c, v === k ? null : v])), [col]: k });
  };

  return (
    <div className="mt-4">
      <p className="t-hand text-[16px]" style={{ color: "var(--carbon)" }}>
        Chalk lines show our guess. Drag a line&apos;s end to another field to fix it, or focus a column and press the field&apos;s number. {rows.length} rows found.
      </p>
      {/* sheets often carry a title line or two above the real headings */}
      <div className="mt-2 flex items-center gap-2" role="group" aria-label="Header row">
        <span className="t-teko text-[17px]" style={{ color: "var(--ink)" }}>
          Header is on row
        </span>
        <button type="button" className="btn-ink !min-w-9 !px-0" aria-label="Header one row up" disabled={headerRow <= 0} onClick={() => onHeader(headerRow - 1)}>
          -
        </button>
        <span className="t-stencil tnum w-8 text-center text-[24px]" style={{ color: "var(--ink)" }} aria-live="polite">
          {headerRow + 1}
        </span>
        <button type="button" className="btn-ink !min-w-9 !px-0" aria-label="Header one row down" disabled={headerRow >= maxHeader} onClick={() => onHeader(headerRow + 1)}>
          +
        </button>
        {headerRow > 0 && (
          <span className="t-hand text-[15px]" style={{ color: "var(--muted-on-paper)" }}>
            {headerRow === 1 ? "the line above it was skipped as a title" : `the ${headerRow} lines above it were skipped`}
          </span>
        )}
      </div>
      <div ref={box} className="relative mt-3 grid grid-cols-[1fr_120px_1fr] gap-0 sm:grid-cols-[1fr_200px_1fr]" style={{ background: "#2b2f2c", padding: 16, border: "8px solid #7a5a36" }}>
        <div className="flex flex-col gap-2">
          {headers.map((h, i) => (
            <div
              key={i}
              ref={(el) => {
                leftRefs.current[i] = el;
              }}
              tabIndex={0}
              onFocus={() => setFocusCol(i)}
              className="ledger-plain relative flex min-h-11 items-center justify-between gap-2 px-3"
              style={{ outline: focusCol === i ? "2px solid var(--focus)" : undefined }}
            >
              <span className="min-w-0">
                <span className="t-hand block truncate text-[17px]" style={{ color: "var(--ink)" }}>
                  {h || `column ${i + 1}`}
                </span>
                <span className="t-mono block truncate text-[11px]" style={{ color: "var(--muted-on-paper)" }}>
                  {String(sample[i] ?? "")}
                </span>
              </span>
              <motion.span
                drag
                dragSnapToOrigin
                onDrag={(_, info) => setDrag({ col: i, x: info.point.x, y: info.point.y })}
                onDragEnd={(_, info) => {
                  setDrag(null);
                  dropOn(info.point.x - window.scrollX, info.point.y - window.scrollY, i);
                }}
                className="knurl grip block h-6 w-4 shrink-0 rounded-sm"
                aria-label={`Drag to match ${h}`}
              />
            </div>
          ))}
        </div>
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {lines.map((l, i) => (
            <ChalkPath key={`${l.col}-${l.d}`} d={l.d} delay={i * 0.06} width={2.6} />
          ))}
          {drag && box.current && (
            <line x1={(leftRefs.current[drag.col]?.getBoundingClientRect().right ?? 0) - box.current.getBoundingClientRect().left} y1={(leftRefs.current[drag.col]?.getBoundingClientRect().top ?? 0) + 22 - box.current.getBoundingClientRect().top} x2={drag.x - box.current.getBoundingClientRect().left - window.scrollX} y2={drag.y - box.current.getBoundingClientRect().top - window.scrollY} stroke="var(--brass-hi)" strokeWidth="2.6" strokeDasharray="6 4" />
          )}
        </svg>
        <div />
        <div className="flex flex-col gap-2">
          {FIELDS.map((f, i) => {
            const taken = Object.values(map).includes(f.k);
            return (
              <div
                key={f.k}
                ref={(el) => {
                  rightRefs.current[i] = el;
                }}
                className="iron flex min-h-11 items-center gap-2 px-3"
                style={{ clipPath: "none", opacity: taken ? 1 : 0.6 }}
              >
                <span className="kbd">{i === 9 ? "0" : i === 10 ? "-" : i + 1}</span>
                <span className="t-teko text-[17px]">{f.en}</span>
              </div>
            );
          })}
        </div>
      </div>
      {needsOrder && (
        <div className="board mt-4 p-4" role="group" aria-label="Date order">
          {(() => {
            // ask with a date from their own sheet, written both ways
            const m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/.exec(dateSample ?? "03/04/26") ?? ["", "3", "4", "26"];
            const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const a = Number(m[1]);
            const b = Number(m[2]);
            return (
              <>
                <p className="t-hand text-[19px]" style={{ color: "var(--ink)" }}>
                  Your sheet says {dateSample ?? "03/04/26"}. Is that {a} {MON[b - 1]} or {b} {MON[a - 1]}?
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="btn-ink" onClick={() => setOrder("dmy")}>
                    {a} {MON[b - 1]} (day first)
                  </button>
                  <button type="button" className="btn-ink" onClick={() => setOrder("mdy")}>
                    {b} {MON[a - 1]} (month first)
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <button type="button" className="btn-brass" disabled={needsOrder || !Object.values(map).includes("name") || !Object.values(map).includes("phone")} onClick={onNext}>
          Check the rows {order ? `(${order === "dmy" ? "day first" : "month first"})` : ""}
        </button>
      </div>
    </div>
  );
}

/** The rows become ID cards that fan into a card file, with a running count. */
/** Every import of the last day stays undoable from here, with the time left on its 24 hours. */
export function RecentImports({ list, onUndo }: { list: ImportRec[]; onUndo: (id: string) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const recent = [...list].filter((x) => now - Date.parse(x.createdAt) < 7 * 86400000).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);
  if (!recent.length) return null;
  return (
    <section className="ledger mt-4 pb-1" aria-label="Recent imports">
      <div className="t-teko flex h-8 items-center pl-[72px] pr-3 text-[16px]" style={{ color: "var(--margin-red)" }}>
        Recent imports
      </div>
      {recent.map((x) => {
        const left = 24 * 3600000 - (now - Date.parse(x.createdAt));
        const h = Math.floor(left / 3600000);
        const m = Math.floor((left % 3600000) / 60000);
        return (
          <div key={x.id} className="flex min-h-8 flex-wrap items-center gap-x-3 pl-[72px] pr-3 text-[13px]">
            <span className="t-mono" style={{ color: "var(--muted-on-paper)" }}>
              {fmtDay(todayIST(Date.parse(x.createdAt)))} {new Date(x.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}
            </span>
            <span className="truncate" style={{ color: "var(--ink)" }}>
              {x.fileName || "pasted rows"} · {x.rowCount} {x.rowCount === 1 ? "member" : "members"}
            </span>
            {x.undoneAt ? (
              <span className="t-teko text-[14px]" style={{ color: "var(--muted-on-paper)" }}>
                undone
              </span>
            ) : left > 0 ? (
              <button type="button" className="btn-ink ml-auto !min-h-7" onClick={() => onUndo(x.id)}>
                Undo import · {h}h {m}m left
              </button>
            ) : (
              <span className="t-teko ml-auto text-[14px]" style={{ color: "var(--muted-on-paper)" }}>
                kept for good
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}

function CardFile({ total, done, failed, finished, onUndo, base }: { total: number; done: number; failed: number; finished: boolean; onUndo: () => void; base: string }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <div className="relative h-[180px] w-[300px]">
        <div className="absolute inset-x-0 bottom-0 h-[90px]" style={{ background: "linear-gradient(#7a5a36, #5e4326)", borderRadius: 4 }} aria-hidden />
        <AnimatePresence>
          {Array.from({ length: Math.min(done, 14) }, (_, i) => (
            <motion.div key={i} className="pvc absolute left-1/2 top-[30px] h-[110px] w-[170px]" style={{ borderRadius: "6px", borderTop: "5px solid var(--margin-red)", boxShadow: "0 2px 4px rgba(0,0,0,.3)" }} initial={{ y: -160, x: "-50%", rotate: -14, opacity: 0 }} animate={{ y: i * -2, x: `calc(-50% + ${(i - 7) * 6}px)`, rotate: (i - 7) * 2.4, opacity: 1 }} transition={SPRING} />
          ))}
        </AnimatePresence>
      </div>
      <div className="t-stencil tnum text-center text-[44px]" style={{ color: "var(--ink)" }}>
        {done} filed
        {finished && <span className="t-teko block text-[20px]" style={{ color: failed ? "var(--margin-red)" : "var(--carbon)" }}>{failed} failed</span>}
        {!finished && <span className="t-teko block text-[20px]" style={{ color: "var(--carbon)" }}>of {total}</span>}
      </div>
      {finished && (
        <>
          <p className="t-hand text-[18px]" style={{ color: "var(--carbon)" }}>
            Filed. Run the paper register beside Khatabar for two weeks if you like; Undo works for 24 hours.
          </p>
          <div className="flex gap-2">
            <a href={`${base}/desk`} className="btn-brass">
              Open the desk
            </a>
            <button type="button" className="btn-ink" onClick={onUndo}>
              Undo import
            </button>
          </div>
        </>
      )}
    </div>
  );
}
