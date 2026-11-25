"use client";
// A real gym's screens, backed by Neon through /api. Same components as the demo. A desk that is not
// open yet asks for a staff PIN (on a paired computer) or the owner's sign in.
import Link from "next/link";
import { Suspense, useState } from "react";
import { liveRepo } from "@/lib/client/store";
import { Desk } from "@/components/desk/Desk";
import { Door } from "@/components/desk/Door";
import { FeesDue } from "@/components/fees/FeesDue";
import { Freeze } from "@/components/freeze/Freeze";
import { Importer } from "@/components/import/Importer";
import { Report } from "@/components/report/Report";
import { Settings } from "@/components/settings/Settings";
import { KbMark } from "@/components/ui/Icon";
import { Face, Poster } from "./Screens";
import { GymProvider, useGym, useGymState } from "./Gym";

function PinGate({ children, base, branchId }: { children: React.ReactNode; base: string; branchId: string }) {
  const status = useGymState((s) => s.status);
  const { store } = useGym();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (status !== "locked") return <>{children}</>;
  const open = async () => {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/pin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branchId, pin }) });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(body.error ?? "That PIN did not match. Try again.");
    await store.reinit();
  };
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--cream)] p-6">
      <form
        className="panel flex w-full max-w-[420px] flex-col gap-3 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void open();
        }}
      >
        <KbMark size={40} />
        <h1 className="t-display text-[28px]">Open the front desk</h1>
        <p className="text-[15px]">Type your 4-digit staff PIN. This works on a desk computer your owner has paired.</p>
        <label>
          <span className="label">Your PIN</span>
          <input autoFocus type="password" inputMode="numeric" maxLength={4} className="input t-mono mt-1 text-[22px] tracking-[0.4em]" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </label>
        {err && (
          <p role="alert" className="rounded-lg bg-[#fde2ea] p-2 text-[14px] font-semibold text-[#9b0f3f]">
            {err}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-lg" disabled={pin.length !== 4 || busy}>
          {busy ? "Opening..." : "Open the desk"}
        </button>
        <Link className="text-[15px] font-semibold underline" href={`/login?next=${encodeURIComponent(base + "/desk")}`}>
          Owner? Sign in with email instead
        </Link>
        <Link className="text-[14px] underline" href="/">
          Back to Khatabar home
        </Link>
      </form>
    </div>
  );
}

export function LiveRoot({ branchId, view }: { branchId: string; view: string }) {
  const base = `/g/${branchId}`;
  if (view === "face") return <Face branchId={branchId} />;
  if (view === "poster") return <Poster branchId={branchId} />;
  const screen =
    view === "fees" || view === "rack" ? (
      <FeesDue />
    ) : view === "freeze" || view === "board" ? (
      <Freeze />
    ) : view === "report" || view === "owner" ? (
      <Report />
    ) : view === "import" ? (
      <Importer />
    ) : view === "door" ? (
      <Door />
    ) : view === "settings" ? (
      <Settings />
    ) : (
      <Desk />
    );
  return (
    <Suspense>
      <GymProvider mode="live" base={base} repo={() => liveRepo(branchId)}>
        <PinGate base={base} branchId={branchId}>
          {screen}
        </PinGate>
      </GymProvider>
    </Suspense>
  );
}
