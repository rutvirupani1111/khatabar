"use client";
// A camera strip that reads member QR codes: BarcodeDetector where the browser has it, zxing otherwise.
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function CameraStrip({ onCode, onClose, tall }: { onCode: (code: string) => void; onClose?: () => void; tall?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  const last = useRef({ code: "", at: 0 });
  useEffect(() => {
    let stop = () => {};
    let alive = true;
    const hit = (code: string) => {
      const now = Date.now();
      if (code === last.current.code && now - last.current.at < 2500) return;
      last.current = { code, at: now };
      onCode(code);
    };
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!alive) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        type BD = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };
        const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BD };
        if (W.BarcodeDetector) {
          const det = new W.BarcodeDetector({ formats: ["qr_code"] });
          let t = 0;
          const tick = async () => {
            if (!alive) return;
            try {
              const r = await det.detect(v);
              if (r[0]) hit(r[0].rawValue);
            } catch {}
            t = window.setTimeout(tick, 180);
          };
          void tick();
          stop = () => {
            clearTimeout(t);
            stream.getTracks().forEach((x) => x.stop());
          };
        } else {
          const { BrowserQRCodeReader } = await import("@zxing/browser");
          const reader = new BrowserQRCodeReader();
          stream.getTracks().forEach((x) => x.stop());
          const ctl = await reader.decodeFromVideoDevice(undefined, v, (res: { getText(): string } | undefined) => res && hit(res.getText()));
          stop = () => ctl.stop();
        }
      } catch {
        setErr("Camera not available here. Use a USB scanner, or type the last 4 digits.");
      }
    })();
    return () => {
      alive = false;
      stop();
    };
  }, [onCode]);
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--ink)]" style={{ height: tall ? "100%" : 200 }}>
      <video ref={video} muted playsInline className="h-full w-full object-cover" aria-label="Camera" />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="size-36 rounded-xl border-4 border-[var(--marigold)]" />
      </div>
      {err && <p className="absolute inset-x-3 bottom-3 rounded-lg bg-[var(--paper)] p-2 text-[14px] font-semibold">{err}</p>}
      {onClose && (
        <button type="button" className="btn btn-sm absolute right-2 top-2" onClick={onClose}>
          <Icon name="close" size={16} /> Close camera
        </button>
      )}
    </div>
  );
}
