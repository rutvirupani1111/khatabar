// Member-side writes (a pending UPI payment, a renewal request, a freeze request,
// a reminder opt-out, a data request, a location check-in) and the rotating QR.
import { applyMutations, applyOp, type Op } from "@/lib/core/ops";
import { codeFor, slotNow } from "@/lib/core/qr";
import { derive } from "@/lib/core/state";
import type { Mutation } from "@/lib/core/types";
import { db, tx } from "@/lib/server/db";
import { body, fail, json, noDb } from "@/lib/server/http";
import { memberByToken } from "@/lib/server/member";
import { persist } from "@/lib/server/rows";
import { loadSnapshot } from "@/lib/server/snapshot";

export const runtime = "nodejs";

const MEMBER_OPS = ["renew", "pay", "freeze.set", "freeze.cancel", "member.update", "task.add", "checkin"];

function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string; action: string }> }) {
  const nd = noDb();
  if (nd) return nd;
  const { token, action } = await params;
  if (action !== "qr") return fail("Unknown", 404);
  const who = await memberByToken(token);
  if (!who) return fail("Card link not valid", 404);
  const [r] = await db.query<{ code: string; checkin_key: string; member_no: string }>(`select b.code, b.checkin_key, m.member_no from branches b join members m on m.branch_id = b.id where b.id = $1 and m.id = $2`, [who.branchId, who.memberId]);
  if (!r) return fail("Not found", 404);
  const now = slotNow();
  const codes = await Promise.all(Array.from({ length: 21 }, (_, i) => codeFor(r.checkin_key, r.code, r.member_no, who.memberId, now + i).then((code) => ({ slot: now + i, code }))));
  const photo = await codeFor(r.checkin_key, r.code, r.member_no, who.memberId, "P");
  return json({ codes, photo, serverSlot: now });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string; action: string }> }) {
  const nd = noDb();
  if (nd) return nd;
  const { token, action } = await params;
  if (action !== "op") return fail("Unknown", 404);
  const who = await memberByToken(token);
  if (!who) return fail("Card link not valid", 404);
  const b = await body<{ ops: Op[] }>(req);
  if (!b || !Array.isArray(b.ops) || b.ops.length > 10) return fail("Bad request");
  let loaded = await loadSnapshot(who.branchId, { memberId: who.memberId });
  if (!loaded) return fail("Not found", 404);
  const actor = { staffId: null, role: "member" as const, memberId: who.memberId };
  const results: { id: string; ok: boolean; muts?: Mutation[]; error?: string }[] = [];
  for (const op of b.ops) {
    if (!MEMBER_OPS.includes(op?.kind)) {
      results.push({ id: op?.id ?? "", ok: false, error: "Not allowed from the card" });
      continue;
    }
    const [seen] = await db.query<{ result: (typeof results)[number] }>(`select result from ops where client_op_id = $1`, [op.id]);
    if (seen) {
      results.push(seen.result);
      continue;
    }
    if (op.kind === "checkin") {
      const st = loaded.snap.branch.settings;
      const g = st.geofence;
      const at = op.payload?.geo;
      if (!st.selfCheckin) {
        results.push({ id: op.id, ok: false, error: "Self check-in is off at this gym. Show your card at the desk." });
        continue;
      }
      if (!g || !at || metres(g, at) > (g.radius || 80)) {
        results.push({ id: op.id, ok: false, error: "You need to be at the gym to check in yourself" });
        continue;
      }
      const me = derive(loaded.snap).byId.get(who.memberId);
      if (!me || me.dues > 0 || me.frozenNow || (me.status !== "active" && me.status !== "ending")) {
        results.push({ id: op.id, ok: false, error: "Please see the desk today" });
        continue;
      }
      op.payload.method = "self_geo";
      op.payload.at = new Date().toISOString();
    }
    if (op.kind === "pay" || op.kind === "renew") for (const p of op.payload?.payments ?? []) p.state = "pending";
    const r = applyOp(loaded.snap, op, actor);
    const res = r.error ? { id: op.id, ok: false, error: r.error } : { id: op.id, ok: true, muts: r.muts };
    await tx(async (q) => {
      if (!r.error) await persist(q, r.muts, { branchId: who.branchId, orgId: loaded!.snap.org.id });
      await q.query(`insert into ops (client_op_id, branch_id, kind, actor, result) values ($1,$2,$3,$4,$5) on conflict do nothing`, [op.id, who.branchId, op.kind, `member:${who.memberId}`, JSON.stringify(res)]);
    });
    if (!r.error) loaded = { ...loaded, snap: applyMutations(loaded.snap, r.muts) };
    results.push(res);
  }
  return json({ results });
}
