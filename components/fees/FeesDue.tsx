"use client";
// Fees due: everyone who owes money or whose plan is ending, grouped in plain words. Each reminder
// opens WhatsApp with a polite message typed; a person presses Send there. Khatabar records
// "opened in WhatsApp", never "delivered". In the demo gym WhatsApp never opens.
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppScreen } from "@/components/shell/AppShell";
import { useDerived, useGym, useGymState, useSnap } from "@/components/shell/Gym";
import { message } from "@/components/shell/links";
import { Sheet } from "@/components/shell/Overlays";
import { Icon } from "@/components/ui/Icon";
import { Chip, Initials } from "@/components/ui/Status";
import { EmptyArt } from "@/components/world/Vignettes";
import { diffDays, fmtDay, todayIST } from "@/lib/core/dates";
import { rupees, uid, waLink } from "@/lib/core/money";
import { churnRule } from "@/lib/core/slate";
import type { MemberState } from "@/lib/core/state";
import type { Lang, Stage } from "@/lib/core/types";

type G = "day0" | "pre3" | "pre7" | "post3" | "dues" | "missed";
const GROUPS: { k: G; title: string }[] = [
  { k: "day0", title: "Ends today" },
  { k: "pre3", title: "Ends in 3 days" },
  { k: "pre7", title: "Ends in 7 days" },
  { k: "post3", title: "Ended 3 days ago" },
  { k: "dues", title: "Owes money" },
  { k: "missed", title: "Stopped coming" },
];
const TEMPLATES: { k: Stage; label: string }[] = [
  { k: "pre7", label: "Ending soon" },
  { k: "day0", label: "Ends today" },
  { k: "post3", label: "Already ended" },
  { k: "dues", label: "Owes money" },
  { k: "missed", label: "We miss you" },
];

function groupOf(x: MemberState, today: string): G | null {
  if (x.m.remindersOptOut || !x.term || x.frozenNow) return null;
  const d = x.daysLeft ?? 0;
  if (x.dues > 0) return "dues";
  if (d === 0) return "day0";
  if (d >= 1 && d <= 3) return "pre3";
  if (d >= 4 && d <= 7) return "pre7";
  if (d <= -1 && d >= -14) return "post3";
  if (churnRule(x, today)) return "missed";
  return null;
}
const stageFor = (g: G): Stage => (g === "pre3" ? "pre3" : g);
function what(x: MemberState, g: G) {
  if (g === "dues") return { kind: "owes" as const, text: `Owes ${rupees(x.dues)}` };
  if (g === "day0") return { kind: "soon" as const, text: "Ends today" };
  if (g === "pre3" || g === "pre7") return { kind: "soon" as const, text: `Ends on ${fmtDay(x.endDate)}` };
  if (g === "post3") return { kind: "ended" as const, text: `Ended on ${fmtDay(x.endDate)}` };
  return { kind: "valid" as const, text: x.lastVisit ? `Last came ${fmtDay(x.lastVisit)}` : "Not seen lately" };
}

