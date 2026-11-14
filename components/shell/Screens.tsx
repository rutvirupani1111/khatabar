"use client";
// /face: a second screen turned to the customer, showing the desk's UPI QR full size.
// /poster: the printable A4 self check-in poster for the entrance.
import { useEffect, useState } from "react";
import { Qr } from "@/components/art/Qr";
import { rupees } from "@/lib/core/money";
import { lsGet } from "@/lib/client/idb";
import { origin } from "./links";

export function Face({ branchId }: { branchId: string }) {
  const [qr, setQr] = useState<null | { text: string; amount: number; name: string; demo?: boolean }>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(`kb-face-${branchId}`);
    ch.onmessage = (m) => {
      if (m.data?.type === "qr") setQr(m.data);
      if (m.data?.type === "clear") setQr(null);
    };
    return () => ch.close();
  }, [branchId]);
  return (
    <div className="floor grid min-h-dvh place-items-center p-6 text-center">
      {qr ? (
        <div className="flex flex-col items-center gap-4">
          <div className="t-teko text-[28px]">Scan with any UPI app</div>
          <div style={{ background: "var(--chalk)", padding: 18 }}>
            <Qr text={qr.text} size={340} watermark={qr.demo ? "DEMO, do not pay" : undefined} label={`Pay ${rupees(qr.amount)}`} />
          </div>
          <div className="t-stencil text-[64px]" style={{ color: "var(--brass-hi)" }}>
            {rupees(qr.amount)}
          </div>
          <div className="t-hand text-[22px]">for {qr.name}</div>
        </div>
      ) : (
        <div>
          <div className="t-stencil text-[48px]" style={{ color: "var(--brass)" }}>
            Pay here
          </div>
          <p className="t-hand mt-2 text-[20px]" style={{ color: "var(--chalk-dust)" }}>
            The QR appears when the desk presses P. Keep this tab open on the screen that faces the counter.
          </p>
        </div>
      )}
    </div>
  );
}

export function Poster({ branchId }: { branchId: string }) {
  const url = `${origin()}/checkin/${branchId}`;
  return (
    <div className="board mx-auto my-4 flex min-h-[1000px] w-full max-w-[794px] flex-col items-center justify-between p-12 text-center print:my-0 print:border-0">
      <div>
        <div className="t-stencil text-[72px]" style={{ color: "var(--iron-rim)" }}>
          CHECK IN HERE
        </div>
        <div className="t-teko text-[32px]" style={{ color: "var(--carbon)" }} lang="hi">
          हाज़िरी यहाँ लगाएँ
        </div>
      </div>
      <Qr text={url} size={420} label="Self check-in QR" />
      <div>
        <p className="text-[20px]" style={{ color: "var(--text-on-paper)" }}>
          Scan with your phone camera. Your Khatabar card opens and checks you in by location.
        </p>
        <p className="t-mono mt-2 text-[14px]" style={{ color: "var(--muted-on-paper)" }}>
          {url}
        </p>
        <button type="button" className="btn-ink no-print mt-4" onClick={() => window.print()}>
          Print on A4
        </button>
      </div>
    </div>
  );
}

/** The poster's QR lands here; we send the member to their own saved card. */
export function CheckinHop() {
  const [none, setNone] = useState(false);
  useEffect(() => {
    const t = lsGet("kb_my_card");
    if (t) window.location.replace(`/m/${t}?checkin=1`);
    else setNone(true);
  }, []);
  return (
    <div className="floor grid min-h-dvh place-items-center p-6 text-center">
      <p className="t-hand text-[20px]">{none ? "Open your card link from the gym's WhatsApp message once on this phone, then scan the poster again." : "Opening your card..."}</p>
    </div>
  );
}
