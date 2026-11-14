import type { Metadata, Viewport } from "next";
import { Big_Shoulders_Stencil, IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Devanagari, Kalam, Teko } from "next/font/google";
import { SvgDefs } from "@/components/art";
import { FxBoot } from "@/components/shell/FxBoot";
import "./globals.css";

const stencil = Big_Shoulders_Stencil({ subsets: ["latin"], axes: ["opsz"], variable: "--f-stencil", display: "swap", adjustFontFallback: false, fallback: ["IBM Plex Sans", "sans-serif"] });
const teko = Teko({ subsets: ["latin", "devanagari"], weight: ["500", "600"], variable: "--f-teko", display: "swap" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-plex", display: "swap" });
const plexDeva = IBM_Plex_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "500", "600"], variable: "--f-plex-deva", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono", display: "swap" });
const kalam = Kalam({ subsets: ["latin", "devanagari"], weight: ["400", "700"], variable: "--f-kalam", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://khatabar.vercel.app"),
  title: { default: "Khatabar: the gym register at counter speed", template: "%s · Khatabar" },
  description: "Gym ka register, counter ki speed par. Find a member from the last 4 digits, renew in three keys, take cash or UPI honestly, and send WhatsApp reminders one tap at a time.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#1A1A18", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-fx="full" data-theme="dark" className={`${stencil.variable} ${teko.variable} ${plex.variable} ${plexDeva.variable} ${mono.variable} ${kalam.variable}`} suppressHydrationWarning>
      <body>
        <SvgDefs />
        <FxBoot />
        {children}
      </body>
    </html>
  );
}
