import Link from "next/link";

export default function NotFound() {
  return (
    <main className="ledger holes grid min-h-dvh place-items-center p-6 text-center" data-theme="light">
      <div>
        <p className="t-stencil text-[56px]" style={{ color: "var(--ink)" }}>
          Not in the register
        </p>
        <p className="t-hand mt-2 text-[19px]" style={{ color: "var(--carbon)" }}>
          This page was never written down, or its link was cancelled.
        </p>
        <Link href="/" className="btn-brass mt-6">
          Back to the shutter
        </Link>
      </div>
    </main>
  );
}
