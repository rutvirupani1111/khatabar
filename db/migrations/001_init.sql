-- Khatabar v1 schema (Neon Postgres).
-- An org owns branches; a branch owns everything else. Every query from the app
-- is scoped by branch_id in the API layer (lib/server), and every index starts
-- with branch_id. Ids are text (uuid v7 made on the desk) so offline changes
-- keep their identity when they sync. Money is whole paise (bigint).

create table if not exists kv (k text primary key, v text not null);

create table if not exists orgs (
  id text primary key,
  name text not null,
  slug text unique not null,
  plan_tier text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  email text unique not null,
  name text not null default '',
  pass_hash text not null,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create table if not exists branches (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  name text not null,
  code text not null,
  city text not null default '',
  vpa text not null default '',
  payee_name text not null default '',
  gstin text not null default '',
  tz text not null default 'Asia/Kolkata',
  color text not null default '#B5372A',
  checkin_key text not null,
  settings jsonb not null default '{}',
  member_seq int not null default 0,
  receipt_seq int not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists staff (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  branch_id text references branches(id) on delete cascade,
  user_id text references users(id) on delete set null,
  name text not null,
  role text not null check (role in ('owner','manager','desk','trainer')),
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists staff_branch on staff (branch_id);

create table if not exists devices (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  branch_id text not null references branches(id) on delete cascade,
  label text not null default 'Desk',
  token_hash text unique not null,
  paired_by text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create table if not exists pair_codes (
  code text primary key,
  org_id text not null,
  branch_id text not null references branches(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists plans (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  branch_id text references branches(id) on delete cascade,
  kind text not null default 'time' check (kind in ('time','sessions','addon')),
  name_en text not null,
  name_hi text not null default '',
  months int not null default 0,
  days int not null default 0,
  sessions int not null default 0,
  price bigint not null,
  joining_fee bigint not null default 0,
  gst_inclusive boolean not null default true,
  gst_rate numeric not null default 18,
  freeze_max_count int not null default 0,
  freeze_max_days int not null default 0,
  freeze_min_days int not null default 1,
  plate text not null default 'p10',
  active boolean not null default true,
  sort int not null default 0
);
create index if not exists plans_org on plans (org_id, branch_id);

create table if not exists members (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  branch_id text not null references branches(id) on delete cascade,
  member_no text not null,
  name text not null,
  phone text not null,
  alt_phone text not null default '',
  emergency text not null default '',
  gender text not null default '',
  dob date,
  photo text,
  notes text not null default '',
  source text not null default 'walk-in',
  import_id text,
  wa_consent_at timestamptz,
  reminders_opt_out boolean not null default false,
  weekly_target int not null default 3,
  trainer_id text,
  link_ver int not null default 1,
  archived_at timestamptz,
  anonymised_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, member_no)
);
create index if not exists members_branch_phone on members (branch_id, phone);
create index if not exists members_import on members (branch_id, import_id);

create table if not exists member_links (
  id text primary key,
  member_id text not null references members(id) on delete cascade,
  branch_id text not null,
  token_hash text unique not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists memberships (
  id text primary key,
  org_id text not null,
  branch_id text not null references branches(id) on delete cascade,
  member_id text not null references members(id) on delete cascade,
  plan_id text not null references plans(id),
  addon_of text,
  start_date date not null,
  base_end_date date not null,
  frozen_days int not null default 0,
  end_date date generated always as (base_end_date + frozen_days) stored,
  price bigint not null,
  discount bigint not null default 0,
  joining_fee bigint not null default 0,
  status text not null default 'active' check (status in ('active','requested','void')),
  lapse_reason text,
  sessions_left int,
  created_by text,
  created_at timestamptz not null default now(),
  client_op_id text
);
create index if not exists memberships_branch on memberships (branch_id, member_id);
create index if not exists memberships_end on memberships (branch_id, end_date);

create table if not exists payments (
  id text primary key,
  org_id text not null,
  branch_id text not null references branches(id) on delete cascade,
  member_id text not null references members(id) on delete cascade,
  membership_id text,
  amount bigint not null,
  mode text not null check (mode in ('cash','upi_desk','upi_member','card')),
  state text not null check (state in ('pending','confirmed','rejected')),
  utr_last4 text not null default '',
  received_by text,
  confirmed_by text,
  confirmed_at timestamptz,
  reverses_id text,
  receipt_no text not null default '',
  created_at timestamptz not null default now(),
  client_op_id text
);
create index if not exists payments_branch on payments (branch_id, created_at);
create index if not exists payments_member on payments (branch_id, member_id);

create table if not exists freezes (
  id text primary key,
  branch_id text not null references branches(id) on delete cascade,
  membership_id text not null references memberships(id) on delete cascade,
  member_id text not null,
  from_date date not null,
  to_date date not null,
  days int not null,
  reason text not null default '',
  state text not null check (state in ('requested','approved','rejected','cancelled')),
  requested_by text not null default 'staff',
  decided_by text,
  created_at timestamptz not null default now()
);
create index if not exists freezes_branch on freezes (branch_id, member_id);

-- Append-only, one partition per month. One check-in per member per IST hour.
create table if not exists checkins (
  id text not null,
  branch_id text not null,
  member_id text not null,
  at timestamptz not null,
  ist_date date not null,
  ist_hour int not null,
  method text not null,
  staff_id text,
  device_id text,
  on_credit boolean not null default false,
  client_op_id text,
  primary key (id, ist_date),
  unique (member_id, branch_id, ist_date, ist_hour)
) partition by range (ist_date);
create index if not exists checkins_branch_date on checkins (branch_id, ist_date);

create or replace function kb_checkin_partitions(months_ahead int default 3) returns void language plpgsql as $$
declare
  m date := date_trunc('month', (now() at time zone 'Asia/Kolkata')::date - interval '3 months')::date;
  last date := date_trunc('month', (now() at time zone 'Asia/Kolkata')::date + make_interval(months => months_ahead))::date;
  nm text;
begin
  while m <= last loop
    nm := 'checkins_' || to_char(m, 'YYYY_MM');
    if to_regclass('public.' || nm) is null then
      execute format('create table %I partition of checkins for values from (%L) to (%L)', nm, m, (m + interval '1 month')::date);
    end if;
    m := (m + interval '1 month')::date;
  end loop;
end $$;
select kb_checkin_partitions(3);

create table if not exists reminders (
  id text primary key,
  branch_id text not null references branches(id) on delete cascade,
  membership_id text,
  member_id text not null,
  stage text not null,
  due_date date not null,
  state text not null default 'queued',
  opened_by text,
  opened_at timestamptz,
  skipped_reason text not null default ''
);
create unique index if not exists reminders_once on reminders (membership_id, stage) where stage not in ('manual','missed');
create index if not exists reminders_branch on reminders (branch_id, state);

create table if not exists templates (
  id text primary key,
  org_id text not null references orgs(id) on delete cascade,
  stage text not null,
  lang text not null,
  body text not null,
  active boolean not null default true
);

create table if not exists cash_closes (
  id text primary key,
  branch_id text not null references branches(id) on delete cascade,
  staff_id text,
  shift_start timestamptz,
  shift_end timestamptz not null,
  counts jsonb not null default '{}',
  expected bigint not null,
  counted bigint not null,
  shortfall bigint not null,
  upi_total bigint not null default 0,
  reason text not null default '',
  reopened_by text,
  reopened_at timestamptz
);
create index if not exists closes_branch on cash_closes (branch_id, shift_end);

create table if not exists churn_dismissals (
  id text primary key,
  branch_id text not null references branches(id) on delete cascade,
  member_id text not null,
  reason text not null default '',
  until_date date not null,
  by text
);

create table if not exists imports (
  id text primary key,
  branch_id text not null references branches(id) on delete cascade,
  file_name text not null default '',
  row_count int not null default 0,
  mapping jsonb not null default '{}',
  created_by text,
  created_at timestamptz not null default now(),
  undone_at timestamptz,
  finalised_at timestamptz
);

create table if not exists tasks (
  id text primary key,
  branch_id text not null references branches(id) on delete cascade,
  member_id text not null,
  kind text not null,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create table if not exists pt_sessions (
  id text primary key,
  branch_id text not null,
  membership_id text not null,
  trainer_staff_id text,
  at timestamptz not null default now(),
  logged_by text
);

-- Idempotent op log: a retried desk change is answered from here, never applied twice.
create table if not exists ops (
  client_op_id text primary key,
  branch_id text not null,
  kind text not null,
  actor text,
  applied_at timestamptz not null default now(),
  result jsonb not null
);

create table if not exists attempts (
  k text not null,
  at timestamptz not null default now()
);
create index if not exists attempts_k on attempts (k, at);

-- Who changed money, terms, freezes, prices, closes and member phones.
create table if not exists audit_log (
  id bigserial primary key,
  org_id text,
  branch_id text,
  table_name text not null,
  row_id text not null,
  action text not null,
  actor text,
  device_id text,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index if not exists audit_branch on audit_log (branch_id, at);

create or replace function kb_audit() returns trigger language plpgsql as $$
declare
  b jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  a jsonb := to_jsonb(new);
begin
  if tg_table_name = 'members' and tg_op = 'UPDATE'
     and old.phone is not distinct from new.phone
     and old.archived_at is not distinct from new.archived_at
     and old.anonymised_at is not distinct from new.anonymised_at then
    return new;
  end if;
  if tg_table_name = 'members' then
    b := b - 'photo';
    a := a - 'photo';
  end if;
  insert into audit_log (org_id, branch_id, table_name, row_id, action, actor, device_id, before, after)
  values (a->>'org_id', a->>'branch_id', tg_table_name, a->>'id', lower(tg_op),
          nullif(current_setting('kb.actor', true), ''), nullif(current_setting('kb.device', true), ''), b, a);
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['payments','memberships','freezes','plans','cash_closes','members'] loop
    execute format('drop trigger if exists %I on %I', 'audit_' || t, t);
    execute format('create trigger %I after insert or update on %I for each row execute function kb_audit()', 'audit_' || t, t);
  end loop;
end $$;
