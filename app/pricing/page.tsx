import Link from "next/link";

export const metadata = { title: "Pricing" };

const ROWS: [string, string, string][] = [
  ["Free", "1 branch, up to 75 active members", "₹0"],
  ["Desk", "1 branch, up to 200 active members", "to be set with owners"],
  ["Floor", "1 branch, up to 500 active members", "to be set with owners"],
  ["Iron", "1 branch, any number of members", "to be set with owners"],
  ["Chains", "a discount for each extra branch", "to be set with owners"],
];

export default function Pricing() {
  return (
    <main className="ledger holes min-h-dvh pb-16 pt-6" data-theme="light">
      <div className="mx-auto max-w-[760px] pl-[72px] pr-4">
        <Link href="/" className="t-teko text-[16px] underline" style={{ color: "var(--carbon)" }}>
          Khatabar
        </Link>
        <h1 className="t-stencil text-[40px] leading-[64px]" style={{ color: "var(--ink)" }}>
          Pricing
        </h1>
        <p className="t-hand text-[17px] leading-8" style={{ color: "var(--carbon)" }}>
          A proposal to test with gym owners, not a promise. Every v1 feature is in the free tier, because v1 reminders are one-tap WhatsApp links and cost nothing to send.
        </p>
        <div className="mt-4">
          {ROWS.map(([t, what, price]) => (
            <div key={t} className="grid min-h-8 grid-cols-[90px_1fr_auto] items-center gap-3">
              <span className="t-teko text-[19px] leading-8" style={{ color: "var(--ink)" }}>
                {t}
              </span>
              <span className="text-[14px] leading-8" style={{ color: "var(--text-on-paper)" }}>
                {what}
              </span>
              <span className="t-mono text-right text-[13px] leading-8" style={{ color: "var(--margin-red)" }}>
                {price}
              </span>
            </div>
          ))}
        </div>
        <p className="t-hand mt-6 text-[15px] leading-8" style={{ color: "var(--carbon)" }}>
          Paid tiers are priced after interviews with ten gym owners. Automatic WhatsApp sending (v2) would be charged at Meta&apos;s own per-message cost, shown per branch.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/start" className="btn-brass">
            Open your register free
          </Link>
          <Link href="/demo/desk" className="btn-ink">
            Try the demo desk
          </Link>
        </div>
      </div>
    </main>
  );
}
