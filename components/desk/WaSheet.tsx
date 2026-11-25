"use client";
// One-tap WhatsApp: a wa.me link with the message already typed. A person still presses Send in
// WhatsApp; Khatabar never claims a message was delivered. In the demo gym the link would open a
// made-up number, so we show the exact message instead.
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { waLink } from "@/lib/core/money";
import { useGym } from "@/components/shell/Gym";
import { Sheet } from "@/components/shell/Overlays";
import { Icon } from "@/components/ui/Icon";

interface Msg {
  phone: string;
  text: string;
  to: string;
}
const Ctx = createContext<(m: Msg) => void>(() => {});
export const useWhatsApp = () => useContext(Ctx);

export function WaProvider({ children }: { children: ReactNode }) {
  const { mode, street } = useGym();
  const [msg, setMsg] = useState<Msg | null>(null);
  const [copied, setCopied] = useState(false);
  const open = useCallback(
    (m: Msg) => {
      if (mode === "live" && !street) {
        window.open(waLink(m.phone, m.text), "_blank", "noopener");
        return;
      }
      setCopied(false);
      setMsg(m);
    },
    [mode, street],
  );
  return (
    <Ctx.Provider value={open}>
      {children}
      {msg && (
        <Sheet title={`Message to ${msg.to}`} sentence="Demo preview. In your gym this opens WhatsApp with this message typed. You press Send." onClose={() => setMsg(null)}>
          <div className="rounded-2xl border-2 border-[var(--ink)] bg-[#E9F6EE] p-3">
            <p className="rounded-[14px_14px_14px_4px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-[15px] leading-snug">{msg.text}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(msg.text);
                  setCopied(true);
                } catch {}
              }}
            >
              <Icon name="chat" size={18} /> {copied ? "Copied" : "Copy message"}
            </button>
            <button type="button" className="btn" onClick={() => setMsg(null)}>
              Close
            </button>
          </div>
        </Sheet>
      )}
    </Ctx.Provider>
  );
}
