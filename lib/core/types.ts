// Row shapes shared by the browser store, the op applier and the server.
// Money is whole paise. Plain dates are Indian dates as "YYYY-MM-DD".

export type Role = "owner" | "manager" | "desk" | "trainer";
export type Lang = "en" | "hi";
export type PlateKey = "p25" | "p20" | "p15" | "p10" | "p5" | "iron";

export interface Org {
  id: string;
  name: string;
  slug: string;
}

export interface BranchSettings {
  backdateWithin7: boolean; // renewals within 7 days of lapse start from the lapse date
  discountLimitPct: number; // desk may discount up to this without a manager PIN
  creditLimit: number; // "let in once on credit" per member per month
  rushHours: [string, string][]; // ["05:30","09:30"]
  stages: Record<string, { on: boolean; days: number }>;
  drawerCount: boolean; // owner can switch the cash count off
  selfCheckin: boolean;
  geofence: { lat: number; lng: number; radius: number } | null;
  freezeApproval: boolean;
  lang: Lang;
}

export interface Branch {
  id: string;
  orgId: string;
  name: string;
  code: string; // short code, used in member numbers and QR payloads
  city: string;
  vpa: string;
  payeeName: string;
  gstin: string;
  color: string; // the 6 px band on every member card
  settings: BranchSettings;
  memberSeq: number;
  receiptSeq: number;
}

export interface Staff {
  id: string;
  orgId: string;
  branchId: string | null;
  name: string;
  role: Role;
  active: boolean;
}

export type PlanKind = "time" | "sessions" | "addon";

export interface Plan {
  id: string;
  orgId: string;
  branchId: string | null;
  kind: PlanKind;
  nameEn: string;
  nameHi: string;
  months: number;
  days: number;
  sessions: number;
  price: number;
  joiningFee: number;
  gstInclusive: boolean;
  gstRate: number;
  freezeMaxCount: number;
  freezeMaxDays: number;
  freezeMinDays: number;
  plate: PlateKey;
  active: boolean;
  sort: number;
}

export interface Member {
  id: string;
  orgId: string;
  branchId: string;
  memberNo: string;
  name: string;
  phone: string; // 10 digits, no +91
  altPhone: string;
  emergency: string;
  gender: string;
  dob: string | null;
  photo: string | null; // small data URL or null
  notes: string;
  source: string;
  importId: string | null;
  waConsentAt: string | null;
  remindersOptOut: boolean;
  weeklyTarget: number;
  trainerId: string | null;
  archivedAt: string | null;
  anonymisedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  orgId: string;
  branchId: string;
  memberId: string;
  planId: string;
  addonOf: string | null;
  startDate: string;
  baseEndDate: string;
  frozenDays: number;
  price: number;
  discount: number;
  joiningFee: number;
  status: "active" | "requested" | "void";
  lapseReason: string | null;
  sessionsLeft: number | null;
  createdBy: string | null;
  createdAt: string;
}

// "import" is an opening balance copied from the gym's old sheet: never cash in today's drawer.
export type PayMode = "cash" | "upi_desk" | "upi_member" | "card" | "import";
export type PayState = "pending" | "confirmed" | "rejected";

export interface Payment {
  id: string;
  orgId: string;
  branchId: string;
  memberId: string;
  membershipId: string | null;
  amount: number; // negative for a reversal
  mode: PayMode;
  state: PayState;
  utrLast4: string;
  receivedBy: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  reversesId: string | null;
  receiptNo: string;
  createdAt: string;
}

export type FreezeState = "requested" | "approved" | "rejected" | "cancelled";

export interface Freeze {
  id: string;
  branchId: string;
  membershipId: string;
  memberId: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  state: FreezeState;
  requestedBy: "member" | "staff";
  decidedBy: string | null;
  createdAt: string;
}

export type CheckinMethod = "desk_scan" | "desk_manual" | "door" | "self_geo" | "photo_check";

export interface Checkin {
  id: string;
  branchId: string;
  memberId: string;
  at: string; // ISO timestamp
  istDate: string;
  istHour: number;
  method: CheckinMethod;
  staffId: string | null;
  onCredit: boolean;
}

export type Stage = "pre7" | "pre3" | "day0" | "post3" | "dues" | "missed" | "manual";
export type ReminderState = "queued" | "opened" | "marked_sent" | "skipped_paid" | "skipped_frozen" | "skipped_manual" | "expired_unsent";

export interface Reminder {
  id: string;
  branchId: string;
  membershipId: string | null;
  memberId: string;
  stage: Stage;
  dueDate: string;
  state: ReminderState;
  openedBy: string | null;
  openedAt: string | null;
  skippedReason: string;
}

export interface Template {
  id: string;
  orgId: string;
  stage: Stage | "receipt";
  lang: Lang;
  body: string;
}

export interface CashClose {
  id: string;
  branchId: string;
  staffId: string;
  shiftStart: string;
  shiftEnd: string;
  counts: Record<string, number>;
  expected: number;
  counted: number;
  shortfall: number;
  upiTotal: number;
  reason: string;
  reopenedBy: string | null;
  reopenedAt: string | null;
}

export interface Dismissal {
  id: string;
  branchId: string;
  memberId: string;
  reason: string;
  untilDate: string;
  by: string | null;
}

export interface ImportRec {
  id: string;
  branchId: string;
  fileName: string;
  rowCount: number;
  createdAt: string;
  undoneAt: string | null;
}

export interface Task {
  id: string;
  branchId: string;
  memberId: string;
  kind: "export" | "erase";
  createdAt: string;
  doneAt: string | null;
}

/** Everything one branch's desk needs, held in the browser and replayed offline. */
export interface Snapshot {
  version: number;
  org: Org;
  branch: Branch;
  branches: Pick<Branch, "id" | "name" | "code" | "city">[];
  staff: Staff[];
  plans: Plan[];
  members: Member[];
  memberships: Membership[];
  payments: Payment[];
  freezes: Freeze[];
  checkins: Checkin[];
  reminders: Reminder[];
  templates: Template[];
  closes: CashClose[];
  dismissals: Dismissal[];
  imports: ImportRec[];
  tasks: Task[];
  /** live only: member id -> signed card token, so messages can carry {pay_link} offline */
  links?: Record<string, string>;
}

export type TableName =
  | "members"
  | "memberships"
  | "payments"
  | "freezes"
  | "checkins"
  | "reminders"
  | "closes"
  | "dismissals"
  | "plans"
  | "staff"
  | "templates"
  | "tasks"
  | "imports"
  | "branch";

export interface Mutation {
  table: TableName;
  type: "insert" | "update";
  row: Record<string, unknown> & { id: string };
}

export interface Actor {
  staffId: string | null;
  role: Role;
  deviceId?: string | null;
}
