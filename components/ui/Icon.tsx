// One icon set: 24 px grid, 2 px ink stroke, round caps. A generic chat bubble stands in for
// WhatsApp; the WhatsApp logo is never drawn.
import type { CSSProperties } from "react";

const P = {
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20",
  plus: "M12 5v14M5 12h14",
  renew: "M19 8a8 8 0 0 0-14 1M5 4v5h5M5 16a8 8 0 0 0 14-1M19 20v-5h-5",
  rupee: "M7 5h10M7 9h10M9 5c4 0 6 1.6 6 4s-2.4 4-6 4H8l7 6",
  door: "M13 4H6v16h7M10 12h10M17 9l3 3-3 3",
  chat: "M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-5 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  snow: "M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  hourglass: "M7 3h10M7 21h10M8 3c0 4 8 5 8 9s-8 5-8 9M16 3c0 4-8 5-8 9s8 5 8 9",
  menu: "M4 7h16M4 12h16M4 17h16",
  home: "M4 11 12 4l8 7M6 10v10h12V10M10 20v-5h4v5",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6V14M12 17.2v.1",
  chart: "M4 20h16M7 16v-5M12 16V7M17 16v-8",
  upload: "M12 16V4M7 9l5-5 5 5M5 15v4h14v-4",
  camera: "M4 8h4l2-3h4l2 3h4v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  keyboard: "M3 7h18v11H3zM7 11h1M11 11h1M15 11h1M8 14h8",
  back: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
  tick: "M5 12.5l4.5 4.5L19 7",
  close: "M6 6l12 12M18 6 6 18",
  down: "M6 9l6 6 6-6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  card: "M4 6h16v12H4zM4 10h16M8 15h4",
  cash: "M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10v4M18 10v4",
  phone: "M7 3h10v18H7zM11 18h2",
  undo: "M9 6 4 11l5 5M4 11h10a5 5 0 0 1 0 10h-3",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8",
  print: "M7 9V4h10v5M6 18H4v-8h16v8h-2M7 14h10v6H7z",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  out: "M14 4h6v16h-6M4 12h11M8 8l-4 4 4 4",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5",
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, size = 20, className, style, label, stroke = 2 }: { name: IconName; size?: number; className?: string; style?: CSSProperties; label?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flex: "none", ...style }} aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}>
      <path d={P[name]} />
    </svg>
  );
}

/** The logo mark: a kettlebell that is also a rolled-up shutter. */
export function KbMark({ size = 28, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden style={{ flex: "none" }}>
      <path d="M7 11 C7 2 21 2 21 11" fill="none" stroke={onDark ? "#FFF4DE" : "#1B1A2E"} strokeWidth="3" strokeLinecap="round" />
      <circle cx="14" cy="17" r="10" fill="#FF8A00" stroke="#1B1A2E" strokeWidth="2" />
      <path d="M8 14h12M8 17h12M8 20h12" stroke="#1B1A2E" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
