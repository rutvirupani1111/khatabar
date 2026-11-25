"use client";
// Scene 5's demo: Mahesh's real member card from the demo gym, in a phone. Renew him at the counter
// above and the date here moves; Check in Mahesh runs the same door rules the app uses.
import { useEffect, useMemo, useState } from "react";
import { useCheckin } from "@/components/desk/checkin";
import { useDerived, useSnap } from "@/components/shell/Gym";
import { MemberCard } from "@/components/member/MemberCard";
import { Icon } from "@/components/ui/Icon";
import { istClock } from "@/lib/core/dates";
import { rupees } from "@/lib/core/money";
import { computeSlate } from "@/lib/core/slate";
import { streetBus } from "@/lib/client/street";
import { DemoFooter, StreetGym } from "./shared";

export default function CardDemo() {
  return (
    <StreetGym>
      <Door />
    </StreetGym>
  );
}

function Door() {
  const snap = useSnap()!;
  const d = useDerived()!;
  const { checkIn } = useCheckin();
  const st = d.byNo.get("LP-0042");
  const [slip, setSlip] = useState<{ ok: boolean; text: string } | null>(null);
  const inToday = useMemo(() => computeSlate(snap).checkinsToday, [snap]);
  useEffect(() => streetBus.on((e) => e === "reset" && setSlip(null)), []);
  return (
    <div className="flex flex-col gap-3">
      <div className="card-reveal">
        <div className="phone-frame md-up">
          <span className="notch" aria-hidden />
          <div className="screen max-h-[560px] overflow-y-auto pt-4">
            <MemberCard variant="embed" memberNo="LP-0042" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-success btn-lg"
          disabled={!st}
          onClick={() => {
            if (!st) return;
            const ev = checkIn(st.m.id, "desk_scan");
            if (ev.kind === "ok") {
              setSlip({ ok: true, text: `Welcome, ${st.m.name.split(" ")[0]}. Checked in at ${istClock(Date.now())}.` });
              streetBus.emit("checked-in");
            } else if (ev.kind === "dues") setSlip({ ok: false, text: `${st.m.name.split(" ")[0]} owes ${rupees(st.dues)}. Please see the desk.` });
            else if (ev.kind === "already") setSlip({ ok: true, text: `${st.m.name.split(" ")[0]} is already in today. ${ev.text}.` });
            else setSlip({ ok: false, text: `${ev.text}. Please see the desk.` });
          }}
        >
          <Icon name="door" size={20} /> Check in Mahesh
        </button>
        <span className="text-[15px] font-semibold">Checked in today: {inToday}</span>
      </div>
      {slip && (
        <p className={`rounded-xl border-2 border-[var(--ink)] p-3 text-[16px] font-bold ${slip.ok ? "bg-[var(--paan)] text-white" : "bg-[var(--rani)] text-white"}`} role="status">
          {slip.text}
        </p>
      )}
      <DemoFooter href="/demo/m/LP-0042" />
    </div>
  );
}
