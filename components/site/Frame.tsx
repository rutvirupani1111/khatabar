// The frame every marketing page shares: the same labelled nav, the footer, the phone action bar.
import Link from "next/link";
import type { ReactNode } from "react";
import { ACTIONS, FOOTER } from "@/lib/i18n/site";
import { WorldDefs } from "@/components/world/kit";
import { T } from "./bits";
import { ActionBar, CtaLink, LangToggle, LessMotionSwitch, SiteMotion, SiteNav } from "./client";

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="site-root">
      <WorldDefs />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-[var(--paper)] focus:p-2">
        Skip to the page
      </a>
      <SiteNav />
      <main id="main">{children}</main>
      <SiteFooter />
      <ActionBar />
      <SiteMotion />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="on-dark border-t-2 border-[var(--ink)] bg-[var(--indigo)] text-[var(--cream)]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-10 md:px-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-[420px]">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
              <path d="M7 11 C7 2 21 2 21 11" fill="none" stroke="#FFF4DE" strokeWidth="3" strokeLinecap="round" />
              <circle cx="14" cy="17" r="10" fill="#FF8A00" stroke="#1B1A2E" strokeWidth="2" />
              <path d="M8 14h12M8 17h12M8 20h12" stroke="#1B1A2E" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="t-sign text-[22px]">KHATABAR</span>
          </Link>
          <p className="mt-3 text-[15px] leading-relaxed">
            <T v={FOOTER.line} />
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-1 text-[16px] font-semibold sm:grid-cols-3">
          <Link className="flex min-h-11 items-center underline-offset-4 hover:underline" href="/#how">
            <T v={ACTIONS.how} />
          </Link>
          <Link className="flex min-h-11 items-center underline-offset-4 hover:underline" href="/pricing">
            <T v={ACTIONS.pricing} />
          </Link>
          <Link className="flex min-h-11 items-center underline-offset-4 hover:underline" href="/login">
            <T v={ACTIONS.signIn} />
          </Link>
          <CtaLink className="flex min-h-11 items-center underline-offset-4 hover:underline" href="/demo/desk">
            <T v={ACTIONS.demo} />
          </CtaLink>
          <CtaLink className="flex min-h-11 items-center underline-offset-4 hover:underline" href="/start">
            <T v={ACTIONS.start} />
          </CtaLink>
        </nav>
        <div className="flex flex-wrap items-center gap-4">
          <LangToggle cls="btn-ondark" />
          <LessMotionSwitch />
        </div>
      </div>
    </footer>
  );
}
