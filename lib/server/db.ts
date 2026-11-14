import "server-only";
// Neon Postgres over the serverless driver. Dates stay "YYYY-MM-DD" strings,
// bigint paise come back as numbers, timestamps as ISO strings.
import { Pool, types } from "@neondatabase/serverless";

types.setTypeParser(1082, (v: string) => v);
types.setTypeParser(20, (v: string) => Number(v));
types.setTypeParser(1700, (v: string) => Number(v));
types.setTypeParser(1184, (v: string) => new Date(v).toISOString());

export type Row = Record<string, unknown>;
export interface Q {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
}

const g = globalThis as unknown as { __kbPool?: Pool };

export function hasDb() {
  return !!process.env.DATABASE_URL;
}

function pool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!g.__kbPool) g.__kbPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return g.__kbPool;
}

export const db: Q = {
  async query<T>(sql: string, params: unknown[] = []) {
    return (await pool().query(sql, params as unknown[])).rows as T[];
  },
};

export async function tx<T>(fn: (q: Q) => Promise<T>, actor?: { staffId?: string | null; deviceId?: string | null }): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    if (actor) await c.query("select set_config('kb.actor', $1, true), set_config('kb.device', $2, true)", [actor.staffId ?? "", actor.deviceId ?? ""]);
    const out = await fn({
      async query<R>(sql: string, params: unknown[] = []) {
        return (await c.query(sql, params as unknown[])).rows as R[];
      },
    });
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
