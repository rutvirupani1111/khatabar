import "server-only";
import { sha256 } from "./auth";
import { db } from "./db";

/** A member card link: 22 random-looking characters. We store only its sha256. */
export async function memberByToken(token: string): Promise<{ memberId: string; branchId: string } | null> {
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) return null;
  const [r] = await db.query<{ member_id: string; branch_id: string }>(
    `select l.member_id, l.branch_id from member_links l join members m on m.id = l.member_id where l.token_hash = $1 and l.revoked_at is null and m.anonymised_at is null`,
    [sha256(token)],
  );
  return r ? { memberId: r.member_id, branchId: r.branch_id } : null;
}
