"use client";
// Each scene's demo is its own island: nothing is requested until the scene is one screen away,
// and a cream skeleton of the same box holds its place until then.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType } from "react";

const DEMOS: Record<string, ComponentType> = {
  counter: dynamic(() => import("./demos/CounterDemo"), { ssr: false }),
  fees: dynamic(() => import("./demos/FeesDemo"), { ssr: false }),
  freeze: dynamic(() => import("./demos/FreezeDemo"), { ssr: false }),
  card: dynamic(() => import("./demos/CardDemo"), { ssr: false }),
  report: dynamic(() => import("./demos/CloseAndReportDemo"), { ssr: false }),
  import: dynamic(() => import("./demos/ImportDemo"), { ssr: false }),
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
    <div ref={box} className="flex min-h-0 flex-1 flex-col" style={{ minHeight: near ? undefined : minH }} aria-label={label} role="region">
      {near && Demo ? (
        <Demo />
      ) : (
        <div className="island-skel" aria-hidden>
          <i style={{ width: "60%" }} />
          <i style={{ height: 52 }} />
          <i style={{ width: "40%" }} />
          <i style={{ height: 120 }} />
        </div>
      )}
    </div>
  );
}
