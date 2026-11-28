"use client";
// Start for my gym, sign in, pairing a desk computer, and the owner's view of every branch.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Qr } from "@/components/art/Qr";
import { Icon, KbMark } from "@/components/ui/Icon";
import { demoRepo } from "@/lib/client/store";
import { rupees, VPA_RE } from "@/lib/core/money";
import { computeSlate } from "@/lib/core/slate";
import type { Snapshot } from "@/lib/core/types";
import { origin } from "./links";

async function post<T>(url: string, body: unknown): Promise<T & { error?: string }> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "No answer from the server. Check the internet and try again." }));
  return r.ok ? j : { ...j, error: j.error ?? `Something went wrong (${r.status})` };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint && <span className="mt-1 block text-[13px] text-[var(--muted-ink)]">{hint}</span>}
    </label>
  );
}

function Password({ value, onChange, auto, min }: { value: string; onChange: (v: string) => void; auto: string; min?: number }) {
  const [show, setShow] = useState(false);
  return (
    <span className="flex gap-2">
      <input required type={show ? "text" : "password"} minLength={min} className="input" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={auto} />
      <button type="button" className="btn shrink-0" aria-pressed={show} onClick={() => setShow((v) => !v)}>
        {show ? "Hide" : "Show"}
      </button>
    </span>
  );
}

function Err({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-[#fde2ea] p-2 text-[15px] font-semibold text-[#9b0f3f]">
      {children}
    </p>
  );
}

const DEFAULT_PLANS: { k: string; nameEn: string; nameHi: string; months: number; plate: string; fz: [number, number, number] }[] = [
  { k: "m", nameEn: "Monthly", nameHi: "मासिक", months: 1, plate: "p10", fz: [1, 7, 3] },
  { k: "q", nameEn: "Quarterly", nameHi: "तिमाही", months: 3, plate: "p15", fz: [3, 30, 5] },
  { k: "h", nameEn: "Half-yearly", nameHi: "छमाही", months: 6, plate: "p20", fz: [3, 45, 5] },
  { k: "y", nameEn: "Yearly", nameHi: "सालाना", months: 12, plate: "p25", fz: [3, 60, 7] },
];

/** Tells the night street behind Sign in and Start how far the form has got (0 to max). */
function useStreetStep(step: number, max: number) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".night-panel");
    if (!el) return;
    el.style.setProperty("--wake", String(Math.min(1, step / max)));
    el.setAttribute("data-step", String(step));
  }, [step, max]);
}

