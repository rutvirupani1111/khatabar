// Owner sign up, sign in and sign out. Email + password (scrypt). Free, no SMS.
import { cookies } from "next/headers";
import { checkSecret, clientKey, hashSecret, limited, setUserCookie, shortId, userSession } from "@/lib/server/auth";
import { db, tx } from "@/lib/server/db";
import { body, fail, json, noDb } from "@/lib/server/http";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const nd = noDb();
  if (nd) return nd;
  const { action } = await params;
  if (action === "logout") {
    const jar = await cookies();
    for (const c of jar.getAll()) if (c.name.startsWith("kb_u") || c.name.startsWith("kb_s_")) jar.delete(c.name);
    return json({ ok: true });
  }
  const b = await body<{ email: string; password: string; name?: string; gym?: string; city?: string }>(req);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  if (!EMAIL.test(email)) return fail("Enter a valid email");
  if (await limited(`auth:${await clientKey()}`, 12, 10)) return fail("Too many tries. Wait ten minutes.", 429);
  if (action === "signup") {
    if (password.length < 8) return fail("Password needs at least 8 characters");
    const gym = String(b?.gym ?? "").trim();
    if (gym.length < 2) return fail("Write the gym's name");
    const [exists] = await db.query(`select 1 from users where email = $1`, [email]);
    if (exists) return fail("This email already has a gym. Sign in instead.");
    const orgId = `org_${shortId(12)}`;
    const uid = `usr_${shortId(12)}`;
    const slug = `${gym.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30)}-${shortId(4).toLowerCase()}`;
    await tx(async (q) => {
      await q.query(`insert into orgs (id, name, slug) values ($1, $2, $3)`, [orgId, gym, slug]);
      await q.query(`insert into users (id, org_id, email, name, pass_hash, role) values ($1, $2, $3, $4, $5, 'owner')`, [uid, orgId, email, String(b?.name ?? "").trim(), hashSecret(password)]);
    });
    await setUserCookie(uid, orgId);
    return json({ ok: true });
  }
  if (action === "login") {
    const [u] = await db.query<{ id: string; org_id: string; pass_hash: string }>(`select id, org_id, pass_hash from users where email = $1`, [email]);
    if (!u || !checkSecret(password, u.pass_hash)) return fail("Email or password does not match", 401);
    await setUserCookie(u.id, u.org_id);
    return json({ ok: true });
  }
  return fail("Unknown action", 404);
}

export async function GET(_req: Request, { params }: { params: Promise<{ action: string }> }) {
  const nd = noDb();
  if (nd) return nd;
  const { action } = await params;
  if (action !== "me") return fail("Unknown action", 404);
  const u = await userSession();
  if (!u) return json({ user: null });
  const [user] = await db.query<{ id: string; email: string; name: string; role: string }>(`select id, email, name, role from users where id = $1`, [u.uid]);
  const [org] = await db.query<{ id: string; name: string }>(`select id, name from orgs where id = $1`, [u.org]);
  const branches = await db.query<{ id: string; name: string; code: string; city: string }>(`select id, name, code, city from branches where org_id = $1 order by created_at`, [u.org]);
  return json({ user, org, branches });
}
