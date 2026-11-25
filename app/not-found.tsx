import "./site.css";
import Link from "next/link";
import { SiteFrame } from "@/components/site/Frame";
import { LostSign } from "@/components/site/PageArt";

export default function NotFound() {
  return (
    <SiteFrame>
      <section className="mx-auto flex max-w-[960px] flex-col items-center gap-6 px-4 py-10 md:flex-row md:py-20">
        <div className="w-full md:w-1/2">
          <LostSign />
        </div>
        <div className="flex flex-col gap-4 md:w-1/2">
          <h1 className="t-display text-[40px] leading-tight">This page is not here.</h1>
          <p className="text-[17px]">The link may be old, or it was typed with a small mistake. Moti looked everywhere.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="btn btn-lg">
              Go home
            </Link>
            <Link href="/demo/desk" className="btn btn-primary btn-lg">
              Try the demo desk
            </Link>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
