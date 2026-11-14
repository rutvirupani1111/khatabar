"use client";
// Sign up, setup on one page of register paper, sign in, pairing a desk tablet,
// and the owner's view of every branch.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plate } from "@/components/art";
import { Qr } from "@/components/art/Qr";
import { MiniSlate } from "@/components/owner/Owner";
import { demoRepo } from "@/lib/client/store";
import { VPA_RE } from "@/lib/core/money";
import type { PlateKey, Snapshot } from "@/lib/core/types";
import { origin } from "./links";

async function post<T>(url: string, body: unknown): Promise<T & { error?: string }> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: "No answer from the server" }));
  return r.ok ? j : { ...j, error: j.error ?? `HTTP ${r.status}` };
}

function Paper({ children, title, sub }: { children: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="ledger holes min-h-dvh pb-16 pt-6" data-theme="light">
      <div className="mx-auto max-w-[760px] pl-[72px] pr-4">
        <Link href="/" className="t-teko text-[16px] underline" style={{ color: "var(--carbon)" }}>
          Khatabar
        </Link>
        <h1 className="t-stencil text-[40px] leading-[64px]" style={{ color: "var(--ink)" }}>
          {title}
        </h1>
        {sub && (
          <p className="t-hand text-[17px] leading-8" style={{ color: "var(--carbon)" }}>
            {sub}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-h-16">
      <span className="t-teko block text-[16px] leading-8" style={{ color: "var(--carbon)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const DEFAULT_PLANS: { k: string; nameEn: string; nameHi: string; months: number; price: number; plate: PlateKey; fz: [number, number, number] }[] = [
  { k: "m", nameEn: "Monthly", nameHi: "मासिक", months: 1, price: 1200, plate: "p10", fz: [1, 7, 3] },
  { k: "q", nameEn: "Quarterly", nameHi: "तिमाही", months: 3, price: 3200, plate: "p15", fz: [3, 30, 5] },
  { k: "h", nameEn: "Half-yearly", nameHi: "छमाही", months: 6, price: 5800, plate: "p20", fz: [3, 45, 5] },
  { k: "y", nameEn: "Yearly", nameHi: "सालाना", months: 12, price: 9999, plate: "p25", fz: [3, 60, 7] },
];

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
    if (!VPA_RE.test(branch.vpa.trim())) return setErr("That UPI ID does not look right, e.g. lohapuri@okaxis");
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

  if (!me) return <Paper title="Open your gym's register">{null}</Paper>;

  if (made) return <PairPanel branchId={made} />;

  if (!me.user)
    return (
      <Paper title="Open your gym's register" sub="One evening of setup. Email and password, no card, no SMS. Phone sign-in comes later.">
        <form
          className="mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            void signup();
          }}
        >
          <Field label="Your name">
            <input className="field !font-[family-name:var(--font-sans)]" value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} autoComplete="name" />
          </Field>
          <Field label="Gym name">
            <input required className="field !font-[family-name:var(--font-sans)]" value={acct.gym} onChange={(e) => setAcct({ ...acct, gym: e.target.value })} placeholder="e.g. Shakti Fitness" />
          </Field>
          <Field label="City">
            <input className="field !font-[family-name:var(--font-sans)]" value={acct.city} onChange={(e) => setAcct({ ...acct, city: e.target.value })} />
          </Field>
          <Field label="Email">
            <input required type="email" className="field" value={acct.email} onChange={(e) => setAcct({ ...acct, email: e.target.value })} autoComplete="email" />
          </Field>
          <Field label="Password (8 or more characters)">
            <input required type="password" minLength={8} className="field" value={acct.password} onChange={(e) => setAcct({ ...acct, password: e.target.value })} autoComplete="new-password" />
          </Field>
          {err && <p className="t-hand text-[16px] leading-8" style={{ color: "var(--margin-red)" }}>{err}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" className="btn-brass" disabled={busy}>
              {busy ? "Writing it down" : "Continue to setup"}
            </button>
            <Link href="/login" className="btn-ink">
              I already have a gym
            </Link>
          </div>
        </form>
      </Paper>
    );

  return (
    <Paper title={first ? `Set up ${me.org?.name ?? "your gym"}` : `Add a branch to ${me.org?.name}`} sub="Four steps on one page. Everything can be changed later in Settings.">
      {!first && (
        <p className="t-hand text-[16px] leading-8" style={{ color: "var(--carbon)" }}>
          Your branches:{" "}
          {me.branches!.map((b) => (
            <Link key={b.id} href={`/g/${b.id}/owner`} className="mr-3 underline">
              {b.name}
            </Link>
          ))}
          <Link href="/o" className="underline">
            all branches
          </Link>
        </p>
      )}
      <ol className="mt-2">
        <li>
          <h2 className="t-teko text-[22px] leading-8" style={{ color: "var(--margin-red)" }}>
            1 · Branch
          </h2>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Branch name">
              <input className="field !font-[family-name:var(--font-sans)]" value={branch.name} onChange={(e) => setBranch({ ...branch, name: e.target.value })} />
            </Field>
            <Field label="City / area">
              <input className="field !font-[family-name:var(--font-sans)]" value={branch.city} onChange={(e) => setBranch({ ...branch, city: e.target.value })} />
            </Field>
          </div>
        </li>
        <li>
          <h2 className="t-teko text-[22px] leading-8" style={{ color: "var(--margin-red)" }}>
            2 · Where UPI money goes
          </h2>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="UPI ID shown on the payment QR">
              <input className="field" value={branch.vpa} onChange={(e) => setBranch({ ...branch, vpa: e.target.value.trim() })} placeholder="yourgym@okaxis" />
            </Field>
            <Field label="Name on the QR">
              <input className="field !font-[family-name:var(--font-sans)]" value={branch.payeeName} onChange={(e) => setBranch({ ...branch, payeeName: e.target.value })} />
            </Field>
            <Field label="GSTIN (optional, printed on receipts)">
              <input className="field" value={branch.gstin} onChange={(e) => setBranch({ ...branch, gstin: e.target.value.toUpperCase() })} />
            </Field>
          </div>
          <p className="t-hand text-[15px] leading-8" style={{ color: "var(--carbon)" }}>
            Use a business or merchant UPI ID if you can. Some UPI apps warn about, or limit, payments opened from a link to a personal ID. The desk QR, scanned at the counter, is the main way to pay.
          </p>
        </li>
        {first && (
          <li>
            <h2 className="t-teko text-[22px] leading-8" style={{ color: "var(--margin-red)" }}>
              3 · Plans and prices (₹)
            </h2>
            <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
              {DEFAULT_PLANS.map((p) => (
                <Field key={p.k} label={p.nameEn}>
                  <span className="flex items-center gap-2">
                    <Plate state={p.plate} size={26} label="" />
                    <input inputMode="numeric" className="field" value={prices[p.k]} onChange={(e) => setPrices({ ...prices, [p.k]: e.target.value.replace(/\D/g, "") })} />
                  </span>
                </Field>
              ))}
              <Field label="PT add-on, 12 sessions">
                <input inputMode="numeric" className="field" value={prices.pt} onChange={(e) => setPrices({ ...prices, pt: e.target.value.replace(/\D/g, "") })} />
              </Field>
              <Field label="Joining fee (0 for none)">
                <input inputMode="numeric" className="field" value={prices.join} onChange={(e) => setPrices({ ...prices, join: e.target.value.replace(/\D/g, "") })} />
              </Field>
            </div>
          </li>
        )}
        <li>
          <h2 className="t-teko text-[22px] leading-8" style={{ color: "var(--margin-red)" }}>
            {first ? "4" : "3"} · Staff and their PINs
          </h2>
          {first && (
            <Field label="Your own owner PIN (4 digits)">
              <input type="password" inputMode="numeric" maxLength={4} className="field !w-32" value={ownerPin} onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
            </Field>
          )}
          {staff.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_110px_90px] gap-3">
              <Field label="Name">
                <input className="field !font-[family-name:var(--font-sans)]" value={s.name} onChange={(e) => setStaff(staff.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
              </Field>
              <Field label="Role">
                <select className="field" value={s.role} onChange={(e) => setStaff(staff.map((x, k) => (k === i ? { ...x, role: e.target.value } : x)))}>
                  <option value="desk">Desk</option>
                  <option value="manager">Manager</option>
                  <option value="trainer">Trainer</option>
                </select>
              </Field>
              <Field label="PIN">
                <input type="password" inputMode="numeric" maxLength={4} className="field" value={s.pin} onChange={(e) => setStaff(staff.map((x, k) => (k === i ? { ...x, pin: e.target.value.replace(/\D/g, "").slice(0, 4) } : x)))} />
              </Field>
            </div>
          ))}
          <button type="button" className="btn-ink" onClick={() => setStaff([...staff, { name: "", role: "desk", pin: "" }])}>
            Add a person
          </button>
        </li>
      </ol>
      {err && <p className="t-hand mt-3 text-[16px] leading-8" style={{ color: "var(--margin-red)" }}>{err}</p>}
      <div className="mt-6 flex gap-3">
        <button type="button" className="btn-brass" disabled={busy} onClick={() => void setup()}>
          {busy ? "Writing it down" : first ? "Open the register" : "Add the branch"}
        </button>
        <button type="button" className="btn-ink" onClick={() => router.push("/")}>
          Cancel
        </button>
      </div>
    </Paper>
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
    <Paper title="The register is open" sub="Pair the desk tablet, bring in your sheet, then raise the shutter.">
      <ol className="mt-2 text-[15px] leading-8" style={{ color: "var(--text-on-paper)" }}>
        <li>
          <b className="t-teko text-[19px]">Pair the desk tablet.</b>{" "}
          <button type="button" className="btn-ink" onClick={() => void make()}>
            Show pairing QR (10 minutes)
          </button>
          {code && (
            <div className="my-3 flex flex-wrap items-center gap-4">
              <Qr text={`${origin()}/pair/${code}`} size={180} label="Pairing QR" />
              <span className="t-mono text-[13px]">
                or open {origin()}/pair/{code} on the tablet
              </span>
            </div>
          )}
          {err && <span className="t-hand text-[15px]" style={{ color: "var(--margin-red)" }}>{err}</span>}
        </li>
        <li>
          <b className="t-teko text-[19px]">Bring in your register.</b>{" "}
          <Link className="underline" href={`/g/${branchId}/import`}>
            Bahi import
          </Link>
        </li>
        <li>
          <b className="t-teko text-[19px]">Raise the shutter.</b>{" "}
          <Link className="underline" href={`/g/${branchId}/desk`}>
            Open the desk
          </Link>{" "}
          (your owner PIN works on this phone too)
        </li>
        <li>
          <b className="t-teko text-[19px]">Tomorrow at 6 am.</b>{" "}
          <Link className="underline" href={`/g/${branchId}/owner`}>
            Your slate
          </Link>{" "}
          ·{" "}
          <Link className="underline" href={`/g/${branchId}/settings`}>
            Settings
          </Link>
        </li>
      </ol>
    </Paper>
  );
}

export function Login() {
  const router = useRouter();
  const sp = useSearchParams();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const go = async () => {
    const r = await post("/api/auth/login", f);
    if (r.error) return setErr(r.error);
    const next = sp.get("next");
    if (next && next.startsWith("/")) return router.push(next);
    const me = await (await fetch("/api/auth/me", { cache: "no-store" })).json();
    router.push(me.branches?.[0] ? `/g/${me.branches[0].id}/owner` : "/start");
  };
  return (
    <Paper title="Owner sign in">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void go();
        }}
      >
        <Field label="Email">
          <input type="email" required className="field" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
        </Field>
        <Field label="Password">
          <input type="password" required className="field" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" />
        </Field>
        {err && <p className="t-hand text-[16px] leading-8" style={{ color: "var(--margin-red)" }}>{err}</p>}
        <div className="mt-4 flex gap-3">
          <button className="btn-brass" type="submit">
            Sign in
          </button>
          <Link className="btn-ink" href="/start">
            Open a new gym
          </Link>
        </div>
      </form>
    </Paper>
  );
}

