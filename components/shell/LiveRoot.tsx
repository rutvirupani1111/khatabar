"use client";
// A real gym's screens, backed by Neon through /api. Same components as the demo.
import { Suspense } from "react";
import { liveRepo } from "@/lib/client/store";
import { Board } from "@/components/board/Board";
import { Desk } from "@/components/desk/Desk";
import { Door } from "@/components/desk/Door";
import { Importer } from "@/components/import/Importer";
import { Owner } from "@/components/owner/Owner";
import { Rack } from "@/components/rack/Rack";
import { Settings } from "@/components/settings/Settings";
import { Face, Poster } from "./Screens";
import { GymProvider, useGymState } from "./Gym";

function Gate({ children, base }: { children: React.ReactNode; base: string }) {
  const status = useGymState((s) => s.status);
  if (status === "locked")
    return (
      <div className="floor grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <p className="t-stencil text-[36px]" style={{ color: "var(--brass)" }}>
            Shutter is down
          </p>
          <p className="t-hand mt-2 text-[18px]">Unlock the desk with a staff PIN, or sign in as the owner.</p>
          <div className="mt-4 flex justify-center gap-2">
            <a className="btn-brass" href={`${base}/desk`}>
              Go to the desk
            </a>
            <a className="btn-iron" href={`/login?next=${encodeURIComponent(base)}`}>
              Owner sign in
            </a>
          </div>
        </div>
      </div>
    );
  return <>{children}</>;
}

export function LiveRoot({ branchId, view }: { branchId: string; view: string }) {
  const base = `/g/${branchId}`;
  if (view === "face") return <Face branchId={branchId} />;
  if (view === "poster") return <Poster branchId={branchId} />;
  const screen =
    view === "rack" ? <Rack /> : view === "board" ? <Board /> : view === "owner" ? <Owner /> : view === "import" ? <Importer /> : view === "door" ? <Door /> : view === "settings" ? <Settings /> : <Desk />;
  return (
    <Suspense>
      <GymProvider mode="live" base={base} repo={() => liveRepo(branchId)}>
        {view === "desk" ? screen : <Gate base={base}>{screen}</Gate>}
      </GymProvider>
    </Suspense>
  );
}
