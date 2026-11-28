"use client";
// Import members from Excel in three plain steps: choose the file, check what each column is, import.
// The sheet is read in this browser; nothing leaves the device until Import is pressed, and an
// import never sends a single message. Used by the app's Import screen and the home page's scene 7.
import { useEffect, useMemo, useRef, useState } from "react";
import { useGym, useSnap } from "@/components/shell/Gym";
import { Icon } from "@/components/ui/Icon";
import { addDays, fmtDate, todayIST } from "@/lib/core/dates";
import { rupees, uid } from "@/lib/core/money";
import { ambiguous, FIELDS, guessMapping, headerRowOf, inferOrder, parseRows, type FieldKey, type ParsedRow } from "@/lib/core/importer";

const LABEL: Record<FieldKey, string> = {
  name: "Name",
  phone: "Phone number",
  plan: "Plan",
  start: "Membership starts",
  end: "Membership ends",
  paid: "Amount paid",
  due: "Amount owed",
  notes: "Notes",
  memberNo: "Member number",
  gender: "Gender",
  dob: "Date of birth",
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Six messy rows the way gyms really keep them, dated around today so the demo never goes stale. */
export function messySample(existing: Set<string>, today = todayIST()) {
  const pick = (start: number) => {
    for (let n = start; n < start + 400; n++) {
      const p = `900000${String(n).padStart(4, "0")}`;
      if (!existing.has(p)) return p;
    }
    return `90000${start}`;
  };
  const p1 = pick(3101);
  const p2 = pick(3207);
  const p3 = pick(3313);
  const p5 = pick(3419);
  const dmy = (iso: string) => `${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}/${iso.slice(2, 4)}`;
  const dmon = (iso: string) => `${Number(iso.slice(8))}-${MON[Number(iso.slice(5, 7)) - 1]}${iso.slice(0, 4) === today.slice(0, 4) ? "" : `-${iso.slice(2, 4)}`}`;
  const e1 = addDays(today, 24);
  const e2 = addDays(today, 61);
  const e3 = addDays(today, 9);
  const e4 = addDays(today, 40);
  const e5 = addDays(today, 150);
  const e6 = addDays(today, 17);
  const sp = (p: string) => `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
  return [
    "Sr\tNaam\tMob no\tPackage\tValid till\tFees\tBaki",
    `1\tRamesh Pandya\t${sp(p1)}\tQuarterly\t${dmy(e1)}\t3200\t0`,
    `2\tFarida Sheikh\t0${p2}\tHalf yearly\t${dmon(e2)}\t5800\t800`,
    `3\tप्रिया शर्मा\t${p3}\tMonthly\t${e3}\t1200\t0`,
    `4\tVijay Kumar\t${p5.slice(0, 9)}\tQuarterly\t${dmy(e4)}\t3200\t0`,
    `5\tAarti Joshi\t${p5}\tYearly\t${dmy(e5)}\t9999\t0`,
    `6\tMahesh P.\t90000 04521\tMonthly\t${dmy(e6)}\t1200\t0`,
  ].join("\n");
}

export interface ImportResult {
  id: string;
  n: number;
  firstLast4: string | null;
}

export function ImportFlow({ onImported, onUndone, compact }: { onImported?: (r: ImportResult) => void; onUndone?: () => void; compact?: boolean }) {
  const { store, mode } = useGym();
  const snap = useSnap();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState<unknown[][]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [map, setMap] = useState<Record<number, FieldKey | null>>({});
  const [order, setOrder] = useState<"dmy" | "mdy" | null>(null);
  const [edits, setEdits] = useState<Record<number, { phone?: string; skip?: boolean }>>({});
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [undone, setUndone] = useState(false);
  const okRef = useRef<HTMLParagraphElement>(null);
  // the panel shrinks when the rows go in: bring the result into view and read it out
  useEffect(() => {
    if (step !== 3) return;
    const el = okRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const top = el.getBoundingClientRect().top;
    if (top < 80 || top > window.innerHeight - 120) el.scrollIntoView({ block: "center" });
  }, [step]);

  const headers = useMemo(() => (raw[headerRow] ?? []).map((x) => String(x ?? "").trim()), [raw, headerRow]);
  const rows = useMemo(() => raw.slice(headerRow + 1), [raw, headerRow]);
  const existing = useMemo(() => new Set((snap?.members ?? []).filter((m) => !m.archivedAt).map((m) => m.phone)), [snap]);
  const byPhone = useMemo(() => new Map((snap?.members ?? []).filter((m) => !m.archivedAt).map((m) => [m.phone, m])), [snap]);

  const load = (all: unknown[][], name: string) => {
    const hr = headerRowOf(all);
    setRaw(all);
    setHeaderRow(hr);
    setFileName(name);
    setMap(guessMapping((all[hr] ?? []).map((x) => String(x ?? ""))));
    setOrder(null);
    setEdits({});
    setStep(2);
    setErr("");
    setResult(null);
    setUndone(false);
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
        load(XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" }), f.name);
      }
    } catch {
      setErr("Could not read that file. Save it as .xlsx or .csv, or paste the rows from Google Sheets.");
    }
  };
  const onPaste = (text: string, name = "pasted from a sheet") => {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (lines.length < 2) return setErr("Paste the heading row and at least one member row.");
    load(
      lines.map((l) => (l.includes("\t") ? l.split("\t") : l.split(","))),
      name,
    );
  };

  const dateCols = Object.entries(map)
    .filter(([, v]) => v === "start" || v === "end" || v === "dob")
    .map(([k]) => Number(k));
  const inferred = useMemo(() => inferOrder(rows, dateCols), [rows, dateCols.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const useOrder = order ?? inferred.order ?? "dmy";
  const needsOrder = order == null && inferred.order == null && dateCols.some((c) => ambiguous(rows.map((r) => r[c])));
  const parsed: ParsedRow[] = useMemo(() => (snap ? parseRows(rows, map, snap.plans, useOrder, existing) : []), [rows, map, snap, useOrder, existing]);
  const fixed = parsed.map((r) => {
    const e = edits[r.i];
    if (!e?.phone || !snap) return r;
    const again = parseRows([rows[r.i]].map((x) => x.map((v, ci) => (map[ci] === "phone" ? e.phone : v))), map, snap.plans, useOrder, existing)[0];
    return { ...again, i: r.i };
  });
  const usable = fixed.filter((r) => !edits[r.i]?.skip && r.dupOf == null && !r.problems.length);
  const issues = fixed.filter((r) => !edits[r.i]?.skip && (r.problems.length > 0 || r.dupOf != null));
  const hasName = Object.values(map).includes("name");
  const hasPhone = Object.values(map).includes("phone");

  const sentence = (r: ParsedRow) => {
    const row = `Row ${r.i + 1}`;
    if (r.dupOf != null) return `${row}: same phone as row ${r.dupOf + 1}. Only the first one is imported.`;
    if (r.problems.includes("already a member") && r.phone) {
      const m = byPhone.get(r.phone);
      return `${row}: this phone already belongs to ${m?.name ?? "a member"}${m ? ` (${m.memberNo})` : ""}. A phone can belong to one member only, so skip this row.`;
    }
    if (r.problems.some((p) => p.startsWith("phone"))) return `${row}: phone has ${r.rawPhone.replace(/\D/g, "").replace(/^(91|0)/, "").length} digits. Fix it or skip this row.`;
    if (r.problems.includes("no phone")) return `${row}: no phone number. Add one or skip this row.`;
    if (r.problems.includes("no name")) return `${row}: no name. Skip this row or fix the sheet.`;
    if (r.problems.includes("expiry before start")) return `${row}: the end date is before the start date. Skip it or fix the sheet.`;
    return `${row}: ${r.problems.join(", ")}.`;
  };

  const doImport = async () => {
    if (!snap || !usable.length) return;
    setBusy(true);
    setErr("");
    const id = uid();
    const firstLast4 = usable[0]?.phone?.slice(-4) ?? null;
    if (mode === "demo") {
      const res = store.run("import.rows", { importId: id, fileName, rows: usable.map((r) => ({ memberId: uid(), membershipId: uid(), paymentId: uid(), name: r.name, phone: r.phone!, planId: r.plan?.id ?? null, start: r.start, end: r.end, paid: r.paid ?? 0, due: r.due ?? 0, notes: r.notes, gender: r.gender, dob: r.dob })) });
      setBusy(false);
      if (!res.ok) return setErr(res.error ?? "Nothing was imported");
      const r = { id, n: usable.length, firstLast4 };
      setResult(r);
      setStep(3);
      onImported?.(r);
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
    }
    await store.refresh();
    setBusy(false);
    const r = { id, n: done, firstLast4 };
    setResult(r);
    setStep(3);
    onImported?.(r);
  };

  const undo = async () => {
    if (!result || !snap) return;
    if (mode === "demo") {
      const r = store.run("import.undo", { id: result.id });
      if (!r.ok) return setErr(r.error ?? "Not undone");
    } else {
      const res = await fetch(`/api/b/${snap.branch.id}/import-undo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ importId: result.id }) });
      if (!res.ok) return setErr((await res.json().catch(() => ({}))).error ?? "Not undone");
      await store.refresh();
    }
    setUndone(true);
    onUndone?.();
  };

  const steps = ["Choose file", "Check columns", "Import"];
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] font-semibold" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5" aria-current={step === i + 1 ? "step" : undefined} style={{ color: step === i + 1 ? "var(--ink)" : "var(--muted-ink)" }}>
            <span className="grid size-6 place-items-center rounded-full border-2 border-[var(--ink)] text-[12px]" style={{ background: step > i + 1 ? "var(--paan)" : step === i + 1 ? "var(--saffron)" : "var(--paper)", color: step > i + 1 ? "#fff" : "var(--ink)" }}>
              {step > i + 1 ? <Icon name="tick" size={14} stroke={3} /> : i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
          <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] p-5 text-center">
            <Icon name="upload" size={28} />
            <span className="text-[17px] font-bold">Choose an Excel or CSV file</span>
            <span className="text-[14px] text-[var(--muted-ink)]">.xlsx, .xls or .csv. It is read on this device{mode === "demo" ? " and never uploaded in the demo" : ""}.</span>
            <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
          </label>
          <div className="flex flex-col gap-2">
            <label>
              <span className="label">Or paste rows from Google Sheets</span>
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste rows here (with the heading row)" className="input t-mono mt-1 !min-h-[96px] text-[13px]" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" disabled={!paste.trim()} onClick={() => onPaste(paste)}>
                Use pasted rows
              </button>
              <button type="button" className="btn btn-primary" onClick={() => onPaste(messySample(existing), "messy-sample.xlsx")}>
                Try a messy sample sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          <p className="text-[15px]">
            {rows.length} rows found in <b>{fileName}</b>. We guessed what each column is; change any that is wrong.
          </p>
          <div className="panel-flat overflow-hidden">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-[var(--marigold-pale)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Your column</th>
                  <th className="px-3 py-2 font-semibold">This column is</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i} className="border-t border-[var(--line)]">
                    <td className="px-3 py-1.5">
                      <span className="block font-semibold">{h || `Column ${i + 1}`}</span>
                      <span className="t-mono block truncate text-[12px] text-[var(--muted-ink)]">{String(rows[0]?.[i] ?? "")}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        aria-label={`What is the column ${h || i + 1}?`}
                        className="input !min-h-11 min-w-[168px] !px-2 text-[14px]"
                        value={map[i] ?? ""}
                        onChange={(e) => {
                          const k = (e.target.value || null) as FieldKey | null;
                          setMap((m) => ({ ...Object.fromEntries(Object.entries(m).map(([c, v]) => [c, k && v === k ? null : v])), [i]: k }));
                        }}
                      >
                        <option value="">Skip this column</option>
                        {FIELDS.map((f) => (
                          <option key={f.k} value={f.k}>
                            {LABEL[f.k]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {needsOrder && (
            <div className="panel-flat flex flex-col gap-2 p-3" role="group" aria-label="Date order">
              <p className="font-semibold">Your sheet says {inferred.sample ?? "03/04/26"}. Is the day written first or the month?</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-sm" aria-pressed={order === "dmy"} onClick={() => setOrder("dmy")}>
                  Day first (Indian)
                </button>
                <button type="button" className="btn btn-sm" aria-pressed={order === "mdy"} onClick={() => setOrder("mdy")}>
                  Month first
                </button>
              </div>
            </div>
          )}
          {issues.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="Rows to fix">
              {issues.map((r) => (
                <li key={r.i} className="flex flex-col gap-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--marigold-pale)] p-3">
                  <p className="text-[14px] font-semibold">{sentence(r)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {r.problems.some((p) => p.startsWith("phone") || p === "no phone") && (
                      <input aria-label={`Fix the phone in row ${r.i + 1}`} inputMode="tel" className="input t-mono !min-h-11 !w-44" defaultValue={r.rawPhone} onBlur={(e) => setEdits((x) => ({ ...x, [r.i]: { ...x[r.i], phone: e.target.value } }))} />
                    )}
                    <button type="button" className="btn btn-sm !min-h-11" onClick={() => setEdits((x) => ({ ...x, [r.i]: { ...x[r.i], skip: true } }))}>
                      Skip this row
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {usable.length > 0 && (
            <div className="panel-flat overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[13px]">
                <thead className="bg-[var(--paper)]">
                  <tr className="text-[var(--muted-ink)]">
                    <th className="px-3 py-1.5 font-semibold">Name</th>
                    <th className="px-3 py-1.5 font-semibold">Phone</th>
                    <th className="px-3 py-1.5 font-semibold">Plan</th>
                    <th className="px-3 py-1.5 font-semibold">Ends</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Owes</th>
                  </tr>
                </thead>
                <tbody>
                  {usable.slice(0, compact ? 6 : 40).map((r) => (
                    <tr key={r.i} className="border-t border-[var(--line)]">
                      <td className="px-3 py-1.5 font-semibold">{r.name}</td>
                      <td className="t-mono px-3 py-1.5">{r.phone}</td>
                      <td className="px-3 py-1.5">{r.plan?.nameEn ?? "-"}</td>
                      <td className="px-3 py-1.5">{fmtDate(r.end)}</td>
                      <td className="t-mono px-3 py-1.5 text-right">{r.due ? rupees(r.due) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!hasName || !hasPhone ? <p className="text-[14px] font-semibold text-[#9b0f3f]">Pick which column is the Name and which is the Phone number.</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-lg" disabled={busy || needsOrder || !hasName || !hasPhone || !usable.length} onClick={() => void doImport()}>
              {busy ? "Importing..." : `Import ${usable.length} ${usable.length === 1 ? "member" : "members"}`}
            </button>
            <button type="button" className="btn btn-lg" onClick={() => setStep(1)}>
              <Icon name="back" size={18} /> Choose another file
            </button>
          </div>
          <p className="text-[13px] text-[var(--muted-ink)]">Importing never sends a message to anyone.</p>
        </div>
      )}

      {step === 3 && result && (
        <div className="flex flex-col gap-3" aria-live="polite">
          {!undone ? (
            <>
              <p ref={okRef} tabIndex={-1} className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paan)] p-3 text-[17px] font-bold text-white outline-none">
                {result.n} {result.n === 1 ? "member" : "members"} added.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn" onClick={() => void undo()}>
                  <Icon name="undo" size={18} /> Undo import
                </button>
                <span className="text-[14px] text-[var(--muted-ink)]">Works for 24 hours.</span>
              </div>
            </>
          ) : (
            <p className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] p-3 font-semibold">Import undone. Those members are put away; nothing was deleted.</p>
          )}
          <button type="button" className="btn self-start" onClick={() => setStep(1)}>
            Import another sheet
          </button>
        </div>
      )}
      {err && (
        <p role="alert" className="rounded-lg bg-[#fde2ea] p-2 text-[14px] font-semibold text-[#9b0f3f]">
          {err}
        </p>
      )}
    </div>
  );
}
