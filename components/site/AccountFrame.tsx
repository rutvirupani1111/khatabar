// Sign in and Start for my gym: the shop at night, shutter down and padlocked. On wide screens the
// night street fills the page and the form is a cream notice pasted on the wall; below that the
// street sits in a band (phone) or a panel beside the form (tablet).
import type { ReactNode } from "react";
import { NightShop } from "./PageArt";

export function AccountFrame({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="relative">
      <div className="night-panel">
        <NightShop />
      </div>
      <div className="relative px-4 py-6 md:px-8 lg:w-[54%] lg:px-12 lg:py-10 xl:px-[104px]">
        <div className="notice mx-auto w-full max-w-[520px] lg:mx-0 xl:max-w-[480px]">
          <span className="tape l" aria-hidden />
          <span className="tape r" aria-hidden />
          {children}
        </div>
        {aside && <div className="mx-auto mt-4 w-full max-w-[520px] lg:mx-0 xl:max-w-[480px]">{aside}</div>}
      </div>
    </section>
  );
}
