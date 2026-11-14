import "server-only";
// Builds the Snapshot a desk (whole branch) or a member card (one member) works from.
import { addDays, todayIST } from "@/lib/core/dates";
import { DEFAULT_SETTINGS } from "@/lib/core/demo-seed";
import type { Branch, Snapshot, TableName } from "@/lib/core/types";
import { memberToken } from "./auth";
import { db, type Q } from "./db";
import { fromRow, selectCols } from "./rows";

export async function loadBranch(q: Q, branchId: string) {
  const [b] = await q.query<Record<string, unknown>>(`select *, ${selectCols("branch")} from branches where id = $1`, [branchId]);
  if (!b) return null;
  const branch = { ...fromRow<Branch>("branch", b), orgId: b.org_id as string, code: b.code as string };
  branch.settings = { ...DEFAULT_SETTINGS, ...(b.settings as object) };
  return { branch, checkinKey: b.checkin_key as string };
}

async function rows<T>(q: Q, t: TableName, sql: string, params: unknown[]) {
  return (await q.query<Record<string, unknown>>(sql.replace("*", selectCols(t)), params)).map((r) => fromRow<T>(t, r));
}

export async function loadSnapshot(branchId: string, opts: { memberId?: string; q?: Q } = {}): Promise<{ snap: Snapshot; checkinKey: string } | null> {
  const q = opts.q ?? db;
  const b = await loadBranch(q, branchId);
  if (!b) return null;
  const { branch } = b;
  const [org] = await q.query<{ id: string; name: string; slug: string }>(`select id, name, slug from orgs where id = $1`, [branch.orgId]);
  const mid = opts.memberId;
  const by = mid ? `branch_id = $1 and member_id = $2` : `branch_id = $1`;
  const p = mid ? [branchId, mid] : [branchId];
  const since = addDays(todayIST(), -70);
  const [branches, staff, plans, members, memberships, payments, freezes, checkins, reminders, templates, closes, dismissals, tasks] = await Promise.all([
    q.query<{ id: string; name: string; code: string; city: string }>(`select id, name, code, city from branches where org_id = $1 order by created_at`, [branch.orgId]),
    rows<Snapshot["staff"][number]>(q, "staff", `select * from staff where org_id = $1 and (branch_id = $2 or branch_id is null)`, [branch.orgId, branchId]),
    rows<Snapshot["plans"][number]>(q, "plans", `select * from plans where org_id = $1 and (branch_id = $2 or branch_id is null) order by sort`, [branch.orgId, branchId]),
    rows<Snapshot["members"][number]>(q, "members", mid ? `select * from members where branch_id = $1 and id = $2` : `select * from members where branch_id = $1 and (archived_at is null or archived_at > now() - interval '30 days')`, p),
    rows<Snapshot["memberships"][number]>(q, "memberships", `select * from memberships where ${by}`, p),
    rows<Snapshot["payments"][number]>(q, "payments", `select * from payments where ${by}`, p),
    rows<Snapshot["freezes"][number]>(q, "freezes", `select * from freezes where ${by}`, p),
    rows<Snapshot["checkins"][number]>(q, "checkins", `select * from checkins where ${by} and ist_date >= $${p.length + 1}`, [...p, since]),
    mid ? Promise.resolve([]) : rows<Snapshot["reminders"][number]>(q, "reminders", `select * from reminders where branch_id = $1 and (state = 'queued' or due_date >= $2)`, [branchId, addDays(todayIST(), -30)]),
    rows<Snapshot["templates"][number]>(q, "templates", `select * from templates where org_id = $1 and active`, [branch.orgId]),
    mid ? Promise.resolve([]) : rows<Snapshot["closes"][number]>(q, "closes", `select * from cash_closes where branch_id = $1 and shift_end > now() - interval '14 days'`, [branchId]),
    mid ? Promise.resolve([]) : rows<Snapshot["dismissals"][number]>(q, "dismissals", `select * from churn_dismissals where branch_id = $1 and until_date >= $2`, [branchId, todayIST()]),
    mid ? Promise.resolve([]) : rows<Snapshot["tasks"][number]>(q, "tasks", `select * from tasks where branch_id = $1 and done_at is null`, [branchId]),
  ]);
  const imports = mid
    ? []
    : (await q.query<Record<string, unknown>>(`select id, branch_id, file_name, row_count, created_at, undone_at from imports where branch_id = $1 order by created_at desc limit 10`, [branchId])).map((r) => ({ id: r.id as string, branchId, fileName: r.file_name as string, rowCount: r.row_count as number, createdAt: r.created_at as string, undoneAt: (r.undone_at as string) ?? null }));
  const vers = await q.query<{ id: string; link_ver: number }>(mid ? `select id, link_ver from members where id = $1` : `select id, link_ver from members where branch_id = $1 and archived_at is null`, [mid ?? branchId]);
  const links: Record<string, string> = {};
  if (!mid) for (const v of vers) links[v.id] = await memberToken(v.id, v.link_ver);
  const snap: Snapshot = {
    version: Date.now(),
    org: org!,
    branch,
    branches,
    staff: staff.map((s) => ({ ...s, branchId: s.branchId ?? null })),
    plans,
    members,
    memberships,
    payments,
    freezes,
    checkins,
    reminders,
    templates,
    closes,
    dismissals,
    imports,
    tasks,
    links: mid ? undefined : links,
  };
  return { snap, checkinKey: b.checkinKey };
}