export function FeesDue() {
  const { store, mode, lang, today } = useGym();
  const snap = useSnap();
  const d = useDerived();
  const actor = useGymState((s) => s.actor);
  const sp = useSearchParams();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [cur, setCur] = useState<string | null>(null);
  const [tpl, setTpl] = useState<Stage | null>(null);
  const [tplLang, setTplLang] = useState<Lang>(lang);
  const [text, setText] = useState("");
  const [walk, setWalk] = useState<string[] | null>(null);
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 1023px)");
    const on = () => setPhone(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);

  const groups = useMemo(() => {
    const m = new Map<G, MemberState[]>(GROUPS.map((g) => [g.k, []]));
    for (const x of d?.list ?? []) {
      const g = groupOf(x, today);
      if (g) m.get(g)!.push(x);
    }
    return m;
  }, [d, today]);
  const gOf = useMemo(() => {
    const m = new Map<string, G>();
    groups.forEach((l, g) => l.forEach((x) => m.set(x.m.id, g)));
    return m;
  }, [groups]);
  const total = [...groups.values()].reduce((a, l) => a + l.length, 0);

  // from the owner report: "Send reminders" arrives with today's list picked; ?m= picks one member
  useEffect(() => {
    if (!d) return;
    if (sp.get("load") === "today") setPicked(new Set(groups.get("day0")!.map((x) => x.m.id)));
    const m = sp.get("m");
    if (m && gOf.has(m)) setCur(m);
  }, [d?.today]); // eslint-disable-line react-hooks/exhaustive-deps

  const st = cur && d ? d.byId.get(cur) : undefined;
  const g = st ? gOf.get(st.m.id) : undefined;
  const staffName = snap?.staff.find((s) => s.id === actor.staffId)?.name ?? "Desk";
  const stage: Stage = tpl ?? (g ? stageFor(g) : "pre7");
  useEffect(() => {
    if (st && snap) setText(message(snap, mode, st, stage, tplLang, staffName));
  }, [st?.m.id, stage, tplLang, snap, mode, staffName]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastSent = (id: string) => {
    const at = snap?.reminders.filter((r) => r.memberId === id && r.openedAt).sort((a, b) => ((a.openedAt ?? "") < (b.openedAt ?? "") ? 1 : -1))[0]?.openedAt;
    if (!at) return "Not sent yet";
    const days = diffDays(today, todayIST(Date.parse(at)));
    if (days <= 0) return Date.now() - Date.parse(at) < 120000 ? "Opened in WhatsApp just now" : "Opened in WhatsApp today";
    return `Sent ${days} ${days === 1 ? "day" : "days"} ago`;
  };

  const send = (x: MemberState) => {
    const queued = snap?.reminders.find((r) => r.memberId === x.m.id && r.state === "queued");
    let id = queued?.id;
    if (!id) {
      id = uid();
      store.run("reminder.add", { reminders: [{ id, memberId: x.m.id, membershipId: x.term?.id ?? null, stage: "manual", dueDate: today }] });
    }
    store.run("reminder.mark", { id, state: "opened" });
    if (mode === "live") window.open(waLink(x.m.phone, text), "_blank", "noopener");
    else store.note(`Marked as sent to ${x.m.name}. In your gym WhatsApp opens with this message typed; you press Send.`, "ink");
  };
  const next = () => {
    if (!walk) return;
    const rest = walk.slice(1);
    setWalk(rest.length ? rest : null);
    setCur(rest[0] ?? null);
    setTpl(null);
  };

  if (!snap || !d)
    return (
      <AppScreen screen="fees" title="Fees due" sentence="Send polite WhatsApp reminders to people who owe money or whose plan is ending. You press Send in WhatsApp." vignette="fees">
        <div className="island-skel mx-auto w-full max-w-[1200px]" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} style={{ height: 52 }} />
          ))}
        </div>
      </AppScreen>
    );

  const preview = st && g && (
    <div className="flex flex-col gap-3">
      {walk && (
        <p className="text-[15px] font-bold">
          {(walk.length === picked.size ? 1 : picked.size - walk.length + 1)} of {picked.size}: {st.m.name}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Initials name={st.m.name} size={40} />
        <div>
          <div className="text-[17px] font-bold">{st.m.name}</div>
          <Chip {...what(st, g)} />
        </div>
      </div>
      <label>
        <span className="label">Message</span>
        <select className="input mt-1 !min-h-11" value={stage} onChange={(e) => setTpl(e.target.value as Stage)}>
          {TEMPLATES.map((t) => (
            <option key={t.k} value={t.k}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-1" role="radiogroup" aria-label="Language">
        {(["en", "hi"] as Lang[]).map((l) => (
          <button key={l} type="button" role="radio" aria-checked={tplLang === l} aria-pressed={tplLang === l} className="btn btn-sm" onClick={() => setTplLang(l)}>
            {l === "en" ? "English" : "Hinglish"}
          </button>
        ))}
      </div>
      <label>
        <span className="label">You can change the words</span>
        <textarea className="input mt-1 !min-h-[140px] text-[15px]" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-success"
          onClick={() => {
            send(st);
            if (walk) next();
          }}
        >
          <Icon name="chat" size={18} /> {mode === "live" ? "Open WhatsApp" : "Mark as sent (demo)"}
        </button>
        {walk ? (
          <>
            <button type="button" className="btn" onClick={next}>
              Skip
            </button>
            <button type="button" className="btn" onClick={() => (setWalk(null), setCur(null))}>
              Stop
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={() => setCur(null)}>
            Close
          </button>
        )}
      </div>
      <p className="text-[13px] text-[var(--muted-ink)]">{mode === "live" ? "WhatsApp opens with this typed. You press Send there. We write it down as opened, never as delivered." : "Demo gym: WhatsApp does not open. In your gym it opens with this message typed and you press Send."}</p>
    </div>
  );

  return (
    <AppScreen screen="fees" title="Fees due" sentence="Send polite WhatsApp reminders to people who owe money or whose plan is ending. You press Send in WhatsApp." vignette="fees">
      {total === 0 ? (
        <div className="mx-auto flex max-w-[520px] flex-col items-center gap-3 px-4 py-12 text-center">
          <EmptyArt kind="fees" size={260} />
          <h2 className="t-display text-[26px]">Nobody owes money or ends soon today. Chai break!</h2>
          <p className="text-[15px] text-[var(--muted-ink)]">New names appear here on their own each morning.</p>
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-3 py-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex min-w-0 flex-col gap-4 pb-24">
            {GROUPS.map(({ k, title }) => {
              const items = groups.get(k)!;
              if (!items.length) return null;
              const all = items.every((x) => picked.has(x.m.id));
              return (
                <section key={k} className="panel-flat overflow-hidden" aria-label={title}>
                  <div className="flex items-center gap-3 bg-[var(--marigold-pale)] px-3 py-2">
                    <h2 className="text-[16px] font-bold">
                      {title} <span className="t-mono text-[13px]">({items.length})</span>
                    </h2>
                    <button
                      type="button"
                      className="btn btn-sm ml-auto"
                      onClick={() =>
                        setPicked((p) => {
                          const n = new Set(p);
                          items.forEach((x) => (all ? n.delete(x.m.id) : n.add(x.m.id)));
                          return n;
                        })
                      }
                    >
                      {all ? "Unselect all" : "Select all"}
                    </button>
                  </div>
                  <ul className="divide-y divide-[var(--line)]">
                    {items.map((x) => (
                      <li key={x.m.id} className="flex min-h-[52px] flex-wrap items-center gap-3 px-3 py-1.5" style={{ background: cur === x.m.id ? "var(--marigold-pale)" : undefined }}>
                        <input
                          type="checkbox"
                          className="size-5 accent-[var(--saffron)]"
                          aria-label={`Pick ${x.m.name}`}
                          checked={picked.has(x.m.id)}
                          onChange={(e) =>
                            setPicked((p) => {
                              const n = new Set(p);
                              if (e.target.checked) n.add(x.m.id);
                              else n.delete(x.m.id);
                              return n;
                            })
                          }
                        />
                        <span className="min-w-[140px] flex-1">
                          <span className="block font-semibold">{x.m.name}</span>
                          <span className="block text-[13px] text-[var(--muted-ink)]">{lastSent(x.m.id)}</span>
                        </span>
                        <Chip {...what(x, k)} />
                        <button type="button" className="btn btn-sm !min-h-11" onClick={() => (setCur(x.m.id), setTpl(null), setWalk(null))}>
                          <Icon name="chat" size={16} /> Send reminder
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <aside className="hidden lg:block">
            <div className="panel sticky top-[120px] p-4">{preview || <p className="text-[15px] text-[var(--muted-ink)]">Pick a name and press Send reminder. The message appears here, ready to change.</p>}</div>
          </aside>
        </div>
      )}
      {picked.size > 0 && !walk && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex justify-center px-3 md:bottom-4">
          <div className="panel flex flex-wrap items-center gap-3 px-4 py-2">
            <span className="font-semibold">{picked.size} picked</span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const order = GROUPS.flatMap((gg) => groups.get(gg.k)!.filter((x) => picked.has(x.m.id)).map((x) => x.m.id));
                setWalk(order);
                setCur(order[0]);
                setTpl(null);
              }}
            >
              Send {picked.size} {picked.size === 1 ? "reminder" : "reminders"}, one by one
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setPicked(new Set())}>
              Clear
            </button>
          </div>
        </div>
      )}
      {phone && preview && (
        <Sheet title="Send reminder" onClose={() => (setCur(null), setWalk(null))}>
          {preview}
        </Sheet>
      )}
    </AppScreen>
  );
}
