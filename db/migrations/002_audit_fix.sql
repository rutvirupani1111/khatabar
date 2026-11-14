-- kb_audit compared old.phone on every table, which plpgsql cannot resolve for
-- tables without a phone column. Compare through jsonb instead.
create or replace function kb_audit() returns trigger language plpgsql as $$
declare
  b jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  a jsonb := to_jsonb(new);
begin
  if tg_table_name = 'members' then
    if tg_op = 'UPDATE'
       and (b->'phone') is not distinct from (a->'phone')
       and (b->'archived_at') is not distinct from (a->'archived_at')
       and (b->'anonymised_at') is not distinct from (a->'anonymised_at') then
      return new;
    end if;
    b := b - 'photo';
    a := a - 'photo';
  end if;
  insert into audit_log (org_id, branch_id, table_name, row_id, action, actor, device_id, before, after)
  values (a->>'org_id', a->>'branch_id', tg_table_name, a->>'id', lower(tg_op),
          nullif(current_setting('kb.actor', true), ''), nullif(current_setting('kb.device', true), ''), b, a);
  return new;
end $$;
