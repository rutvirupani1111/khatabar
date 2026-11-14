import Link from "next/link";
import { Landing } from "@/components/shell/Landing";

export default function Home() {
  return (
    <>
      <Landing />
      {/* below the fold: one register page of things to try */}
      <main className="ledger holes min-h-dvh pb-10 pt-4" data-theme="light">
        <div className="mx-auto max-w-[900px] pr-4">
          <h2 className="t-stencil pl-[72px] text-[40px] leading-[64px]" style={{ color: "var(--ink)" }}>
            Khatabar
          </h2>
          <p className="t-hand pl-[72px] text-[18px] leading-8" style={{ color: "var(--carbon)" }} lang="hi">
            Gym ka register, counter ki speed par. The gym register, at counter speed.
          </p>
          <ol className="mt-4">
            {[
              ["01", "Find a member with the last 4 digits of their phone: type 4521.", "/demo/desk"],
              ["02", "Press R, then 2, then Shift+P. A Quarterly renewal, cash, stamped PAID.", "/demo/desk"],
              ["03", "Press C to check someone in, or Simulate scan. Owing members land in the Needs a word pile.", "/demo/desk"],
              ["04", "Open a member card on your phone: the locker opens, the QR changes every 30 seconds.", "/demo/m/LP-0042"],
              ["05", "Open the member card in one tab and the desk in another; Simulate scan lands on the desk.", "/demo/m/LP-0042"],
              ["06", "Load the dues rack and walk through the WhatsApp reminders, one tap each.", "/demo/rack"],
              ["07", "Drag a magnet on the whiteboard to freeze a membership; E erases it.", "/demo/board"],
              ["08", "Read the 6 am slate the owner sees: every number opens the members behind it.", "/demo/owner"],
              ["09", "Close the shift: Ctrl+Shift+D counts the drawer before the shutter comes down.", "/demo/desk"],
              ["10", "Bring your own register: paste a messy sheet into Bahi import.", "/demo/import"],
            ].map(([n, text, href]) => (
              <li key={n} className="flex min-h-8 items-start gap-3 pr-2">
                <span className="t-mono w-[60px] shrink-0 pr-3 text-right text-[13px] leading-8" style={{ color: "var(--margin-red)" }}>
                  {n}
                </span>
                <Link href={href} className="text-[15px] leading-8 underline decoration-[var(--ledger-rule)] underline-offset-4 hover:decoration-[var(--ink)]" style={{ color: "var(--ink)" }}>
                  {text}
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-8 grid gap-0 pl-[72px] sm:grid-cols-2">
            <div>
              <h3 className="t-teko text-[20px] leading-8" style={{ color: "var(--carbon)" }}>
                What it will never pretend
              </h3>
              <ul className="text-[14px] leading-8" style={{ color: "var(--text-on-paper)" }}>
                <li>A UPI screenshot is not money. It stays PENDING until the desk sees the credit.</li>
                <li>A WhatsApp tick says opened, never delivered. You press Send yourself.</li>
                <li>Nothing is deleted. Mistakes are reversed with a line anyone can read.</li>
                <li>The drawer is counted before the shutter comes down.</li>
              </ul>
            </div>
            <div>
              <h3 className="t-teko text-[20px] leading-8" style={{ color: "var(--carbon)" }}>
                Your own gym
              </h3>
              <ul className="text-[14px] leading-8" style={{ color: "var(--text-on-paper)" }}>
                <li>
                  <Link className="underline" href="/start">
                    Open the register for your gym
                  </Link>{" "}
                  (email and password, no card).
                </li>
                <li>
                  <Link className="underline" href="/login">
                    Owner sign in
                  </Link>
                </li>
                <li>
                  <Link className="underline" href="/pricing">
                    Pricing, as a ledger page
                  </Link>
                </li>
                <li>Free tier: one branch, up to 75 active members.</li>
              </ul>
            </div>
          </div>
          <p className="t-hand mt-8 pl-[72px] text-[14px]" style={{ color: "var(--muted-on-paper)" }}>
            The demo gym, Lohapuri Iron Gym in Maninagar, is made up. Its members, phones (90000 0xxxx) and money are fictional and live only in your browser.
          </p>
        </div>
      </main>
    </>
  );
}
