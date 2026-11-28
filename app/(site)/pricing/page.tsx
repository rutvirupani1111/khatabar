import { SiteFrame } from "@/components/site/Frame";
import { PricingWall } from "@/components/site/PageArt";
import { TwoActions } from "@/components/site/bits";

export const metadata = { title: "Pricing", description: "Khatabar is free for one branch, up to 75 active members, with every feature. Prices for bigger gyms are not set yet." };

export default function Pricing() {
  return (
    <SiteFrame>
      <section className="relative" aria-labelledby="pricing-title">
        <div className="relative h-[220px] overflow-hidden border-b-2 border-[var(--ink)] md:absolute md:inset-0 md:h-auto md:border-0">
          <PricingWall />
        </div>
        <div className="relative mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-6 md:min-h-[calc(100svh-64px)] md:justify-center md:px-8 xl:px-[104px]">
          {/* the gym's rate list: a chalk slate hung on the shop wall, the price written in chalk */}
          <div className="rate-slate w-full max-w-[560px] p-5 md:p-7">
            <span className="nail" aria-hidden />
            <p className="t-sign text-[15px] tracking-[0.12em] opacity-80">RATE LIST</p>
            <h1 id="pricing-title" className="t-display mt-2 text-[40px] leading-[1.1] md:text-[44px]">
              Pricing
            </h1>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="t-sign price text-[40px] leading-none md:text-[48px]">₹0</span>
              <span className="text-[18px] font-bold">a month, free for one branch</span>
            </div>
            <p className="mt-2 text-[17px] font-semibold leading-snug">1 branch, up to 75 active members. Every feature: front desk, fees due reminders, freeze, owner report, import from Excel, member cards, door check-in.</p>
            <hr className="my-4 border-t-2 border-dashed border-[var(--ink)]" />
            <p className="text-[16px] leading-snug">Bigger gym or more branches? The price is not set yet. We are asking gym owners first. Nothing is ever charged without asking you.</p>
            <p className="mt-3 text-[16px] leading-snug">WhatsApp reminders cost nothing: you send them yourself from your own WhatsApp.</p>
            <div className="mt-5">
              <TwoActions />
            </div>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
