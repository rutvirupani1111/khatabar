// Sign in and Start for my gym: the shop at night, shutter down and padlocked, with the form on a
// cream notice beside it.
import type { ReactNode } from "react";
import { NightShop } from "./PageArt";

export function AccountFrame({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="relative">
      <div className="relative h-[200px] overflow-hidden border-b-2 border-[var(--ink)] lg:fixed lg:inset-y-0 lg:right-0 lg:top-16 lg:h-auto lg:w-[46%] lg:border-b-0 lg:border-l-2">
        <NightShop />
      </div>
      <div className="relative px-4 py-6 md:px-8 lg:w-[54%] lg:px-[104px] lg:py-10">
        <div className="notice mx-auto w-full max-w-[520px] lg:mx-0">
          <span className="tape l" aria-hidden />
          <span className="tape r" aria-hidden />
          {children}
        </div>
        {aside && <div className="mx-auto mt-4 w-full max-w-[520px] lg:mx-0">{aside}</div>}
      </div>
    </section>
  );
}