export function Start() {
  const router = useRouter();
  const [me, setMe] = useState<null | { user: { name: string; email: string } | null; org?: { name: string }; branches?: { id: string; name: string }[] }>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [acct, setAcct] = useState({ name: "", email: "", password: "", gym: "", city: "" });
  const [branch, setBranch] = useState({ name: "Main", city: "", vpa: "", payeeName: "", gstin: "" });
  const [prices, setPrices] = useState<Record<string, string>>({ m: "1200", q: "3200", h: "5800", y: "9999", pt: "6000", join: "500" });
  const [staff, setStaff] = useState([{ name: "", role: "desk", pin: "" }]);
  const [ownerPin, setOwnerPin] = useState("");
  const [made, setMade] = useState<string | null>(null);

  const loadMe = () =>
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ user: null }));
  useEffect(() => {
    void loadMe();
  }, []);

  const signup = async () => {
    setBusy(true);
    const r = await post("/api/auth/signup", acct);
    setBusy(false);
    if (r.error) return setErr(r.error);
    setErr("");
    setBranch((b) => ({ ...b, city: acct.city, payeeName: acct.gym }));
    await loadMe();
  };
  const first = !me?.branches?.length;
  const setup = async () => {
    if (!VPA_RE.test(branch.vpa.trim())) return setErr("That UPI ID does not look right. It looks like yourgym@okaxis.");
    if (first && !/^\d{4}$/.test(ownerPin)) return setErr("Choose your own 4-digit owner PIN.");
    setBusy(true);
    const plans = first
      ? [
          ...DEFAULT_PLANS.map((p, i) => ({ nameEn: p.nameEn, nameHi: p.nameHi, months: p.months, price: Number(prices[p.k]) * 100, joiningFee: Number(prices.join || 0) * 100, plate: p.plate, freezeMaxCount: p.fz[0], freezeMaxDays: p.fz[1], freezeMinDays: p.fz[2], kind: "time", sort: i })),
          { nameEn: "PT 12 sessions", nameHi: "पीटी 12 सेशन", kind: "sessions", days: 45, sessions: 12, months: 0, price: Number(prices.pt) * 100, joiningFee: 0, plate: "p5" },
        ]
      : [];
    const r = await post<{ branchId: string }>("/api/setup", { branch, plans, staff: staff.filter((s) => s.name.trim()), ownerPin });
    setBusy(false);
    if (r.error) return setErr(r.error);
    setErr("");
    setMade(r.branchId);
  };

  // the shutter goes up one step for each field filled; the padlock opens when the gym is created
  const filled = [acct.name, acct.gym, acct.city, acct.email.includes("@") ? acct.email : "", acct.password.length >= 8 ? acct.password : ""].filter((x) => x.trim()).length;
  useStreetStep(me?.user ? 6 : busy ? 6 : filled, 6);

  if (made) return <PairPanel branchId={made} />;

  // the sign-up form renders at once (on the server too); a signed-in owner sees setup when /me answers
  if (!me || !me.user)
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void signup();
        }}
      >
        <h1 className="t-display text-[32px] leading-tight">Start for my gym</h1>
        <p className="text-[16px]">Free for one branch, up to 75 active members. Email and password, no card needed.</p>
        <Field label="Your name">
          <input className="input" value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} autoComplete="name" />
        </Field>
        <Field label="Gym name">
          <input required className="input" value={acct.gym} onChange={(e) => setAcct({ ...acct, gym: e.target.value })} placeholder="Shakti Fitness" />
        </Field>
        <Field label="City">
          <input className="input" value={acct.city} onChange={(e) => setAcct({ ...acct, city: e.target.value })} />
        </Field>
        <Field label="Email">
          <input required type="email" className="input" value={acct.email} onChange={(e) => setAcct({ ...acct, email: e.target.value })} autoComplete="email" />
        </Field>
        <Field label="Password (8 or more characters)">
          <Password value={acct.password} onChange={(v) => setAcct({ ...acct, password: v })} auto="new-password" min={8} />
        </Field>
        {err && (
          <Err>
            {err} {err.includes("already has a gym") && <Link href="/login" className="underline">Sign in</Link>}
          </Err>
        )}
        <button type="submit" className="btn btn-primary btn-lg w-full sm:w-auto" disabled={busy}>
          {busy ? "Creating your gym..." : "Create my gym (free)"}
        </button>
        <p className="text-[15px]">
          Already have a gym?{" "}
          <Link href="/login" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-display text-[30px] leading-tight">{first ? `Set up ${me.org?.name ?? "your gym"}` : `Add a branch to ${me.org?.name}`}</h1>
      <p className="text-[15px]">Everything here can be changed later in Settings.</p>
      {!first && (
        <p className="text-[15px]">
          Your branches:{" "}
          {me.branches!.map((b) => (
            <Link key={b.id} href={`/g/${b.id}/report`} className="mr-3 font-semibold underline">
              {b.name}
            </Link>
          ))}
        </p>
      )}
      <fieldset className="panel-flat grid gap-3 p-4 sm:grid-cols-2">
        <legend className="px-1 text-[16px] font-bold">Branch</legend>
        <Field label="Branch name">
          <input className="input" value={branch.name} onChange={(e) => setBranch({ ...branch, name: e.target.value })} />
        </Field>
        <Field label="City or area">
          <input className="input" value={branch.city} onChange={(e) => setBranch({ ...branch, city: e.target.value })} />
        </Field>
      </fieldset>
      <fieldset className="panel-flat grid gap-3 p-4 sm:grid-cols-2">
        <legend className="px-1 text-[16px] font-bold">Where UPI money goes</legend>
        <Field label="UPI ID on the payment QR" hint="A business UPI ID works best; some UPI apps limit link payments to personal IDs.">
          <input className="input" value={branch.vpa} onChange={(e) => setBranch({ ...branch, vpa: e.target.value.trim() })} placeholder="yourgym@okaxis" />
        </Field>
        <Field label="Name on the QR">
          <input className="input" value={branch.payeeName} onChange={(e) => setBranch({ ...branch, payeeName: e.target.value })} />
        </Field>
        <Field label="GSTIN (optional, printed on receipts)">
          <input className="input" value={branch.gstin} onChange={(e) => setBranch({ ...branch, gstin: e.target.value.toUpperCase() })} />
        </Field>
      </fieldset>
      {first && (
        <fieldset className="panel-flat grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          <legend className="px-1 text-[16px] font-bold">Plans and prices (₹)</legend>
          {DEFAULT_PLANS.map((p) => (
            <Field key={p.k} label={p.nameEn}>
              <input inputMode="numeric" className="input t-mono" value={prices[p.k]} onChange={(e) => setPrices({ ...prices, [p.k]: e.target.value.replace(/\D/g, "") })} />
            </Field>
          ))}
          <Field label="Personal training, 12 sessions">
            <input inputMode="numeric" className="input t-mono" value={prices.pt} onChange={(e) => setPrices({ ...prices, pt: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Joining fee (0 for none)">
            <input inputMode="numeric" className="input t-mono" value={prices.join} onChange={(e) => setPrices({ ...prices, join: e.target.value.replace(/\D/g, "") })} />
          </Field>
        </fieldset>
      )}
      <fieldset className="panel-flat flex flex-col gap-3 p-4">
        <legend className="px-1 text-[16px] font-bold">Staff and their PINs</legend>
        {first && (
          <Field label="Your own owner PIN (4 digits)">
            <input type="password" inputMode="numeric" maxLength={4} className="input t-mono !w-32" value={ownerPin} onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </Field>
        )}
        {staff.map((s, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_150px_110px]">
            <Field label="Name">
              <input className="input" value={s.name} onChange={(e) => setStaff(staff.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
            </Field>
            <Field label="Job">
              <select className="input" value={s.role} onChange={(e) => setStaff(staff.map((x, k) => (k === i ? { ...x, role: e.target.value } : x)))}>
                <option value="desk">Front desk</option>
                <option value="manager">Manager</option>
                <option value="trainer">Trainer</option>
              </select>
            </Field>
            <Field label="PIN">
              <input type="password" inputMode="numeric" maxLength={4} className="input t-mono" value={s.pin} onChange={(e) => setStaff(staff.map((x, k) => (k === i ? { ...x, pin: e.target.value.replace(/\D/g, "").slice(0, 4) } : x)))} />
            </Field>
          </div>
        ))}
        <button type="button" className="btn self-start" onClick={() => setStaff([...staff, { name: "", role: "desk", pin: "" }])}>
          <Icon name="plus" size={18} /> Add a person
        </button>
      </fieldset>
      {err && <Err>{err}</Err>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary btn-lg w-full sm:w-auto" disabled={busy} onClick={() => void setup()}>
          {busy ? "Setting up..." : first ? "Open the front desk" : "Add the branch"}
        </button>
        <button type="button" className="btn btn-lg w-full sm:w-auto" onClick={() => router.push("/")}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function PairPanel({ branchId }: { branchId: string }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const make = async () => {
    const r = await post<{ code: string }>(`/api/b/${branchId}/pair`, {});
    if (r.error) setErr(r.error);
    else setCode(r.code);
  };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-display text-[30px] leading-tight">Your front desk is ready</h1>
      <ol className="flex flex-col gap-3">
        <li className="panel-flat p-4">
          <b>1. Import your members from Excel.</b>{" "}
          <Link className="btn btn-sm ml-1" href={`/g/${branchId}/import`}>
            Import members
          </Link>
        </li>
        <li className="panel-flat p-4">
          <b>2. Pair the desk computer</b> (the one your staff use).
          <button type="button" className="btn btn-sm ml-2" onClick={() => void make()}>
            Show pairing QR (10 minutes)
          </button>
          {code && (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Qr text={`${origin()}/pair/${code}`} size={170} label="Pairing QR" light="#FFFFFF" dark="#1B1A2E" />
              <span className="t-mono break-all text-[13px]">
                or open {origin()}/pair/{code} on that computer
              </span>
            </div>
          )}
          {err && <Err>{err}</Err>}
        </li>
        <li className="panel-flat p-4">
          <b>3. Open the front desk.</b>{" "}
          <Link className="btn btn-sm btn-primary ml-1" href={`/g/${branchId}/desk`}>
            Open the front desk
          </Link>
          <span className="mt-1 block text-[14px] text-[var(--muted-ink)]">Your owner PIN works on this phone too. Tomorrow at 6 am your report is under Owner report.</span>
        </li>
      </ol>
    </div>
  );
}

export function Login() {
  const router = useRouter();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // the night street wakes as the form fills: the signboard bulbs light, one field at a time
  useStreetStep((f.email.includes("@") ? 1 : 0) + (f.password.length >= 1 ? 1 : 0) + (busy ? 1 : 0), 3);
  const go = async () => {
    setBusy(true);
    const r = await post("/api/auth/login", f);
    setBusy(false);
    if (r.error) return setErr(r.error);
    // read ?next= only when it is needed, so the form itself renders on the server
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/")) return router.push(next);
    const me = await (await fetch("/api/auth/me", { cache: "no-store" })).json();
    router.push(me.branches?.[0] ? `/g/${me.branches[0].id}/report` : "/start");
  };
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void go();
      }}
    >
      <h1 className="t-display text-[32px] leading-tight">Sign in</h1>
      <p className="text-[16px]">For gym owners. Your report and your desks are one tap away.</p>
      <Field label="Email">
        <input type="email" required className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
      </Field>
      <Field label="Password">
        <Password value={f.password} onChange={(v) => setF({ ...f, password: v })} auto="current-password" />
      </Field>
      {err && (
        <Err>
          {err.includes("does not match") ? (
            <>
              That email and password do not match. Check them, or{" "}
              <Link className="underline" href="/start">
                start for my gym
              </Link>{" "}
              if this email is new.
            </>
          ) : (
            err
          )}
        </Err>
      )}
      <button className="btn btn-primary btn-lg w-full sm:w-auto" type="submit" disabled={busy}>
        {busy ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-[15px]">
        New here?{" "}
        <Link className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4" href="/start">
          Start for my gym
        </Link>
      </p>
      <p className="rounded-xl border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] p-3 text-[14px]">Desk staff? Sign in with your 4-digit PIN on a desk computer your owner has paired.</p>
    </form>
  );
}

export function PairDevice({ code }: { code: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("Pairing this computer with the branch...");
  useEffect(() => {
    void post<{ branchId: string }>("/api/pair", { code, label: navigator.userAgent.includes("Android") ? "Android desk" : "Desk" }).then((r) => {
      if (r.error) setMsg(r.error);
      else {
        setMsg("Paired. Staff now open this desk with their PIN.");
        setTimeout(() => router.push(`/g/${r.branchId}/desk`), 900);
      }
    });
  }, [code, router]);
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--cream)] p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <KbMark size={48} />
        <p className="text-[20px] font-semibold">{msg}</p>
      </div>
    </div>
  );
}

