import type { Metadata, Viewport } from "next";
import { Baloo_2, Bungee, IBM_Plex_Mono, Mukta } from "next/font/google";
import { FxBoot } from "@/components/shell/FxBoot";
import "./globals.css";

// Baloo 2 is variable (one file, 400 to 800) and has Devanagari, so the Hindi toggle keeps one face.
// Only its Latin file is preloaded; the H1 is the largest paint on the home page.
const display = Baloo_2({ subsets: ["latin"], variable: "--f-display", display: "swap" });
const body = Mukta({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--f-body", display: "swap", preload: false });
const sign = Bungee({ subsets: ["latin"], weight: "400", variable: "--f-sign", display: "swap", preload: false });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--f-mono", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL("https://khatabar.vercel.app"),
  title: { default: "Khatabar: the front desk app for your gym", template: "%s · Khatabar" },
  description: "Khatabar is the front desk app for Indian gyms. Find any member from the last 4 digits of their phone, take fees in cash or UPI, freeze memberships and send polite WhatsApp reminders. Free for one branch.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#2A2A72", width: "device-width", initialScale: 1 };

// Runs before first paint: the motion tier and the language are on <html> before anything draws,
// so "Less motion" and हिंदी never flash the other version first.
const BOOT = `(function(){var d=document.documentElement;try{var s=null,l=null;try{s=localStorage.getItem('kb_fx');l=localStorage.getItem('kb_lang')}catch(e){}var r=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;if(s==='calm'||(s!=='full'&&r))d.setAttribute('data-fx','calm');else{var n=navigator;if((n.hardwareConcurrency||8)<=4||(n.deviceMemory||8)<=4)d.setAttribute('data-fx','lite')}if(l==='hi')d.setAttribute('data-lang','hi')}catch(e){}d.setAttribute('data-js','1')})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-fx="full" className={`${display.variable} ${body.variable} ${sign.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <FxBoot />
        {children}
      </body>
    </html>
  );
}
