"use client";
// Settings, one section per thing a gym owner looks after, each with a line saying what it does.
import { useEffect, useState, type ReactNode } from "react";
import { Qr } from "@/components/art/Qr";
import { RecentImports } from "@/components/import/Importer";
import { AppScreen } from "@/components/shell/AppShell";
import { useDerived, useGym, useGymState, useSnap } from "@/components/shell/Gym";
import { message, origin } from "@/components/shell/links";
import { toggleCalm } from "@/lib/client/fx";
import { rupees, toPaise, uid, VPA_RE } from "@/lib/core/money";
import { templateFor } from "@/lib/core/templates";
import type { Lang, Plan, Role, Stage } from "@/lib/core/types";

const STAGES: { k: Stage | "receipt"; label: string }[] = [
  { k: "pre7", label: "7 days before the end" },
  { k: "pre3", label: "3 days before the end" },
  { k: "day0", label: "On the last day" },
  { k: "post3", label: "3 days after it ended" },
  { k: "dues", label: "Owes money" },
  { k: "missed", label: "We miss you" },
  { k: "receipt", label: "Receipt" },
];

function Section({ id, title, line, children }: { id: string; title: string; line: string; children: ReactNode }) {
  return (
    <section id={id} className="panel-flat scroll-mt-28 p-4" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="t-display text-[22px]" style={{ fontWeight: 700 }}>
        {title}
      </h2>
      <p className="mb-3 text-[15px] text-[var(--muted-ink)]">{line}</p>
      {children}
    </section>
  );
}