export function PairDevice({ code }: { code: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("Pairing this tablet with the branch...");
  useEffect(() => {
    void post<{ branchId: string }>("/api/pair", { code, label: navigator.userAgent.includes("Android") ? "Android desk" : "Desk" }).then((r) => {
      if (r.error) setMsg(r.error);
      else {
        setMsg("Paired. Staff now unlock this desk with their PIN.");
        setTimeout(() => router.push(`/g/${r.branchId}/desk`), 900);
      }
    });
  }, [code, router]);
  return (
    <div className="floor grid min-h-dvh place-items-center p-6 text-center">
      <p className="t-hand text-[22px]">{msg}</p>
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
    <div className="ledger-plain min-h-dvh px-3 py-6" data-theme="light">
      <div className="mx-auto max-w-[1000px]">
        <h1 className="t-stencil text-[36px]" style={{ color: "var(--ink)" }}>
          Every branch, this morning
        </h1>
        {demo && <span className="steel-tag">Demo gym, made-up members</span>}
        {err && (
          <p className="t-hand mt-3 text-[18px]">
            {err}{" "}
            <Link className="underline" href="/login?next=/o">
              Sign in
            </Link>
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(snaps ?? []).map((s) => (
            <MiniSlate key={s.branch.id} snap={s} href={demo ? `/demo/owner${s.branch.code === "LV" ? "?b=LV" : ""}` : `/g/${s.branch.id}/owner`} />
          ))}
          {!snaps && !err && [0, 1].map((i) => <div key={i} className="skeleton h-[240px]" style={{ background: "#2b2f2c" }} />)}
        </div>
        {!demo && snaps && (
          <Link href="/start" className="btn-ink mt-6">
            Add a branch
          </Link>
        )}
      </div>
    </div>
  );
}
