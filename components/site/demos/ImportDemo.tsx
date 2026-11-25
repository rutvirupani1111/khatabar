"use client";
// Scene 7's demo: the real import flow on the demo gym. The messy sample has a 9-digit phone, a
// Hindi name and a row that is really Mahesh again; whoever you import can be found at the counter.
import { useEffect, useState } from "react";
import { ImportFlow, type ImportResult } from "@/components/import/ImportFlow";
import { goToScene, streetBus, streetPicks } from "@/lib/client/street";
import { DemoFooter, StreetGym } from "./shared";

export default function ImportDemo() {
  return (
    <StreetGym>
      <Inner />
    </StreetGym>
  );
}

function Inner() {
  const [done, setDone] = useState<ImportResult | null>(null);
  const [key, setKey] = useState(0);
  useEffect(
    () =>
      streetBus.on((e) => {
        if (e === "reset") {
          setDone(null);
          setKey((k) => k + 1);
        }
      }),
    [],
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="demo-panel p-4">
        <ImportFlow
          key={key}
          compact
          onImported={(r) => {
            setDone(r);
            streetBus.emit("imported");
          }}
          onUndone={() => setDone(null)}
        />
      </div>
      {done?.firstLast4 && (
        <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
          Find one on the front desk: type {done.firstLast4}
          <button
            type="button"
            className="btn btn-sm !min-h-11"
            onClick={() => {
              streetPicks.counterQ = done.firstLast4 ?? undefined;
              streetBus.emit("pick");
              goToScene("how");
            }}
          >
            Go to the counter
          </button>
        </p>
      )}
      <DemoFooter href="/demo/import" />
    </div>
  );
}
