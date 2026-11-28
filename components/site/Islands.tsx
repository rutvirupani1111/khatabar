"use client";
// Each scene's demo is its own island: nothing is requested until the scene is one screen away,
// and a cream skeleton of the same box holds its place until the demo itself has arrived (also
// while its code is still downloading), so the page never collapses and jumps back.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";

function Skel() {
  return (
    <div className="island-skel" style={{ minHeight: "var(--island-min, 420px)" }} aria-hidden>
      <i style={{ width: "60%" }} />
      <i style={{ height: 52 }} />
      <i style={{ width: "40%" }} />
      <i style={{ height: 120 }} />
    </div>
  );
}

// next/dynamic needs each options object written out in place
const DEMOS: Record<string, ComponentType> = {
  counter: dynamic(() => import("./demos/CounterDemo"), { ssr: false, loading: () => <Skel /> }),
  fees: dynamic(() => import("./demos/FeesDemo"), { ssr: false, loading: () => <Skel /> }),
  freeze: dynamic(() => import("./demos/FreezeDemo"), { ssr: false, loading: () => <Skel /> }),
  card: dynamic(() => import("./demos/CardDemo"), { ssr: false, loading: () => <Skel /> }),
  report: dynamic(() => import("./demos/CloseAndReportDemo"), { ssr: false, loading: () => <Skel /> }),
  import: dynamic(() => import("./demos/ImportDemo"), { ssr: false, loading: () => <Skel /> }),
};

export function DemoIsland({ name, minH = 420, label }: { name: keyof typeof DEMOS | string; minH?: number; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setNear(true);
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Demo = DEMOS[name];
  return (
    <div ref={box} className="flex min-h-0 flex-1 flex-col" style={{ "--island-min": `${minH}px` } as CSSProperties} aria-label={label} role="region">
      {near && Demo ? <Demo /> : <Skel />}
    </div>
  );
}
