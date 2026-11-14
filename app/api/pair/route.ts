// The desk tablet scans the owner's pairing QR (/pair/CODE). From then on staff
// unlock it with their PIN only. The tablet keeps a random token; we keep its hash.
import { randomToken, setDeviceCookie, sha256, shortId } from "@/lib/server/auth";
import { tx } from "@/lib/server/db";
import { body, fail, json, noDb } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const nd = noDb();
  if (nd) return nd;
  const b = await body<{ code: string; label?: string }>(req);
  const code = String(b?.code ?? "").toUpperCase();
  if (!/^[A-Z0-9]{6,10}$/.test(code)) return fail("That pairing code is not valid");
  const token = randomToken(32);
  const out = await tx(async (q) => {
    const [pc] = await q.query<{ branch_id: string; org_id: string }>(`update pair_codes set used_at = now() where code = $1 and used_at is null and expires_at > now() returning branch_id, org_id`, [code]);
    if (!pc) return null;
    await q.query(`insert into devices (id, org_id, branch_id, label, token_hash) values ($1,$2,$3,$4,$5)`, [`dv_${shortId(10)}`, pc.org_id, pc.branch_id, (b?.label ?? "Desk").slice(0, 40), sha256(token)]);
    return pc.branch_id;
  });
  if (!out) return fail("This pairing code has expired or was used. Make a new one on the owner's phone.", 410);
  await setDeviceCookie(out, token);
  return json({ ok: true, branchId: out });
}
