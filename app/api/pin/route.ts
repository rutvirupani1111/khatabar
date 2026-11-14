// A 4-digit PIN raises the shutter on a paired desk (or for the signed-in owner).
import type { Role } from "@/lib/core/types";
import { actorFor, checkSecret, clientKey, deviceFor, limited, setStaffCookie } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { body, fail, json, noDb } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const nd = noDb();
  if (nd) return nd;
  const b = await body<{ branchId: string; pin: string }>(req);
  if (!b?.branchId || !/^\d{4}$/.test(b.pin ?? "")) return fail("Four digits");
  const device = await deviceFor(b.branchId);
  const owner = device ? null : await actorFor(b.branchId);
  if (!device && !owner) return fail("This device is not paired with the branch. Ask the owner for the pairing QR.", 401);
  if (await limited(`pin:${b.branchId}:${device?.id ?? (await clientKey())}`, 6, 5)) return fail("Too many tries. Wait five minutes.", 429);
  const [br] = await db.query<{ org_id: string }>(`select org_id from branches where id = $1`, [b.branchId]);
  if (!br) return fail("Branch not found", 404);
  const staff = await db.query<{ id: string; role: Role; pin_hash: string; name: string }>(`select id, role, pin_hash, name from staff where org_id = $1 and active and (branch_id = $2 or branch_id is null)`, [br.org_id, b.branchId]);
  const hit = staff.find((s) => checkSecret(b.pin, s.pin_hash));
  if (!hit) return fail("That PIN did not match. Try again.", 401);
  await setStaffCookie({ sid: hit.id, bid: b.branchId, org: br.org_id, role: hit.role });
  return json({ ok: true, name: hit.name, role: hit.role });
}
