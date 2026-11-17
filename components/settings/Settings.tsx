"use client";
// Owner settings on register paper: branch, rules, plans, staff, templates,
// pairing, data requests and export.
import { useState } from "react";
import { Plate } from "@/components/art";
import { Qr } from "@/components/art/Qr";
import { RecentImports } from "@/components/import/Importer";
import { Bubble } from "@/components/rack/Rack";
import { useDerived, useGym, useGymState, useSnap } from "@/components/shell/Gym";
import { message, origin } from "@/components/shell/links";
import { MarginNotes, TopBar } from "@/components/shell/TopBar";
import { rupees, toPaise, uid, VPA_RE } from "@/lib/core/money";
import { STAGE_LABEL, templateFor } from "@/lib/core/templates";
import type { Lang, Plan, PlateKey, Role, Stage } from "@/lib/core/types";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="t-teko mt-6 text-[22px] leading-8" style={{ color: "var(--margin-red)" }}>
      {children}
    </h2>
  );
}

export function Settings() {
  const { store, mode } = useGym();
  const snap = useSnap();
  const d = useDerived();
  const actor = useGymState((s) => s.actor);
  const [pair, setPair] = useState("");
  const [tplStage, setTplStage] = useState<Stage | "receipt">("pre7");
  const [tplLang, setTplLang] = useState<Lang>("en");
  const [draft, setDraft] = useState<string | null>(null);
  const [newStaff, setNewStaff] = useState({ name: "", role: "desk" as Role, pin: "" });
  if (!snap || !d) return <div className="ledger-plain min-h-dvh" />;
  const B = snap.branch;
  const S = B.settings;
  const run = (kind: string, payload: unknown, ok = "Saved") => {
    const r = store.run(kind, payload);
    store.note(r.ok ? ok : r.error ?? "Not saved", r.ok ? "ink" : "red");
  };
  const setS = (patch: Partial<typeof S>) => run("branch.update", { fields: { settings: patch } });
  const owner = actor.role === "owner";
  const sample = d.list[0];
  const body = draft ?? templateFor(snap.templates, tplStage, tplLang);
  const tplRow = snap.templates.find((t) => t.stage === tplStage && t.lang === tplLang);

  return (
    <div className="ledger-plain flex min-h-dvh flex-col" data-theme="light">
      <TopBar compact />
      <main className="ledger mx-auto w-full max-w-[920px] pb-16 pl-[72px] pr-4 pt-2">
        <h1 className="t-stencil text-[38px] leading-[64px]" style={{ color: "var(--ink)" }}>
          Settings · {B.name}
        </h1>
        {!owner && <p className="t-hand text-[16px] leading-8" style={{ color: "var(--margin-red)" }}>Only the owner can change most of this page. Sign in as the owner.</p>}
        {snap.imports.length > 0 && (
          <div className="-ml-[72px]">
            <RecentImports
              list={snap.imports}
              onUndo={async (id) => {
                if (mode === "demo") {
                  const r = store.run("import.undo", { id });
                  return store.note(r.ok ? "Import undone. Those members are archived, nothing was deleted." : r.error ?? "Not undone", r.ok ? "ink" : "red");
                }
                const res = await fetch(`/api/b/${B.id}/import-undo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ importId: id }) });
                if (!res.ok) return store.note((await res.json().catch(() => ({}))).error ?? "Not undone");
                await store.refresh();
                store.note("Import undone. Those members are archived, nothing was deleted.", "ink");
              }}
            />
          </div>
        )}

        <H>Branch</H>
        <div className="grid gap-x-4 sm:grid-cols-2">
          {(
            [
              ["name", "Branch name"],
              ["city", "City"],
              ["vpa", "UPI ID on the QR"],
              ["payeeName", "Name on the QR"],
              ["gstin", "GSTIN on receipts"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="block">
              <span className="t-teko block text-[15px] leading-8" style={{ color: "var(--carbon)" }}>
                {label}
              </span>
              <input
                className="field"
                defaultValue={B[k]}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v === B[k]) return;
                  if (k === "vpa" && !VPA_RE.test(v)) return store.note("That UPI ID does not look right");
                  run("branch.update", { fields: { [k]: v } });
                }}
              />
            </label>
          ))}
          <label className="block">
            <span className="t-teko block text-[15px] leading-8" style={{ color: "var(--carbon)" }}>
              Card band colour
            </span>
            <input type="color" className="h-8 w-20" defaultValue={B.color} onBlur={(e) => run("branch.update", { fields: { color: e.target.value } })} />
          </label>
        </div>

        <H>Desk rules</H>
        <div className="flex flex-col text-[14px] leading-8" style={{ color: "var(--text-on-paper)" }}>
          {(
            [
              ["backdateWithin7", "Renewals within 7 days of lapse start from the lapse date"],
              ["freezeApproval", "Freeze requests from the member card need the desk's approval"],
              ["drawerCount", "Count the cash drawer when closing a shift"],
              ["selfCheckin", "Allow self check-in from the entrance poster (location checked)"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex min-h-8 items-center gap-3">
              <input type="checkbox" className="size-4" checked={!!S[k]} onChange={(e) => setS({ [k]: e.target.checked })} />
              {label}
            </label>
          ))}
          <label className="flex min-h-8 items-center gap-3">
            Desk discount limit without a manager PIN
            <input type="number" min={0} max={50} className="field !w-20" defaultValue={S.discountLimitPct} onBlur={(e) => setS({ discountLimitPct: Number(e.target.value) || 0 })} />%
          </label>
          <label className="flex min-h-8 items-center gap-3">
            Let in on credit, times per member per month
            <input type="number" min={0} max={10} className="field !w-20" defaultValue={S.creditLimit} onBlur={(e) => setS({ creditLimit: Number(e.target.value) || 0 })} />
          </label>
          <label className="flex min-h-8 items-center gap-3">
            Rush hours (Queue Mode turns itself on)
            <input className="field !w-64" defaultValue={S.rushHours.map((r) => r.join("-")).join(", ")} onBlur={(e) => setS({ rushHours: e.target.value.split(",").map((x) => x.trim().split("-").map((y) => y.trim()) as [string, string]).filter((r) => /^\d\d:\d\d$/.test(r[0]) && /^\d\d:\d\d$/.test(r[1] ?? "")) })} />
          </label>
          {S.selfCheckin && (
            <div className="flex min-h-8 flex-wrap items-center gap-3">
              Gym location: {S.geofence ? `${S.geofence.lat.toFixed(4)}, ${S.geofence.lng.toFixed(4)} within ${S.geofence.radius} m` : "not set"}
              <button type="button" className="btn-ink !min-h-7" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setS({ geofence: { lat: p.coords.latitude, lng: p.coords.longitude, radius: S.geofence?.radius ?? 80 } }), () => store.note("Location was not shared"))}>
                Use this phone&apos;s location now
              </button>
              <a className="btn-ink !min-h-7" href={mode === "live" ? `/g/${B.id}/poster` : "#"} target="_blank" rel="noreferrer">
                Print the entrance poster
              </a>
            </div>
          )}
        </div>

        <H>Reminder stages</H>
        <div className="flex flex-wrap gap-x-6 text-[14px] leading-8">
          {(["pre7", "pre3", "day0", "post3", "dues"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" className="size-4" checked={S.stages[k]?.on ?? false} onChange={(e) => setS({ stages: { ...S.stages, [k]: { ...S.stages[k], on: e.target.checked } } })} />
              {STAGE_LABEL[k]}
            </label>
          ))}
        </div>

        <H>Plans</H>
        <div className="overflow-x-auto">
          <div className="t-teko grid min-w-[640px] grid-cols-[30px_1.2fr_90px_90px_70px_70px_70px_60px] gap-2 text-[14px] leading-8" style={{ color: "var(--carbon)" }}>
            <span />
            <span>Name</span>
            <span>Price ₹</span>
            <span>Joining ₹</span>
            <span>Freezes</span>
            <span>Max days</span>
            <span>Min days</span>
            <span>On</span>
          </div>
          {snap.plans.map((p) => (
            <PlanRow key={p.id} p={p} onSave={(pl) => run("plan.upsert", { plan: pl })} />
          ))}
          <button type="button" className="btn-ink mt-1" onClick={() => run("plan.upsert", { plan: { id: uid(), kind: "time", nameEn: "New plan", nameHi: "", months: 1, days: 0, sessions: 0, price: 100000, joiningFee: 0, gstInclusive: true, gstRate: 18, freezeMaxCount: 1, freezeMaxDays: 7, freezeMinDays: 3, plate: "p10", active: true, sort: snap.plans.length + 1, branchId: null } }, "Plan added")}>
            Add a plan
          </button>
        </div>

        <H>Staff</H>
        {snap.staff.map((s) => (
          <div key={s.id} className="flex min-h-8 items-center gap-3 text-[14px] leading-8">
            <span className="w-40 truncate" style={{ color: "var(--ink)" }}>
              {s.name}
            </span>
            <span className="t-teko w-20 text-[15px]">{s.role}</span>
            <span className="t-teko text-[15px]" style={{ color: s.active ? "var(--stamp-paid)" : "var(--margin-red)" }}>
              {s.active ? "active" : "off"}
            </span>
            {mode === "live" && s.role !== "owner" && owner && (
              <>
                <button type="button" className="btn-ink !min-h-7" onClick={async () => {
                  const pin = window.prompt(`New 4-digit PIN for ${s.name}`) ?? "";
                  if (!/^\d{4}$/.test(pin)) return;
                  const r = await fetch(`/api/b/${B.id}/staff`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: s.id, name: s.name, role: s.role, pin, active: s.active }) });
                  store.note(r.ok ? "PIN changed" : "Not saved", r.ok ? "ink" : "red");
                }}>
                  New PIN
                </button>
                <button type="button" className="btn-ink !min-h-7" onClick={async () => {
                  const r = await fetch(`/api/b/${B.id}/staff`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: s.id, name: s.name, role: s.role, active: !s.active }) });
                  if (r.ok) await store.refresh();
                }}>
                  {s.active ? "Switch off" : "Switch on"}
                </button>
              </>
            )}
          </div>
        ))}
        {mode === "live" && owner && (
          <div className="mt-1 flex flex-wrap items-end gap-3">
            <input className="field !w-40 !font-[family-name:var(--font-sans)]" placeholder="Name" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
            <select className="field !w-28" value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as Role })}>
              <option value="desk">desk</option>
              <option value="manager">manager</option>
              <option value="trainer">trainer</option>
            </select>
            <input className="field !w-20" placeholder="PIN" inputMode="numeric" maxLength={4} value={newStaff.pin} onChange={(e) => setNewStaff({ ...newStaff, pin: e.target.value.replace(/\D/g, "") })} />
            <button type="button" className="btn-ink" onClick={async () => {
              const r = await fetch(`/api/b/${B.id}/staff`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(newStaff) });
              if (r.ok) {
                setNewStaff({ name: "", role: "desk", pin: "" });
                await store.refresh();
              } else store.note((await r.json().catch(() => ({}))).error ?? "Not saved");
            }}>
              Add person
            </button>
          </div>
        )}
        {mode === "demo" && <p className="t-hand text-[15px] leading-8" style={{ color: "var(--muted-on-paper)" }}>Demo PINs: Ravi 1234, Sunita 4321, Harish 9999, Imran 5555.</p>}

        <H>WhatsApp templates</H>
        <div className="flex flex-wrap gap-2">
          {(["pre7", "pre3", "day0", "post3", "dues", "missed", "receipt"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={tplStage === k} className="btn-ink !min-h-7" style={{ background: tplStage === k ? "var(--ink)" : undefined, color: tplStage === k ? "var(--chalk)" : undefined }} onClick={() => (setTplStage(k), setDraft(null))}>
              {STAGE_LABEL[k]}
            </button>
          ))}
          <button type="button" className="btn-ink !min-h-7" onClick={() => (setTplLang(tplLang === "en" ? "hi" : "en"), setDraft(null))}>
            {tplLang === "en" ? "English" : "Hinglish"}
          </button>
        </div>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <div>
            <textarea className="ledger-plain h-40 w-full border border-[var(--ledger-rule)] p-2 text-[14px]" value={body} onChange={(e) => setDraft(e.target.value)} aria-label="Template text" />
            <div className="t-mono text-[12px]" style={{ color: "var(--muted-on-paper)" }}>
              {body.length} characters · {"{first_name} {plan} {expiry} {days_left} {amount} {pay_link} {gym} {staff}"}
            </div>
            <button type="button" className="btn-ink mt-1" disabled={draft == null} onClick={() => { run("template.upsert", { template: { id: tplRow?.id ?? uid(), stage: tplStage, lang: tplLang, body } }); setDraft(null); }}>
              Save template
            </button>
          </div>
          <div className="iron p-3">{sample && <Bubble text={draft != null ? message({ ...snap, templates: [{ id: "x", orgId: "", stage: tplStage, lang: tplLang, body }] }, mode, sample, tplStage, tplLang, "Ravi", { amount: sample.dues || sample.plan?.price, paymentId: "sample" }) : message(snap, mode, sample, tplStage, tplLang, "Ravi", { amount: sample.dues || sample.plan?.price, paymentId: "sample" })} />}</div>
        </div>

        <H>Desk tablets</H>
        {mode === "live" ? (
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className="btn-ink" onClick={async () => {
              const r = await fetch(`/api/b/${B.id}/pair`, { method: "POST" });
              const j = await r.json().catch(() => ({}));
              if (r.ok) setPair(j.code);
              else store.note(j.error ?? "Not allowed");
            }}>
              Pair a new desk (QR, 10 minutes)
            </button>
            {pair && <Qr text={`${origin()}/pair/${pair}`} size={160} label="Pairing QR" />}
            <a className="btn-ink" href={`/g/${B.id}/face`} target="_blank" rel="noreferrer">
              Customer-facing QR screen
            </a>
          </div>
        ) : (
          <p className="t-hand text-[15px] leading-8">In a real gym the owner shows a pairing QR here and the tablet scans it once.</p>
        )}

        <H>Member data requests</H>
        {snap.tasks.filter((t) => !t.doneAt).map((t) => {
          const m = snap.members.find((x) => x.id === t.memberId);
          return (
            <div key={t.id} className="flex min-h-8 flex-wrap items-center gap-3 text-[14px] leading-8">
              <span style={{ color: "var(--ink)" }}>
                {m?.memberNo} {m?.name} asked to {t.kind === "erase" ? "erase their data" : "get a copy of their data"}
              </span>
              {t.kind === "erase" && owner && (
                <button type="button" className="btn-ink !min-h-7" onClick={() => { if (window.confirm(`Erase ${m?.name}'s name, phone and photo? Payment records stay for the accounts.`)) { run("member.anonymise", { id: t.memberId }, "Anonymised"); run("task.done", { id: t.id }); } }}>
                  Anonymise
                </button>
              )}
              <button type="button" className="btn-ink !min-h-7" onClick={() => run("task.done", { id: t.id }, "Marked done")}>
                Done
              </button>
            </div>
          );
        })}
        {!snap.tasks.filter((t) => !t.doneAt).length && <p className="t-hand text-[15px] leading-8" style={{ color: "var(--muted-on-paper)" }}>No requests.</p>}

        <H>Export</H>
        {mode === "live" ? (
          <a className="btn-ink" href={`/api/b/${B.id}/export`}>
            Download members CSV
          </a>
        ) : (
          <p className="t-hand text-[15px] leading-8">A real gym downloads its members as CSV here.</p>
        )}
      </main>
      <MarginNotes />
    </div>
  );
}

