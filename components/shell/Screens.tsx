"use client";
// /face: a second screen turned to the customer, showing the desk's UPI QR full size.
// /poster: the printable A4 check-in poster for the entrance.
import { useEffect, useState } from "react";
import { Qr } from "@/components/art/Qr";
import { KbMark } from "@/components/ui/Icon";
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
    <div className="grid min-h-dvh place-items-center bg-[var(--cream)] p-6 text-center">
      {qr ? (
        <div className="flex flex-col items-center gap-4">
          <div className="text-[26px] font-bold">Scan with any UPI app</div>
          <div className="rounded-3xl border-4 border-[var(--ink)] bg-white p-4">
            <Qr text={qr.text} size={340} watermark={qr.demo ? "DEMO, do not pay" : undefined} label={`Pay ${rupees(qr.amount)}`} light="#FFFFFF" dark="#1B1A2E" />
          </div>
          <div className="t-mono text-[64px] font-medium">{rupees(qr.amount)}</div>
          <div className="text-[22px]">for {qr.name}</div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <KbMark size={64} />
          <div className="t-display text-[44px]">Pay here</div>
          <p className="max-w-[460px] text-[18px] text-[var(--muted-ink)]">The QR appears here when the desk picks UPI. Keep this page open on the screen that faces the counter.</p>
        </div>
      )}
    </div>
  );
}

export function Poster({ branchId }: { branchId: string }) {
  const url = `${origin()}/checkin/${branchId}`;
  return (
    <div className="mx-auto my-4 flex min-h-[1000px] w-full max-w-[794px] flex-col items-center justify-between rounded-3xl border-4 border-[var(--ink)] bg-[var(--cream)] p-12 text-center print:my-0 print:border-0">
      <div>
        <KbMark size={56} />
        <div className="t-display mt-2 text-[72px] leading-none">Check in here</div>
        <div className="t-display mt-2 text-[40px]" lang="hi">
          हाज़िरी यहाँ लगाएँ
        </div>
      </div>
      <div className="rounded-3xl border-4 border-[var(--ink)] bg-white p-4">
        <Qr text={url} size={420} label="Check-in QR" light="#FFFFFF" dark="#1B1A2E" />
      </div>
      <div>
        <p className="text-[20px]">Scan with your phone camera. Your Khatabar card opens and checks you in.</p>
        <p className="t-mono mt-2 text-[14px] text-[var(--muted-ink)]">{url}</p>
        <button type="button" className="btn no-print mt-4" onClick={() => window.print()}>
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
    <div className="grid min-h-dvh place-items-center bg-[var(--cream)] p-6 text-center">
      <p className="max-w-[420px] text-[19px] font-semibold">{none ? "Open your card link from the gym's WhatsApp message once on this phone, then scan the poster again." : "Opening your card..."}</p>
    </div>
  );
}
