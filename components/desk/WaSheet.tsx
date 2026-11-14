"use client";
// One-tap WhatsApp: a wa.me link with the message already typed. A person still
// presses Send in WhatsApp; Khatabar never claims a message was delivered.
// In the demo gym the link would open a made-up number, so we show the exact
// message and link instead.
import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { waLink } from "@/lib/core/money";
import { useGym } from "@/components/shell/Gym";
import { Icon } from "@/components/art";

interface Msg {
  phone: string;
  text: string;
  to: string;
}
const Ctx = createContext<(m: Msg) => void>(() => {});
export const useWhatsApp = () => useContext(Ctx);

export function WaProvider({ children }: { children: ReactNode }) {
  const { mode } = useGym();
  const [msg, setMsg] = useState<Msg | null>(null);
  const [copied, setCopied] = useState(false);
  const open = useCallback(
    (m: Msg) => {
      if (mode === "live") {
        window.open(waLink(m.phone, m.text), "_blank", "noopener");
        return;
      }
      setCopied(false);
      setMsg(m);
    },
    [mode],
  );
  return (
    <Ctx.Provider value={open}>
      {children}
      <AnimatePresence>
        {msg && (
          <motion.div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-3 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMsg(null)} onKeyDown={(e) => e.key === "Escape" && setMsg(null)}>
            <motion.div role="dialog" aria-modal="true" aria-label="WhatsApp message preview" className="ledger-plain w-full max-w-[460px] p-5" initial={{ y: 30 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}>
              <div className="t-teko flex items-center gap-2 text-[20px]" style={{ color: "var(--ink)" }}>
                <Icon name="bubble" size={20} /> To {msg.to} · demo preview
              </div>
              <p className="t-hand mt-1 text-[15px]" style={{ color: "var(--margin-red)" }}>
                In a real gym this opens WhatsApp with the message typed. You press Send yourself.
              </p>
              <div className="relative mt-4 px-4 py-3 text-[15px]" style={{ background: "var(--ledger)", border: "2px solid var(--carbon)", borderRadius: "14px 14px 14px 2px", color: "var(--text-on-paper)" }}>
                {msg.text}
              </div>
              <div className="t-mono mt-3 break-all text-[11px] muted">{waLink(msg.phone, msg.text).slice(0, 140)}…</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  autoFocus
                  className="btn-brass"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(msg.text);
                      setCopied(true);
                    } catch {}
                  }}
                >
                  {copied ? "Copied" : "Copy message"}
                </button>
                <button type="button" className="btn-ink" onClick={() => setMsg(null)}>
                  Close (Esc)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
