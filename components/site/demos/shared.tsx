"use client";
// What every street demo shares: the one in-memory demo gym, the "Reset demo" link, and the
// WhatsApp preview that shows the message instead of opening WhatsApp (demo numbers can belong
// to real people, so a demo never opens wa.me).
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { GymProvider, useGym, useGymState } from "@/components/shell/Gym";
import { Icon } from "@/components/ui/Icon";
import { streetBus, streetStore } from "@/lib/client/street";

export function StreetGym({ children }: { children: ReactNode }) {
  const [store] = useState(() => streetStore());
  return (
    <GymProvider store={store} mode="demo" base="/demo" street>
      <Ready>{children}</Ready>
    </GymProvider>
  );
}

function Ready({ children }: { children: ReactNode }) {
  const status = useGymState((s) => s.status);
  if (status !== "ready")
    return (
      <div className="island-skel" aria-hidden>
        <i style={{ width: "50%" }} />
        <i style={{ height: 52 }} />
        <i style={{ height: 140 }} />
      </div>
    );
  return <>{children}</>;
}

export function DemoFooter({ href, onDark }: { href?: string; onDark?: boolean }) {
  const { store } = useGym();
  const [busy, setBusy] = useState(false);
  return (
    <div className={`demo-foot flex flex-wrap items-center gap-x-4 ${onDark ? "demo-on-dark" : ""}`}>
      <button
        type="button"
        className="demo-reset"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await store.resetDemo();
          streetBus.emit("reset");
          setBusy(false);
        }}
      >
        {busy ? (
          "Resetting..."
        ) : (
          <>
            <span className="l-en">Reset demo</span>
            <span className="l-hi" lang="hi">
              डेमो फिर से शुरू करें
            </span>
          </>
        )}
      </button>
      {href && (
        <Link href={href} className="demo-reset">
          <span className="l-en">Do this in the full demo desk</span>
          <span className="l-hi" lang="hi">
            पूरे डेमो डेस्क में यही करें
          </span>
        </Link>
      )}
    </div>
  );
}

/** The message as it would be typed in WhatsApp, with the honest line under it. */
export function WaPreview({ to, text, children, note = "In your gym this opens WhatsApp with this message typed. You press Send." }: { to: string; text: string; children?: ReactNode; note?: string }) {
  return (
    <div className="rounded-2xl border-2 border-[var(--ink)] bg-[#E9F6EE] p-3" aria-live="polite">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--muted-ink)]">
        <Icon name="chat" size={16} /> To {to} · preview
      </div>
      <p className="mt-2 rounded-[14px_14px_14px_4px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-[15px] leading-snug">{text}</p>
      <p className="mt-2 text-[13px] font-semibold">{note}</p>
      {children}
    </div>
  );
}

/** Re-render once a minute so "Sent 2 minutes ago" stays honest. */
export function useTick(ms = 30000) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}
