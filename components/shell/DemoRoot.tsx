"use client";
// The public demo gym runs entirely in this browser (IndexedDB "kb_demo_*").
// No demo write ever reaches the server. Same screens as a real gym.
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { demoRepo, memberDemoRepo } from "@/lib/client/store";
import { Desk } from "@/components/desk/Desk";
import { Door } from "@/components/desk/Door";
import { FeesDue } from "@/components/fees/FeesDue";
import { Freeze } from "@/components/freeze/Freeze";
import { Importer } from "@/components/import/Importer";
import { MemberCard } from "@/components/member/MemberCard";
import { Receipt } from "@/components/member/Receipt";
import { Report } from "@/components/report/Report";
import { Settings } from "@/components/settings/Settings";
import { AllBranches } from "./Account";
import { Face, Poster } from "./Screens";
import { GymProvider } from "./Gym";

const OWNERISH = new Set(["report", "owner", "settings", "import"]);

function Inner({ view }: { view: string[] }) {
  const sp = useSearchParams();
  const code = sp.get("b") === "LV" ? "LV" : "LP";
  const [v, arg] = view;
  if (v === "m") {
    const no = (arg ?? "LP-0042").toUpperCase();
    return (
      <GymProvider key={no} mode="demo" base="/demo" repo={() => memberDemoRepo(no)}>
        <MemberCard memberNo={no} />
      </GymProvider>
    );
  }
  if (v === "o") return <AllBranches demo />;
  if (v === "face") return <Face branchId={code === "LV" ? "br-vastrapur" : "br-maninagar"} />;
  if (v === "poster") return <Poster branchId={code === "LV" ? "br-vastrapur" : "br-maninagar"} />;
  if (v === "r")
    return (
      <GymProvider mode="demo" base="/demo" repo={() => demoRepo(code)}>
        <Receipt paymentId={arg ?? ""} />
      </GymProvider>
    );
  const screen =
    v === "fees" || v === "rack" ? (
      <FeesDue />
    ) : v === "freeze" || v === "board" ? (
      <Freeze />
    ) : v === "report" || v === "owner" ? (
      <Report />
    ) : v === "door" ? (
      <Door />
    ) : v === "import" ? (
      <Importer />
    ) : v === "settings" ? (
      <Settings />
    ) : (
      <Desk />
    );
  return (
    <GymProvider key={`${code}-${OWNERISH.has(v) ? "o" : "d"}`} mode="demo" base="/demo" repo={() => demoRepo(code, OWNERISH.has(v) ? { staffId: "st-owner", role: "owner" } : { staffId: "st-ravi", role: "desk" })}>
      {screen}
    </GymProvider>
  );
}

export function DemoRoot({ view }: { view: string[] }) {
  return (
    <Suspense>
      <Inner view={view} />
    </Suspense>
  );
}
