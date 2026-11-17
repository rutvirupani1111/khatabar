// The idempotent op log. The desk sends its changes in order; each one is
// re-run here with the same applyOp the desk used, against the database's own
// rows, then written in one transaction. A retried op is answered from the log.
import { applyMutations, applyOp, DEMO_ONLY_OPS, OP_KINDS, type Op } from "@/lib/core/ops";
import type { Mutation, Role } from "@/lib/core/types";
import { actorFor, checkSecret, memberToken, sha256, shortId } from "@/lib/server/auth";
import { db, tx } from "@/lib/server/db";
import { body, fail, json, noDb } from "@/lib/server/http";
import { persist } from "@/lib/server/rows";
import { loadSnapshot } from "@/lib/server/snapshot";

export const runtime = "nodejs";
export const maxDuration = 30;

type Result = { id: string; ok: boolean; muts?: Mutation[]; error?: string; note?: string };

export async function POST(req: Request) {
  const nd = noDb();
  if (nd) return nd;
  const b = await body<{ branchId: string; ops: Op[] }>(req);
  if (!b?.branchId || !Array.isArray(b.ops) || b.ops.length > 50) return fail("Bad request");
  const actor = await actorFor(b.branchId);
  if (!actor) return fail("Unlock the desk with your PIN", 401);
  const pins = await db.query<{ id: string; role: Role; pin_hash: string }>(`select id, role, pin_hash from staff where org_id = $1 and active and (branch_id = $2 or branch_id is null)`, [actor.orgId, b.branchId]);
  const checkPin = (pin: string, roles: Role[]) => pins.find((s) => roles.includes(s.role) && checkSecret(pin, s.pin_hash))?.id ?? null;

  const results: Result[] = [];
  let loaded = await loadSnapshot(b.branchId);
  if (!loaded || loaded.snap.org.id !== actor.orgId) return fail("Branch not found", 404);
  for (const op of b.ops) {
    if (!op?.id || !OP_KINDS.includes(op.kind) || op.kind === "staff.upsert" || DEMO_ONLY_OPS.includes(op.kind)) {
      results.push({ id: op?.id ?? "", ok: false, error: "Unknown change" });
      continue;
    }
    const [seen] = await db.query<{ result: Result }>(`select result from ops where client_op_id = $1 and branch_id = $2`, [op.id, b.branchId]);
    if (seen) {
      results.push(seen.result);
      continue;
    }
    if (op.kind === "close.save" && Number(op.payload?.expected) !== Number(op.payload?.counted)) {
      const mine = pins.find((s) => s.id === actor.staffId);
      if (!mine || !checkSecret(String(op.payload?.pin ?? ""), mine.pin_hash)) {
        results.push({ id: op.id, ok: false, error: "A short drawer must be signed with your own PIN" });
        continue;
      }
    }
    // offline check-ins keep the time they happened (within 3 days); money always uses server time
    const at = Date.parse(op.at);
    const when = op.kind === "checkin" && Number.isFinite(at) && Date.now() - at < 72 * 3600000 ? Math.min(Date.now(), at) : Date.now();
    if (op.kind === "checkin" && op.payload) op.payload.at = new Date(when).toISOString();
    const r = applyOp(loaded.snap, op, { staffId: actor.staffId, role: actor.role }, { checkPin, now: Date.now() });
    const res: Result = r.error ? { id: op.id, ok: false, error: r.error } : { id: op.id, ok: true, muts: r.muts, note: r.note };
    try {
      await tx(
        async (q) => {
          if (!r.error) {
            await persist(q, r.muts, { branchId: b.branchId, orgId: actor.orgId });
            for (const m of r.muts.filter((x) => x.table === "members" && x.type === "insert")) {
              await q.query(`insert into member_links (id, member_id, branch_id, token_hash) values ($1, $2, $3, $4)`, [shortId(16), m.row.id, b.branchId, sha256(await memberToken(m.row.id, 1))]);
            }
          }
          await q.query(`insert into ops (client_op_id, branch_id, kind, actor, result) values ($1, $2, $3, $4, $5) on conflict do nothing`, [op.id, b.branchId, op.kind, actor.staffId, JSON.stringify(res)]);
        },
        { staffId: actor.staffId, deviceId: actor.deviceId },
      );
      if (!r.error) loaded = { ...loaded, snap: applyMutations(loaded.snap, r.muts) };
      results.push(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "write failed";
      results.push({ id: op.id, ok: false, error: /duplicate|unique/.test(msg) ? "Already recorded by another desk" : "The server could not save this" });
      loaded = (await loadSnapshot(b.branchId)) ?? loaded;
    }
  }
  return json({ results });
}