function PlanRow({ p, onSave }: { p: Plan; onSave: (p: Plan) => void }) {
  const save = (patch: Partial<Plan>) => onSave({ ...p, ...patch });
  return (
    <div className="grid min-w-[640px] grid-cols-[30px_1.2fr_90px_90px_70px_70px_70px_60px] items-center gap-2 text-[13px] leading-8">
      <Plate state={p.plate as PlateKey} size={22} label="" />
      <input className="field !h-7 !font-[family-name:var(--font-sans)] !text-[14px]" defaultValue={p.nameEn} onBlur={(e) => e.target.value !== p.nameEn && save({ nameEn: e.target.value })} aria-label="Plan name" />
      <input className="field !h-7" inputMode="numeric" defaultValue={p.price / 100} onBlur={(e) => toPaise(e.target.value) !== p.price && save({ price: toPaise(e.target.value) })} aria-label={`Price, now ${rupees(p.price)}`} />
      <input className="field !h-7" inputMode="numeric" defaultValue={p.joiningFee / 100} onBlur={(e) => toPaise(e.target.value) !== p.joiningFee && save({ joiningFee: toPaise(e.target.value) })} aria-label="Joining fee" />
      <input className="field !h-7" inputMode="numeric" defaultValue={p.freezeMaxCount} onBlur={(e) => Number(e.target.value) !== p.freezeMaxCount && save({ freezeMaxCount: Number(e.target.value) || 0 })} aria-label="Most freezes per term" />
      <input className="field !h-7" inputMode="numeric" defaultValue={p.freezeMaxDays} onBlur={(e) => Number(e.target.value) !== p.freezeMaxDays && save({ freezeMaxDays: Number(e.target.value) || 0 })} aria-label="Most freeze days" />
      <input className="field !h-7" inputMode="numeric" defaultValue={p.freezeMinDays} onBlur={(e) => Number(e.target.value) !== p.freezeMinDays && save({ freezeMinDays: Number(e.target.value) || 1 })} aria-label="Fewest days per freeze" />
      <input type="checkbox" className="size-4" defaultChecked={p.active} onChange={(e) => save({ active: e.target.checked })} aria-label="Plan on sale" />
    </div>
  );
}
