"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR drawn as SVG inside a box of fixed size, so it never shifts the layout. */
export function Qr({ text, size = 160, dark = "#0E0F10", light = "#F1EEE4", label, watermark }: { text: string; size?: number; dark?: string; light?: string; label?: string; watermark?: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark, light } })
      .then((s) => live && setSvg(s))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [text, dark, light]);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size, background: light }} role="img" aria-label={label ?? "QR code"}>
      <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      {watermark && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="t-stencil -rotate-12 px-2 text-[15px]" style={{ background: "rgba(241,238,228,.85)", color: "var(--stamp-due)", border: "2px solid var(--stamp-due)" }}>
            {watermark}
          </span>
        </div>
      )}
    </div>
  );
}
