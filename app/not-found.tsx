import "./site.css";
import Link from "next/link";
import { SiteFrame } from "@/components/site/Frame";
import { LostStreet } from "@/components/site/PageArt";

// The 404 is a stop on the street too: a blank signboard, Moti puzzled beside it, two ways out.
export default function NotFound() {
  return (
    <SiteFrame>
      <section className="relative" aria-labelledby="lost-title">
        <div className="relative h-[220px] overflow-hidden border-b-2 border-[var(--ink)] md:absolute md:inset-0 md:h-auto md:border-0">
          <LostStreet />
        </div>
        <div className="relative mx-auto flex max-w-[1440px] flex-col px-4 py-6 md:min-h-[calc(100svh-64px)] md:justify-center md:px-8 xl:px-[104px]">
          <div className="notice w-full max-w-[480px]">
            <span className="tape l" aria-hidden />
            <span className="tape r" aria-hidden />
            <h1 id="lost-title" className="t-display text-[40px] leading-tight">
              This page is not here.
            </h1>
            <p className="mt-3 text-[17px]">The link may be old, or it was typed with a small mistake. Moti looked everywhere.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/" className="btn btn-lg">
                Go home
              </Link>
              <Link href="/demo/desk" className="btn btn-primary btn-lg">
                Try the demo desk
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
