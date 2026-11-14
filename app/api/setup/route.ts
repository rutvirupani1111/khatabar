// Setup on one page of register paper: branch + UPI ID, plans, staff with PINs.
// Also adds a further branch for an owner who runs several.
import { DEFAULT_SETTINGS } from "@/lib/core/demo-seed";
import { VPA_RE } from "@/lib/core/money";
import type { Plan, Role } from "@/lib/core/types";
import { hashSecret, randomToken, shortId, userSession } from "@/lib/server/auth";
import { db, tx } from "@/lib/server/db";
import { body, fail, json, noDb } from "@/lib/server/http";

export const runtime = "nodejs";

interface SetupBody {
  branch: { name: string; city: string; vpa: string; payeeName?: string; gstin?: string };
  plans?: Partial<Plan>[];
  staff?: { name: string; role: Role; pin: string }[];
  ownerPin?: string;
}

const COLORS = ["#B5372A", "#1F4C8A", "#2D7A4C", "#8A6A1F", "#5B3F8C"];

export async function POST(req: Request) {
  const nd = noDb();
  if (nd) return nd;
  const u = await userSession();
  if (!u) return fail("Sign in first", 401);
  const [usr] = await db.query<{ role: string; name: string }>(`select role, name from users where id = $1`, [u.uid]);
  if (usr?.role !== "owner") return fail("Only the owner can add a branch", 403);
  const b = await body<SetupBody>(req);
  if (!b?.branch?.name?.trim()) return fail("Name the branch");
  const vpa = b.branch.vpa.trim();
  if (!VPA_RE.test(vpa)) return fail("That UPI ID does not look right, e.g. lohapuri@okaxis");
  const staff = (b.staff ?? []).filter((s) => s.name?.trim());
  for (const s of staff) if (!/^\d{4}$/.test(s.pin) || !["manager", "desk", "trainer"].includes(s.role)) return fail(`${s.name}: a 4-digit PIN and a role`);
  const [org] = await db.query<{ name: string }>(`select name from orgs where id = $1`, [u.org]);
  const existing = await db.query<{ code: string }>(`select code from branches where org_id = $1`, [u.org]);
  const first = existing.length === 0;
  if (first && !/^\d{4}$/.test(b.ownerPin ?? "")) return fail("Pick your own 4-digit owner PIN");
  const pins = [b.ownerPin, ...staff.map((s) => s.pin)].filter(Boolean);
  if (new Set(pins).size !== pins.length) return fail("Every person needs a different PIN");

  // short code from the gym's initials, unique in the org: LP, LP2, ...
  const initials = (org.name.match(/\b[A-Za-z]/g) ?? ["K", "B"]).join("").toUpperCase().slice(0, 2).padEnd(2, "X");
  let code = initials;
  for (let i = 2; existing.some((e) => e.code === code); i++) code = `${initials}${i}`;
  const branchId = `br_${shortId(12)}`;

  await tx(async (q) => {
    await q.query(`insert into branches (id, org_id, name, code, city, vpa, payee_name, gstin, color, checkin_key, settings) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
      branchId,
      u.org,
      b.branch.name.trim(),
      code,
      b.branch.city?.trim() ?? "",
      vpa,
      (b.branch.payeeName ?? org.name).trim(),
      (b.branch.gstin ?? "").trim().toUpperCase(),
      COLORS[existing.length % COLORS.length],
      randomToken(32),
      JSON.stringify(DEFAULT_SETTINGS),
    ]);
    if (first) {
      let sort = 0;
      for (const p of b.plans ?? []) {
        if (!p.nameEn || !(Number(p.price) > 0)) continue;
        await q.query(
          `insert into plans (id, org_id, branch_id, kind, name_en, name_hi, months, days, sessions, price, joining_fee, gst_inclusive, gst_rate, freeze_max_count, freeze_max_days, freeze_min_days, plate, active, sort) values ($1,$2,null,$3,$4,$5,$6,$7,$8,$9,$10,true,18,$11,$12,$13,$14,true,$15)`,
          [`pl_${shortId(10)}`, u.org, p.kind ?? "time", p.nameEn, p.nameHi ?? "", p.months ?? 0, p.days ?? 0, p.sessions ?? 0, Math.round(Number(p.price)), Math.round(Number(p.joiningFee ?? 0)), p.freezeMaxCount ?? 0, p.freezeMaxDays ?? 0, p.freezeMinDays ?? 1, p.plate ?? "p10", sort++],
        );
      }
      await q.query(`insert into staff (id, org_id, branch_id, user_id, name, role, pin_hash) values ($1,$2,null,$3,$4,'owner',$5)`, [`st_${shortId(10)}`, u.org, u.uid, usr.name || "Owner", hashSecret(b.ownerPin!)]);
    }
    for (const s of staff) await q.query(`insert into staff (id, org_id, branch_id, name, role, pin_hash) values ($1,$2,$3,$4,$5,$6)`, [`st_${shortId(10)}`, u.org, branchId, s.name.trim(), s.role, hashSecret(s.pin)]);
  });
  return json({ ok: true, branchId });
}
