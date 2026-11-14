// Owner tools for one branch: pairing a desk tablet, staff PINs, import batches,
// undoing an import, and the members CSV export.
import { addMonths, planEnd } from "@/lib/core/dates";
import { cleanPhone } from "@/lib/core/money";
import type { Role } from "@/lib/core/types";
import { actorFor, hashSecret, memberToken, sha256, shortId } from "@/lib/server/auth";
import { db, tx } from "@/lib/server/db";
import { body, fail, json, noDb } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface ImportRow {
  name: string;
  phone: string;
  planId: string | null;
  start: string | null;
  end: string | null;
  paid: number;
  due: number;
  notes: string;
  gender: string;
  dob: string | null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const nd = noDb();
  if (nd) return nd;
  const { id, action } = await params;
  const actor = await actorFor(id);
  if (!actor) return fail("Sign in first", 401);
  const owner = actor.role === "owner";
  const mgr = owner || actor.role === "manager";

  if (action === "pair") {
    if (!owner) return fail("Only the owner can pair a desk", 403);
    const code = shortId(8).toUpperCase();
    await db.query(`insert into pair_codes (code, org_id, branch_id, expires_at) values ($1, $2, $3, now() + interval '10 minutes')`, [code, actor.orgId, id]);
    return json({ code });
  }

  if (action === "staff") {
    if (!owner) return fail("Only the owner can change staff", 403);
    const b = await body<{ id?: string; name: string; role: Role; pin?: string; active?: boolean }>(req);
    if (!b?.name?.trim() || !["manager", "desk", "trainer"].includes(b.role)) return fail("Name and role");
    if (b.pin && !/^\d{4}$/.test(b.pin)) return fail("PIN is 4 digits");
    if (b.id) {
      await db.query(`update staff set name = $1, role = $2, active = $3 ${b.pin ? ", pin_hash = $6" : ""} where id = $4 and org_id = $5`, b.pin ? [b.name.trim(), b.role, b.active !== false, b.id, actor.orgId, hashSecret(b.pin)] : [b.name.trim(), b.role, b.active !== false, b.id, actor.orgId]);
      return json({ ok: true, id: b.id });
    }
    if (!b.pin) return fail("A new person needs a PIN");
    const sid = `st_${shortId(10)}`;
    await db.query(`insert into staff (id, org_id, branch_id, name, role, pin_hash) values ($1,$2,$3,$4,$5,$6)`, [sid, actor.orgId, id, b.name.trim(), b.role, hashSecret(b.pin)]);
    return json({ ok: true, id: sid });
  }

  if (action === "import") {
    if (!mgr) return fail("Owner or manager only", 403);
    const b = await body<{ importId: string; fileName: string; mapping: object; rows: ImportRow[] }>(req);
    if (!b?.importId || !Array.isArray(b.rows) || b.rows.length > 500) return fail("Send at most 500 rows per batch");
    const count = await tx(
      async (q) => {
        await q.query(`insert into imports (id, branch_id, file_name, row_count, mapping, created_by) values ($1,$2,$3,0,$4,$5) on conflict (id) do nothing`, [b.importId, id, b.fileName.slice(0, 120), JSON.stringify(b.mapping ?? {}), actor.staffId]);
        const [br] = await q.query<{ code: string; member_seq: number; org_id: string }>(`select code, member_seq, org_id from branches where id = $1 for update`, [id]);
        const plans = await q.query<{ id: string; months: number; days: number; price: number }>(`select id, months, days, price from plans where org_id = $1`, [br.org_id]);
        const phones = new Set((await q.query<{ phone: string }>(`select phone from members where branch_id = $1 and archived_at is null`, [id])).map((r) => r.phone));
        let seq = br.member_seq;
        let n = 0;
        for (const r of b.rows) {
          const phone = cleanPhone(r.phone);
          if (!phone || phones.has(phone) || !r.name?.trim()) continue;
          phones.add(phone);
          seq++;
          const mid = `m_${shortId(14)}`;
          await q.query(`insert into members (id, org_id, branch_id, member_no, name, phone, gender, dob, notes, source, import_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'import',$10)`, [mid, br.org_id, id, `${br.code}-${String(seq).padStart(4, "0")}`, r.name.trim().slice(0, 80), phone, r.gender ?? "", r.dob, (r.notes ?? "").slice(0, 300), b.importId]);
          await q.query(`insert into member_links (id, member_id, branch_id, token_hash) values ($1,$2,$3,$4)`, [shortId(16), mid, id, sha256(await memberToken(mid, 1))]);
          const plan = plans.find((p) => p.id === r.planId) ?? null;
          if (plan && (r.start || r.end)) {
            const start = r.start ?? addMonths(r.end!, -Math.max(1, plan.months));
            const end = r.end ?? planEnd(start, plan.months, plan.days);
            const msId = `ms_${shortId(14)}`;
            const price = Math.round(r.paid + r.due) || plan.price;
            await q.query(`insert into memberships (id, org_id, branch_id, member_id, plan_id, start_date, base_end_date, price, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [msId, br.org_id, id, mid, plan.id, start, end, price, actor.staffId]);
            if (r.paid > 0)
              await q.query(`insert into payments (id, org_id, branch_id, member_id, membership_id, amount, mode, state, received_by, confirmed_by, confirmed_at, created_at) values ($1,$2,$3,$4,$5,$6,'cash','confirmed',$7,$7,$8::date,$8::date)`, [`py_${shortId(14)}`, br.org_id, id, mid, msId, Math.round(r.paid), actor.staffId, start]);
          }
          n++;
        }
        await q.query(`update branches set member_seq = $1 where id = $2`, [seq, id]);
        await q.query(`update imports set row_count = row_count + $1 where id = $2`, [n, b.importId]);
        return n;
      },
      { staffId: actor.staffId },
    );
    return json({ ok: true, imported: count });
  }

  if (action === "import-undo") {
    if (!mgr) return fail("Owner or manager only", 403);
    const b = await body<{ importId: string }>(req);
    const [imp] = await db.query<{ created_at: string; undone_at: string | null }>(`select created_at, undone_at from imports where id = $1 and branch_id = $2`, [b?.importId, id]);
    if (!imp) return fail("Import not found", 404);
    if (imp.undone_at) return fail("Already undone");
    if (Date.now() - Date.parse(imp.created_at) > 24 * 3600000) return fail("The 24 hour undo window has closed");
    // soft delete in chunks so a big import never holds one long lock
    let total = 0;
    for (;;) {
      const r = await db.query<{ id: string }>(`update members set archived_at = now(), updated_at = now() where id in (select id from members where branch_id = $1 and import_id = $2 and archived_at is null limit 500) returning id`, [id, b!.importId]);
      total += r.length;
      if (r.length < 500) break;
    }
    await db.query(`update imports set undone_at = now() where id = $1`, [b!.importId]);
    return json({ ok: true, archived: total });
  }

  return fail("Unknown action", 404);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const nd = noDb();
  if (nd) return nd;
  const { id, action } = await params;
  const actor = await actorFor(id);
  if (!actor || (actor.role !== "owner" && actor.role !== "manager")) return fail("Owner or manager only", 401);
  if (action !== "export") return fail("Unknown action", 404);
  const rows = await db.query<Record<string, unknown>>(
    `select m.member_no, m.name, m.phone, m.created_at::date as joined, p.name_en as plan, ms.start_date, ms.end_date,
            coalesce((select sum(amount) from payments x where x.member_id = m.id and x.state = 'confirmed'), 0) as paid_paise
       from members m
       left join lateral (select * from memberships s where s.member_id = m.id and s.status = 'active' order by s.start_date desc limit 1) ms on true
       left join plans p on p.id = ms.plan_id
      where m.branch_id = $1 and m.archived_at is null order by m.member_no`,
    [id],
  );
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["member_no", "name", "phone", "joined", "plan", "start_date", "end_date", "paid_rupees"];
  const csv = [head.join(","), ...rows.map((r) => [r.member_no, r.name, r.phone, r.joined, r.plan, r.start_date, r.end_date, Number(r.paid_paise) / 100].map(esc).join(","))].join("\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="khatabar-members-${id}.csv"`, "cache-control": "no-store" } });
}
