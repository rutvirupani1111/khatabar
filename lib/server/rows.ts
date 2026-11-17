import "server-only";
// The one place that knows how browser rows map to SQL columns. Snapshot reads
// and op writes both use it, so a column can never be read one way and written another.
import type { Mutation, TableName } from "@/lib/core/types";
import type { Q } from "./db";

type Spec = { sql: string; cols: Record<string, string>; json?: string[]; branchScoped: boolean };

const c = (keys: string) => Object.fromEntries(keys.split(/\s+/).filter(Boolean).map((k) => [k, k.replace(/[A-Z]/g, (x) => "_" + x.toLowerCase())]));

export const TABLES: Record<TableName, Spec> = {
  members: { sql: "members", branchScoped: true, cols: c("id orgId branchId memberNo name phone altPhone emergency gender dob photo notes source importId waConsentAt remindersOptOut weeklyTarget trainerId archivedAt anonymisedAt createdAt updatedAt") },
  memberships: { sql: "memberships", branchScoped: true, cols: c("id orgId branchId memberId planId addonOf startDate baseEndDate frozenDays price discount joiningFee status lapseReason sessionsLeft createdBy createdAt") },
  payments: { sql: "payments", branchScoped: true, cols: { ...c("id orgId branchId memberId membershipId amount mode state receivedBy confirmedBy confirmedAt receiptNo createdAt"), utrLast4: "utr_last4", reversesId: "reverses_id" } },
  freezes: { sql: "freezes", branchScoped: true, cols: c("id branchId membershipId memberId fromDate toDate days reason state requestedBy decidedBy createdAt") },
  checkins: { sql: "checkins", branchScoped: true, cols: c("id branchId memberId at istDate istHour method staffId onCredit") },
  reminders: { sql: "reminders", branchScoped: true, cols: c("id branchId membershipId memberId stage dueDate state openedBy openedAt skippedReason") },
  closes: { sql: "cash_closes", branchScoped: true, json: ["counts"], cols: { ...c("id branchId staffId shiftStart shiftEnd counts expected counted shortfall reason reopenedBy reopenedAt"), upiTotal: "upi_total" } },
  dismissals: { sql: "churn_dismissals", branchScoped: true, cols: { ...c("id branchId memberId reason untilDate"), by: "by" } },
  plans: { sql: "plans", branchScoped: false, cols: c("id orgId branchId kind nameEn nameHi months days sessions price joiningFee gstInclusive gstRate freezeMaxCount freezeMaxDays freezeMinDays plate active sort") },
  staff: { sql: "staff", branchScoped: false, cols: c("id orgId branchId name role active") },
  templates: { sql: "templates", branchScoped: false, cols: c("id orgId stage lang body") },
  tasks: { sql: "tasks", branchScoped: true, cols: c("id branchId memberId kind createdAt doneAt") },
  imports: { sql: "imports", branchScoped: true, cols: c("id branchId fileName rowCount createdAt undoneAt") },
  branch: { sql: "branches", branchScoped: false, json: ["settings"], cols: c("id name city vpa payeeName gstin color settings memberSeq receiptSeq") },
};

export function fromRow<T>(t: TableName, r: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, col] of Object.entries(TABLES[t].cols)) out[k] = r[col] ?? null;
  return out as T;
}

export function selectCols(t: TableName) {
  return Object.values(TABLES[t].cols)
    .map((col) => (col === "by" ? `"by"` : col))
    .join(", ");
}

const q = (col: string) => (col === "by" ? `"by"` : col);

/** Writes the op's mutations. Updates are always fenced to the branch (or org) the op ran in. */
export async function persist(tx: Q, muts: Mutation[], scope: { branchId: string; orgId: string }) {
  for (const m of muts) {
    const spec = TABLES[m.table];
    const entries = Object.entries(m.row).filter(([k]) => k in spec.cols);
    const vals = entries.map(([k, v]) => (spec.json?.includes(k) ? JSON.stringify(v) : v));
    if (m.type === "insert") {
      const cols = entries.map(([k]) => q(spec.cols[k]));
      if (spec.branchScoped && !entries.some(([k]) => k === "branchId")) {
        cols.push("branch_id");
        vals.push(scope.branchId);
      }
      const ph = vals.map((_, i) => `$${i + 1}`).join(", ");
      const onConflict = m.table === "checkins" ? " on conflict do nothing" : m.table === "reminders" ? " on conflict do nothing" : "";
      await tx.query(`insert into ${spec.sql} (${cols.join(", ")}) values (${ph})${onConflict}`, vals);
    } else {
      const sets = entries.filter(([k]) => k !== "id");
      if (!sets.length) continue;
      const params: unknown[] = sets.map(([k, v]) => (spec.json?.includes(k) ? JSON.stringify(v) : v));
      const setSql = sets.map(([k], i) => `${q(spec.cols[k])} = $${i + 1}`).join(", ");
      params.push(m.row.id);
      let where = `id = $${params.length}`;
      if (m.table === "branch") {
        params.push(scope.branchId);
        where += ` and id = $${params.length}`;
      } else if (spec.branchScoped) {
        params.push(scope.branchId);
        where += ` and branch_id = $${params.length}`;
      } else {
        params.push(scope.orgId);
        where += ` and org_id = $${params.length}`;
      }
      await tx.query(`update ${spec.sql} set ${setSql} where ${where}`, params);
    }
  }
}
