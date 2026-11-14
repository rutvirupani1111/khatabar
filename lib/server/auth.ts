import "server-only";
// Owners and managers sign in with email + password. Desk staff unlock a paired
// desk with a 4-digit PIN. Sessions are HMAC-signed cookies; PINs and passwords
// are scrypt hashes; device and member-link tokens are stored only as sha256.
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import type { Role } from "@/lib/core/types";
import { db } from "./db";

let cached: string | undefined;
export async function secret(): Promise<string> {
  if (process.env.KB_SECRET && process.env.KB_SECRET.length >= 32) return process.env.KB_SECRET;
  if (cached) return cached;
  await db.query(`insert into kv (k, v) values ('secret', $1) on conflict (k) do nothing`, [randomBytes(32).toString("base64url")]);
  const [r] = await db.query<{ v: string }>(`select v from kv where k = 'secret'`);
  cached = r.v;
  return cached;
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("base64url");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const shortId = (n = 10) => randomBytes(12).toString("base64url").replace(/[-_]/g, "").slice(0, n);

export function hashSecret(pin: string): string {
  const salt = randomBytes(12).toString("base64url");
  return `${salt}.${scryptSync(pin, salt, 32).toString("base64url")}`;
}

export function checkSecret(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(".");
  if (!salt || !hash) return false;
  const a = scryptSync(pin, salt, 32);
  const b = Buffer.from(hash, "base64url");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function sign(payload: object): Promise<string> {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", await secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export async function unsign<T extends { exp: number }>(raw: string | undefined): Promise<T | null> {
  if (!raw) return null;
  const [body, mac] = raw.split(".");
  if (!body || !mac) return null;
  const want = createHmac("sha256", await secret()).update(body).digest("base64url");
  if (want.length !== mac.length || !timingSafeEqual(Buffer.from(want), Buffer.from(mac))) return null;
  try {
    const t = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    return t.exp > Date.now() ? t : null;
  } catch {
    return null;
  }
}

/** The member's card token: derived, so a message can always carry the current link. */
export async function memberToken(memberId: string, ver: number) {
  return createHmac("sha256", await secret()).update(`card|${memberId}|${ver}`).digest("base64url").slice(0, 22);
}

export interface UserSession {
  uid: string;
  org: string;
  exp: number;
}
export interface StaffSession {
  sid: string;
  bid: string;
  org: string;
  role: Role;
  exp: number;
}

const secure = process.env.NODE_ENV === "production";
const base = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };

export async function setUserCookie(uid: string, org: string) {
  const exp = Date.now() + 30 * 86400000;
  (await cookies()).set("kb_u", await sign({ uid, org, exp }), { ...base, maxAge: 30 * 86400 });
}
export async function setStaffCookie(s: Omit<StaffSession, "exp">) {
  const exp = Date.now() + 12 * 3600000;
  (await cookies()).set(`kb_s_${s.bid}`, await sign({ ...s, exp }), { ...base, maxAge: 12 * 3600 });
}
export async function setDeviceCookie(branchId: string, token: string) {
  (await cookies()).set(`kb_d_${branchId}`, token, { ...base, maxAge: 400 * 86400 });
}

export async function userSession(): Promise<UserSession | null> {
  return unsign<UserSession>((await cookies()).get("kb_u")?.value);
}

export async function deviceFor(branchId: string): Promise<{ id: string } | null> {
  const tok = (await cookies()).get(`kb_d_${branchId}`)?.value;
  if (!tok) return null;
  const [d] = await db.query<{ id: string }>(`select id from devices where branch_id = $1 and token_hash = $2 and revoked_at is null`, [branchId, sha256(tok)]);
  if (d) void db.query(`update devices set last_seen_at = now() where id = $1`, [d.id]).catch(() => {});
  return d ?? null;
}

export interface Actor {
  staffId: string | null;
  role: Role;
  orgId: string;
  userId?: string;
  deviceId?: string | null;
}

/** Who is acting on this branch: an unlocked desk PIN session, or the signed-in owner/manager. */
export async function actorFor(branchId: string): Promise<Actor | null> {
  const jar = await cookies();
  const s = await unsign<StaffSession>(jar.get(`kb_s_${branchId}`)?.value);
  if (s && s.bid === branchId) {
    const [st] = await db.query<{ active: boolean }>(`select active from staff where id = $1`, [s.sid]);
    if (st?.active) return { staffId: s.sid, role: s.role, orgId: s.org };
  }
  const u = await userSession();
  if (u) {
    const [b] = await db.query<{ org_id: string }>(`select org_id from branches where id = $1`, [branchId]);
    if (b && b.org_id === u.org) {
      const [usr] = await db.query<{ role: Role }>(`select role from users where id = $1`, [u.uid]);
      const [st] = await db.query<{ id: string; role: Role }>(`select id, role from staff where user_id = $1 and org_id = $2 and active order by branch_id nulls first limit 1`, [u.uid, u.org]);
      return { staffId: st?.id ?? null, role: (usr?.role as Role) ?? "owner", orgId: u.org, userId: u.uid };
    }
  }
  return null;
}

export async function clientKey() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}

/** At most `max` attempts per key in the window. Records this one. */
export async function limited(key: string, max = 6, minutes = 5): Promise<boolean> {
  const [r] = await db.query<{ n: number }>(`select count(*)::int as n from attempts where k = $1 and at > now() - make_interval(mins => $2)`, [key, minutes]);
  await db.query(`insert into attempts (k) values ($1)`, [key]);
  if (Math.random() < 0.02) void db.query(`delete from attempts where at < now() - interval '1 day'`).catch(() => {});
  return (r?.n ?? 0) >= max;
}
