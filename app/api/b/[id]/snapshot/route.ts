import { actorFor } from "@/lib/server/auth";
import { fail, json, noDb } from "@/lib/server/http";
import { loadSnapshot } from "@/lib/server/snapshot";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const nd = noDb();
  if (nd) return nd;
  const { id } = await params;
  const actor = await actorFor(id);
  if (!actor) return fail("locked", 401);
  const r = await loadSnapshot(id);
  if (!r || r.snap.org.id !== actor.orgId) return fail("Branch not found", 404);
  // The check-in key is held in memory on the desk; the desk strips it before caching to disk.
  return json({ snap: r.snap, key: r.checkinKey, actor: { staffId: actor.staffId, role: actor.role } });
}
