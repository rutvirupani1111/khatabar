// Applies db/migrations/*.sql in order, once each, recorded in schema_migrations.
// Reads DATABASE_URL from the environment or .env.local. Never prints it.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

let url = process.env.DATABASE_URL;
if (!url && existsSync(".env.local")) url = readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) throw new Error("DATABASE_URL is not set");
const pool = new Pool({ connectionString: url });
await pool.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
const done = new Set((await pool.query("select name from schema_migrations")).rows.map((r) => r.name));
for (const f of readdirSync("db/migrations").filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(f)) continue;
  const sql = readFileSync(`db/migrations/${f}`, "utf8");
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(sql);
    await c.query("insert into schema_migrations (name) values ($1)", [f]);
    await c.query("commit");
    console.log("applied", f);
  } catch (e) {
    await c.query("rollback");
    console.error("failed", f, e.message);
    process.exitCode = 1;
    break;
  } finally {
    c.release();
  }
}
await pool.end();
