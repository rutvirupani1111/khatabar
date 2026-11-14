// The member's card reads only its own rows, through the server, by its link.
import { fail, json, noDb } from "@/lib/server/http";
import { memberByToken } from "@/lib/server/member";
import { loadSnapshot } from "@/lib/server/snapshot";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const nd = noDb();
  if (nd) return nd;
  const { token } = await params;
  const who = await memberByToken(token);
  if (!who) return fail("This card link was cancelled or never existed. Ask the desk for a new one.", 404);
  const r = await loadSnapshot(who.branchId, { memberId: who.memberId });
  if (!r) return fail("Not found", 404);
  const snap = { ...r.snap, staff: r.snap.staff.map((s) => ({ ...s, role: s.role })), links: undefined };
  return json({ snap, key: null, actor: { staffId: null, role: "member", memberId: who.memberId } });
}