export function AllBranches({ demo }: { demo?: boolean }) {
  const [snaps, setSnaps] = useState<Snapshot[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      if (demo) {
        const a = await demoRepo("LP").load();
        const b = await demoRepo("LV").load();
        return setSnaps([a.snap, b.snap]);
      }
      const me = await (await fetch("/api/auth/me", { cache: "no-store" })).json().catch(() => ({}));
      if (!me.user) return setErr("Sign in as the owner to see every branch.");
      const out: Snapshot[] = [];
      for (const b of me.branches ?? []) {
        const r = await fetch(`/api/b/${b.id}/snapshot`, { cache: "no-store" });
        if (r.ok) out.push((await r.json()).snap);
      }
      setSnaps(out);
    })();
  }, [demo]);
  return (
    <div className="min-h-dvh bg-[var(--cream)]">
      <header className="on-dark border-b-2 border-[var(--ink)] bg-[var(--indigo)] text-[var(--cream)]">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-3 px-4">
          <Link href={demo ? "/demo/desk" : "/"} className="flex items-center gap-2">
            <KbMark size={26} onDark />
            <span className="t-sign text-[18px]">KHATABAR</span>
          </Link>
          <Link href={demo ? "/demo/report" : "/"} className="btn btn-ondark btn-sm ml-auto">
            <Icon name="back" size={16} /> Back
          </Link>
        </div>
      </header>
      {demo && <div className="border-b-2 border-[var(--ink)] bg-[var(--marigold)] px-4 py-2 text-[14px] font-semibold">Demo gym, made-up members. Nothing here is real.</div>}
      <main className="mx-auto max-w-[1100px] px-4 py-6">
        <h1 className="t-display text-[30px]">All branches, this morning</h1>
        <p className="text-[15px] text-[var(--muted-ink)]">Each branch&apos;s owner report side by side. Tap one to open it.</p>
        {err && (
          <p className="mt-3 text-[16px]">
            {err}{" "}
            <Link className="font-semibold underline" href="/login?next=/o">
              Sign in
            </Link>
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(snaps ?? []).map((s) => {
            const sl = computeSlate(s);
            return (
              <a key={s.branch.id} href={demo ? `/demo/report${s.branch.code === "LV" ? "?b=LV" : ""}` : `/g/${s.branch.id}/report`} className="slate on-dark block p-4">
                <div className="t-display text-[24px] text-[var(--marigold)]">{s.branch.name}</div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[15px]">
                  <dt>Ending today</dt>
                  <dd className="slate-num text-[20px]">{sl.endingToday.length}</dd>
                  <dt>Owes money</dt>
                  <dd className="slate-num text-[20px]">{rupees(sl.dues.total)}</dd>
                  <dt>Yesterday</dt>
                  <dd className="slate-num text-[20px]">{rupees(sl.yesterday.total)}</dd>
                  <dt>Waiting for money</dt>
                  <dd className="slate-num text-[20px]">{rupees(sl.pendingUpi.total)}</dd>
                  <dt>Checked in today</dt>
                  <dd className="slate-num text-[20px]">{sl.checkinsToday}</dd>
                </dl>
              </a>
            );
          })}
          {!snaps && !err && [0, 1].map((i) => <div key={i} className="skeleton h-[220px]" />)}
        </div>
        {!demo && snaps && (
          <Link href="/start" className="btn mt-6">
            <Icon name="plus" size={18} /> Add a branch
          </Link>
        )}
      </main>
    </div>
  );
}
