// Shift+L: cancel a member's card link and issue a new one.
import { actorFor, memberToken, sha256, shortId } from "@/lib/server/auth";
import { tx } from "@/lib/server/db";
import { body, fail, json, noDb } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const nd = noDb();
  if (nd) return nd;
  const { id } = await params;
  const actor = await actorFor(id);
  if (!actor || actor.role === "trainer") return fail("Not allowed", 401);
  const b = await body<{ memberId: string }>(req);
  if (!b?.memberId) return fail("Bad request");
  const token = await tx(async (q) => {
    const [m] = await q.query<{ link_ver: number }>(`update members set link_ver = link_ver + 1 where id = $1 and branch_id = $2 returning link_ver`, [b.memberId, id]);
    if (!m) return null;
    await q.query(`update member_links set revoked_at = now() where member_id = $1 and revoked_at is null`, [b.memberId]);
    const t = await memberToken(b.memberId, m.link_ver);
    await q.query(`insert into member_links (id, member_id, branch_id, token_hash) values ($1, $2, $3, $4)`, [shortId(16), b.memberId, id, sha256(t)]);
    return t;
  });
  if (!token) return fail("Member not found", 404);
  return json({ token });
}
