// 06:00 IST daily (00:30 UTC, vercel.json). Builds the day's reminders with the
// same buildReminders the demo uses, retires stale ones, finalises imports past
// their undo window and keeps check-in partitions three months ahead.
// Writes go in chunks of 2,000 rows per transaction, never one long statement.
import { todayIST } from "@/lib/core/dates";
import { buildReminders } from "@/lib/core/slate";
import { shortId } from "@/lib/server/auth";
import { db, tx } from "@/lib/server/db";
import { fail, json, noDb } from "@/lib/server/http";
import { loadSnapshot } from "@/lib/server/snapshot";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const nd = noDb();
  if (nd) return nd;
  const want = process.env.CRON_SECRET;
  if (!want || req.headers.get("authorization") !== `Bearer ${want}`) return fail("Not allowed", 401);
  const today = todayIST();
  const branches = await db.query<{ id: string }>(`select id from branches order by id`);
  let added = 0;
  let retired = 0;
  for (const b of branches) {
    const loaded = await loadSnapshot(b.id);
    if (!loaded) continue;
    const { add, skip } = buildReminders(loaded.snap, today, () => `rm_${shortId(14)}`);
    for (let i = 0; i < add.length; i += 2000) {
      const chunk = add.slice(i, i + 2000);
      await tx(async (q) => {
        for (const r of chunk) {
          const res = await q.query(`insert into reminders (id, branch_id, membership_id, member_id, stage, due_date, state) values ($1,$2,$3,$4,$5,$6,'queued') on conflict do nothing returning id`, [r.id, b.id, r.membershipId, r.memberId, r.stage, r.dueDate]);
          added += res.length;
        }
      });
    }
    for (let i = 0; i < skip.length; i += 2000) {
      const chunk = skip.slice(i, i + 2000);
      await tx(async (q) => {
        for (const s of chunk) await q.query(`update reminders set state = $1, skipped_reason = $2 where id = $3 and branch_id = $4 and state = 'queued'`, [s.state, s.reason, s.id, b.id]);
      });
      retired += chunk.length;
    }
  }
  await db.query(`update imports set finalised_at = now() where finalised_at is null and created_at < now() - interval '24 hours'`);
  await db.query(`select kb_checkin_partitions(3)`);
  await db.query(`delete from attempts where at < now() - interval '1 day'`);
  return json({ ok: true, branches: branches.length, added, retired });
}
