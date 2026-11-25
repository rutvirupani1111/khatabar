"use client";
// Import members from Excel: the app screen around the three-step import flow, plus every recent
// import with its 24-hour undo.
import { useEffect, useState } from "react";
import { AppScreen } from "@/components/shell/AppShell";
import { useGym, useSnap } from "@/components/shell/Gym";
import { EmptyArt } from "@/components/world/Vignettes";
import { fmtDay, todayIST } from "@/lib/core/dates";
import type { ImportRec } from "@/lib/core/types";
import { ImportFlow } from "./ImportFlow";

export function Importer() {
  const { store, mode, base } = useGym();
  const snap = useSnap();
  const [done, setDone] = useState<number | null>(null);
  const undo = async (id: string) => {
    if (!snap) return;
    if (mode === "demo") {
      const r = store.run("import.undo", { id });
      return store.note(r.ok ? "Import undone. Those members are put away; nothing was deleted." : r.error ?? "Not undone", r.ok ? "ink" : "red");
    }
    const res = await fetch(`/api/b/${snap.branch.id}/import-undo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ importId: id }) });
    if (!res.ok) return store.note((await res.json().catch(() => ({}))).error ?? "Not undone");
    await store.refresh();
    store.note("Import undone. Those members are put away; nothing was deleted.", "ink");
  };
  return (
    <AppScreen screen="import" title="Import members from Excel" sentence="Bring the members you already have. Your sheet stays on this computer until you press Import, and no message is sent to anyone." vignette="import">
      <div className="mx-auto grid w-full max-w-[1200px] gap-4 px-3 py-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="panel p-4">{snap ? <ImportFlow onImported={(r) => setDone(r.n)} /> : <div className="skeleton h-[240px]" />}</div>
        <aside className="flex flex-col gap-4">
          <div className="panel-flat flex flex-col items-center gap-2 p-4 text-center">
            <EmptyArt kind="import" size={200} />
            <p className="text-[15px]">Names, phones, plans and end dates are found in your own column names, even &quot;naam&quot;, &quot;mob no&quot; or &quot;valid till&quot;.</p>
            {done != null && (
              <a href={`${base}/desk`} className="btn btn-primary">
                Open the front desk
              </a>
            )}
          </div>
          {snap && <RecentImports list={snap.imports} onUndo={(id) => void undo(id)} />}
        </aside>
      </div>
    </AppScreen>
  );
}

/** Every import of the last week, with the time left on its 24-hour undo. */
export function RecentImports({ list, onUndo }: { list: ImportRec[]; onUndo: (id: string) => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const recent = [...list]
    .filter((x) => now - Date.parse(x.createdAt) < 7 * 86400000)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);
  if (!recent.length) return null;
  return (
    <section className="panel-flat p-3" aria-label="Recent imports">
      <h2 className="text-[15px] font-bold">Recent imports</h2>
      <ul className="mt-1 flex flex-col">
        {recent.map((x) => {
          const left = 24 * 3600000 - (now - Date.parse(x.createdAt));
          const h = Math.floor(left / 3600000);
          const m = Math.floor((left % 3600000) / 60000);
          return (
            <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--line)] py-2 text-[14px] last:border-0">
              <span className="flex-1">
                {fmtDay(todayIST(Date.parse(x.createdAt)))} · {x.fileName || "pasted rows"} · {x.rowCount} {x.rowCount === 1 ? "member" : "members"}
              </span>
              {x.undoneAt ? (
                <span className="text-[13px] text-[var(--muted-ink)]">Undone</span>
              ) : left > 0 ? (
                <button type="button" className="btn btn-sm" onClick={() => onUndo(x.id)}>
                  Undo import ({h}h {m}m left)
                </button>
              ) : (
                <span className="text-[13px] text-[var(--muted-ink)]">Kept for good</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