export function Settings() {
  const { store, mode, lang, setLang, calm } = useGym();
  const snap = useSnap();
  const d = useDerived();
  const actor = useGymState((s) => s.actor);
  const [pair, setPair] = useState("");
  const [tplStage, setTplStage] = useState<Stage | "receipt">("pre7");
  const [tplLang, setTplLang] = useState<Lang>("en");
  const [draft, setDraft] = useState<string | null>(null);
  const [newStaff, setNewStaff] = useState({ name: "", role: "desk" as Role, pin: "" });
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const sentence = "Your gym, plans, staff, reminders and how the desk behaves.";
  if (!snap || !d)
    return (
      <AppScreen screen="settings" title="Settings" sentence={sentence} vignette="settings">
        <div className="island-skel mx-auto w-full max-w-[920px] !px-3 md:!px-6" aria-hidden>
          <i style={{ height: 300 }} />
        </div>
      </AppScreen>
    );
  const B = snap.branch;
  const S = B.settings;
  const run = (kind: string, payload: unknown, ok = "Saved") => {
    const r = store.run(kind, payload);
    store.note(r.ok ? ok : r.error ?? "Not saved", r.ok ? "ink" : "red");
  };
  const setS = (patch: Partial<typeof S>) => run("branch.update", { fields: { settings: patch } });
  const owner = actor.role === "owner" || mode === "demo";
  const sample = d.list[0];
  const body = draft ?? templateFor(snap.templates, tplStage, tplLang);
  const tplRow = snap.templates.find((t) => t.stage === tplStage && t.lang === tplLang);
  const undoImport = async (id: string) => {
    if (mode === "demo") {
      const r = store.run("import.undo", { id });
      return store.note(r.ok ? "Import undone. Those members are put away; nothing was deleted." : r.error ?? "Not undone", r.ok ? "ink" : "red");
    }
    const res = await fetch(`/api/b/${B.id}/import-undo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ importId: id }) });
    if (!res.ok) return store.note((await res.json().catch(() => ({}))).error ?? "Not undone");
    await store.refresh();
    store.note("Import undone. Those members are put away; nothing was deleted.", "ink");
  };

  return (
    <AppScreen screen="settings" title="Settings" sentence={sentence} vignette="settings">
      <div className="mx-auto flex w-full max-w-[920px] flex-col gap-4 px-3 py-4 pb-16 md:px-6">
        {!owner && <p className="rounded-xl border-2 border-[var(--ink)] bg-[var(--marigold-pale)] p-3 font-semibold">Only the owner can change most of this page. Sign in as the owner.</p>}
        <nav aria-label="Sections" className="flex flex-wrap gap-2">
          {[
            ["gym", "Gym and branch"],
            ["plans", "Plans and prices"],
            ["staff", "Staff and PINs"],
            ["reminders", "Reminders"],
            ["rush", "Rush hour mode"],
            ["view", "Language and motion"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="chip chip-filter">
              {label}
            </a>
          ))}
        </nav>
        {snap.imports.length > 0 && <RecentImports list={snap.imports} onUndo={(id) => void undoImport(id)} />}

        <Section id="gym" title="Gym and branch" line="The name, UPI ID and GSTIN that go on QR codes and receipts.">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["name", "Branch name"],
                ["city", "City or area"],
                ["vpa", "UPI ID on the QR"],
                ["payeeName", "Name on the QR"],
                ["gstin", "GSTIN on receipts"],
              ] as const
            ).map(([k, label]) => (
              <label key={k}>
                <span className="label">{label}</span>
                <input
                  className="input mt-1"
                  defaultValue={B[k]}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v === B[k]) return;
                    if (k === "vpa" && !VPA_RE.test(v)) return store.note("That UPI ID does not look right. It looks like name@bank.");
                    run("branch.update", { fields: { [k]: v } });
                  }}
                />
              </label>
            ))}
            <label>
              <span className="label">Colour band on member cards</span>
              <input type="color" className="mt-1 h-12 w-24 rounded-lg border-2 border-[var(--ink)]" defaultValue={B.color} onBlur={(e) => run("branch.update", { fields: { color: e.target.value } })} />
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-2 text-[15px]">
            {(
              [
                ["backdateWithin7", "A renewal within 7 days of the end date starts from the end date"],
                ["drawerCount", "Count the cash drawer when closing the day"],
                ["selfCheckin", "Members can check themselves in from the entrance poster (location checked)"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex min-h-11 items-center gap-3">
                <input type="checkbox" className="size-5" checked={!!S[k]} onChange={(e) => setS({ [k]: e.target.checked })} />
                {label}
              </label>
            ))}
            <label className="flex min-h-11 flex-wrap items-center gap-3">
              Discount the desk can give without a manager PIN
              <input type="number" min={0} max={50} className="input !w-24" defaultValue={S.discountLimitPct} onBlur={(e) => setS({ discountLimitPct: Number(e.target.value) || 0 })} />%
            </label>
            <label className="flex min-h-11 flex-wrap items-center gap-3">
              Times a member can be let in on credit each month
              <input type="number" min={0} max={10} className="input !w-24" defaultValue={S.creditLimit} onBlur={(e) => setS({ creditLimit: Number(e.target.value) || 0 })} />
            </label>
            {S.selfCheckin && (
              <div className="flex flex-wrap items-center gap-3">
                Gym location: {S.geofence ? `${S.geofence.lat.toFixed(4)}, ${S.geofence.lng.toFixed(4)}, within ${S.geofence.radius} m` : "not set yet"}
                <button type="button" className="btn btn-sm" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setS({ geofence: { lat: p.coords.latitude, lng: p.coords.longitude, radius: S.geofence?.radius ?? 80 } }), () => store.note("Location was not shared"))}>
                  Use this phone&apos;s location
                </button>
              </div>
            )}
          </div>
        </Section>

        <Section id="plans" title="Plans and prices" line="What the desk can sell, and the freeze rules for each plan.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead className="text-[13px] text-[var(--muted-ink)]">
                <tr>
                  <th className="py-1 pr-2 font-semibold">Name</th>
                  <th className="py-1 pr-2 font-semibold">Price (₹)</th>
                  <th className="py-1 pr-2 font-semibold">Joining fee (₹)</th>
                  <th className="py-1 pr-2 font-semibold">Freezes</th>
                  <th className="py-1 pr-2 font-semibold">Most days</th>
                  <th className="py-1 pr-2 font-semibold">Fewest days</th>
                  <th className="py-1 font-semibold">On sale</th>
                </tr>
              </thead>
              <tbody>
                {snap.plans.map((p) => (
                  <PlanRow key={p.id} p={p} onSave={(pl) => run("plan.upsert", { plan: pl })} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className="btn" onClick={() => run("plan.upsert", { plan: { id: uid(), kind: "time", nameEn: "New plan", nameHi: "", months: 1, days: 0, sessions: 0, price: 100000, joiningFee: 0, gstInclusive: true, gstRate: 18, freezeMaxCount: 1, freezeMaxDays: 7, freezeMinDays: 3, plate: "p10", active: true, sort: snap.plans.length + 1, branchId: null } }, "Plan added")}>
              Add a plan
            </button>
            <label className="flex min-h-11 items-center gap-3 text-[15px]">
              <input type="checkbox" className="size-5" checked={S.freezeApproval} onChange={(e) => setS({ freezeApproval: e.target.checked })} />
              Freeze requests from members&apos; phones wait for the desk to approve
            </label>
          </div>
        </Section>

        <Section id="staff" title="Staff and PINs" line="Who works the desk. Each person signs in on a paired desk with a 4-digit PIN.">
          <ul className="flex flex-col">
            {snap.staff.map((s) => (
              <li key={s.id} className="flex min-h-12 flex-wrap items-center gap-3 border-b border-[var(--line)]">
                <span className="w-40 truncate font-semibold">{s.name}</span>
                <span className="w-24 text-[14px]">{s.role === "desk" ? "Front desk" : s.role[0].toUpperCase() + s.role.slice(1)}</span>
                <span className={`chip ${s.active ? "chip-paid" : "chip-ended"}`}>{s.active ? "Active" : "Switched off"}</span>
                {mode === "live" && s.role !== "owner" && owner && (
                  <>
                    <button type="button" className="btn btn-sm" onClick={() => (setPinFor(s.id), setPin(""))}>
                      New PIN
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={async () => {
                        const r = await fetch(`/api/b/${B.id}/staff`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: s.id, name: s.name, role: s.role, active: !s.active }) });
                        if (r.ok) await store.refresh();
                      }}
                    >
                      {s.active ? "Switch off" : "Switch on"}
                    </button>
                  </>
                )}
                {pinFor === s.id && (
                  <span className="flex w-full items-center gap-2 pb-2">
                    <input className="input t-mono !w-28" inputMode="numeric" maxLength={4} placeholder="4 digits" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} aria-label={`New PIN for ${s.name}`} />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={pin.length !== 4}
                      onClick={async () => {
                        const r = await fetch(`/api/b/${B.id}/staff`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: s.id, name: s.name, role: s.role, pin, active: s.active }) });
                        store.note(r.ok ? "PIN changed" : "Not saved", r.ok ? "ink" : "red");
                        setPinFor(null);
                      }}
                    >
                      Save PIN
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
          {mode === "live" && owner && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label>
                <span className="label">Name</span>
                <input className="input mt-1 !w-44" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
              </label>
              <label>
                <span className="label">Job</span>
                <select className="input mt-1 !w-36" value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as Role })}>
                  <option value="desk">Front desk</option>
                  <option value="manager">Manager</option>
                  <option value="trainer">Trainer</option>
                </select>
              </label>
              <label>
                <span className="label">PIN</span>
                <input className="input t-mono mt-1 !w-24" inputMode="numeric" maxLength={4} value={newStaff.pin} onChange={(e) => setNewStaff({ ...newStaff, pin: e.target.value.replace(/\D/g, "") })} />
              </label>
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  const r = await fetch(`/api/b/${B.id}/staff`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(newStaff) });
                  if (r.ok) {
                    setNewStaff({ name: "", role: "desk", pin: "" });
                    await store.refresh();
                  } else store.note((await r.json().catch(() => ({}))).error ?? "Not saved");
                }}
              >
                Add person
              </button>
            </div>
          )}
          {mode === "demo" && <p className="mt-2 text-[14px] text-[var(--muted-ink)]">Demo PINs: Ravi 1234, Sunita 4321, Meena 9999, Imran 5555.</p>}
          <div className="mt-4">
            <h3 className="text-[16px] font-bold">Desk computers</h3>
            {mode === "live" ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    const r = await fetch(`/api/b/${B.id}/pair`, { method: "POST" });
                    const j = await r.json().catch(() => ({}));
                    if (r.ok) setPair(j.code);
                    else store.note(j.error ?? "Not allowed");
                  }}
                >
                  Pair a new desk (QR, works for 10 minutes)
                </button>
                {pair && <Qr text={`${origin()}/pair/${pair}`} size={160} label="Pairing QR" light="#FFFFFF" dark="#1B1A2E" />}
                <a className="btn" href={`/g/${B.id}/face`} target="_blank" rel="noreferrer">
                  Screen that faces the customer
                </a>
                <a className="btn" href={`/g/${B.id}/poster`} target="_blank" rel="noreferrer">
                  Print the entrance poster
                </a>
              </div>
            ) : (
              <p className="text-[15px]">In a real gym the owner shows a pairing QR here and the desk computer scans it once.</p>
            )}
          </div>
        </Section>

        <Section id="reminders" title="Reminders" line="Which reminders appear on Fees due each morning, and the words they use.">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
            {(["pre7", "pre3", "day0", "post3", "dues"] as const).map((k) => (
              <label key={k} className="flex min-h-11 items-center gap-2">
                <input type="checkbox" className="size-5" checked={S.stages[k]?.on ?? false} onChange={(e) => setS({ stages: { ...S.stages, [k]: { ...S.stages[k], on: e.target.checked } } })} />
                {STAGES.find((s) => s.k === k)?.label}
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button key={s.k} type="button" className="chip chip-filter" aria-pressed={tplStage === s.k} onClick={() => (setTplStage(s.k), setDraft(null))}>
                {s.label}
              </button>
            ))}
            <button type="button" className="chip chip-filter" onClick={() => (setTplLang(tplLang === "en" ? "hi" : "en"), setDraft(null))}>
              {tplLang === "en" ? "English" : "Hinglish"}
            </button>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <label>
                <span className="label">Message words</span>
                <textarea className="input mt-1 !min-h-[160px] text-[14px]" value={body} onChange={(e) => setDraft(e.target.value)} />
              </label>
              <p className="t-mono mt-1 text-[12px] text-[var(--muted-ink)]">{"{first_name} {plan} {expiry} {days_left} {amount} {pay_link} {gym} {staff}"}</p>
              <button
                type="button"
                className="btn btn-sm mt-2"
                disabled={draft == null}
                onClick={() => {
                  run("template.upsert", { template: { id: tplRow?.id ?? uid(), stage: tplStage, lang: tplLang, body } });
                  setDraft(null);
                }}
              >
                Save these words
              </button>
            </div>
            <div className="rounded-2xl border-2 border-[var(--ink)] bg-[#E9F6EE] p-3">
              <p className="text-[13px] font-semibold text-[var(--muted-ink)]">Preview for {sample?.m.name}</p>
              {sample && (
                <p className="mt-2 rounded-[14px_14px_14px_4px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-[14px]">
                  {message(draft != null ? { ...snap, templates: [{ id: "x", orgId: "", stage: tplStage, lang: tplLang, body }] } : snap, mode, sample, tplStage, tplLang, "Ravi", { amount: sample.dues || sample.plan?.price, paymentId: "sample" })}
                </p>
              )}
            </div>
          </div>
        </Section>

        <Section id="rush" title="Rush hour mode" line="The search box stays ready after every action and animations are off. Turns on by itself during your rush hours.">
          <label className="flex flex-wrap items-center gap-3 text-[15px]">
            Rush hours
            <input className="input !w-72" defaultValue={S.rushHours.map((r) => r.join("-")).join(", ")} onBlur={(e) => setS({ rushHours: e.target.value.split(",").map((x) => x.trim().split("-").map((y) => y.trim()) as [string, string]).filter((r) => /^\d\d:\d\d$/.test(r[0]) && /^\d\d:\d\d$/.test(r[1] ?? "")) })} />
          </label>
          <p className="mt-1 text-[13px] text-[var(--muted-ink)]">Write them like 05:30-09:30, 17:30-21:30</p>
        </Section>

        <Section id="view" title="Language and motion" line="How the screens look on this computer.">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => setLang(lang === "en" ? "hi" : "en")}>
              {lang === "en" ? "हिंदी में दिखाएँ" : "Show in English"}
            </button>
            <button type="button" className="btn" aria-pressed={calm} onClick={toggleCalm}>
              Less motion
            </button>
          </div>
        </Section>

        <Section id="data" title="Member data requests" line="Members can ask from their phone card for a copy of their data, or to be erased.">
          {snap.tasks
            .filter((t) => !t.doneAt)
            .map((t) => {
              const m = snap.members.find((x) => x.id === t.memberId);
              return <TaskRow key={t.id} name={`${m?.name ?? "A member"} (${m?.memberNo ?? ""})`} kind={t.kind} owner={owner} onErase={() => (run("member.anonymise", { id: t.memberId }, "Erased"), run("task.done", { id: t.id }))} onDone={() => run("task.done", { id: t.id }, "Marked done")} />;
            })}
          {!snap.tasks.filter((t) => !t.doneAt).length && <p className="text-[15px] text-[var(--muted-ink)]">No requests.</p>}
          <div className="mt-3">
            {mode === "live" ? (
              <a className="btn" href={`/api/b/${B.id}/export`}>
                Download all members as a CSV file
              </a>
            ) : (
              <p className="text-[15px]">A real gym downloads its members as a CSV file here.</p>
            )}
          </div>
        </Section>
      </div>
    </AppScreen>
  );
}

function TaskRow({ name, kind, owner, onErase, onDone }: { name: string; kind: "export" | "erase"; owner: boolean; onErase: () => void; onDone: () => void }) {
  const [sure, setSure] = useState(false);
  useEffect(() => {
    if (!sure) return;
    const id = setTimeout(() => setSure(false), 6000);
    return () => clearTimeout(id);
  }, [sure]);
  return (
    <div className="flex min-h-12 flex-wrap items-center gap-3 border-b border-[var(--line)]">
      <span className="flex-1">
        {name} asked to {kind === "erase" ? "erase their details" : "get a copy of their data"}
      </span>
      {kind === "erase" && owner && (
        <button type="button" className={`btn btn-sm ${sure ? "btn-danger" : ""}`} onClick={() => (sure ? onErase() : setSure(true))}>
          {sure ? "Press again to erase (payments stay)" : "Erase their details"}
        </button>
      )}
      <button type="button" className="btn btn-sm" onClick={onDone}>
        Done
      </button>
    </div>
  );
}

function PlanRow({ p, onSave }: { p: Plan; onSave: (p: Plan) => void }) {
  const save = (patch: Partial<Plan>) => onSave({ ...p, ...patch });
  const num = "input !min-h-10 !w-24 t-mono";
  return (
    <tr className="border-t border-[var(--line)]">
      <td className="py-1.5 pr-2">
        <input className="input !min-h-10" defaultValue={p.nameEn} onBlur={(e) => e.target.value !== p.nameEn && save({ nameEn: e.target.value })} aria-label="Plan name" />
      </td>
      <td className="py-1.5 pr-2">
        <input className={num} inputMode="numeric" defaultValue={p.price / 100} onBlur={(e) => toPaise(e.target.value) !== p.price && save({ price: toPaise(e.target.value) })} aria-label={`Price, now ${rupees(p.price)}`} />
      </td>
      <td className="py-1.5 pr-2">
        <input className={num} inputMode="numeric" defaultValue={p.joiningFee / 100} onBlur={(e) => toPaise(e.target.value) !== p.joiningFee && save({ joiningFee: toPaise(e.target.value) })} aria-label="Joining fee" />
      </td>
      <td className="py-1.5 pr-2">
        <input className={num} inputMode="numeric" defaultValue={p.freezeMaxCount} onBlur={(e) => Number(e.target.value) !== p.freezeMaxCount && save({ freezeMaxCount: Number(e.target.value) || 0 })} aria-label="Most freezes per term" />
      </td>
      <td className="py-1.5 pr-2">
        <input className={num} inputMode="numeric" defaultValue={p.freezeMaxDays} onBlur={(e) => Number(e.target.value) !== p.freezeMaxDays && save({ freezeMaxDays: Number(e.target.value) || 0 })} aria-label="Most freeze days" />
      </td>
      <td className="py-1.5 pr-2">
        <input className={num} inputMode="numeric" defaultValue={p.freezeMinDays} onBlur={(e) => Number(e.target.value) !== p.freezeMinDays && save({ freezeMinDays: Number(e.target.value) || 1 })} aria-label="Fewest days per freeze" />
      </td>
      <td className="py-1.5">
        <input type="checkbox" className="size-5" defaultChecked={p.active} onChange={(e) => save({ active: e.target.checked })} aria-label="Plan on sale" />
      </td>
    </tr>
  );
}
