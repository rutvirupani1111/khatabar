-- Payments copied from a gym's old sheet are opening balances, not money taken at the counter today.
-- They get their own mode so the drawer, today's page, the takings and receipt numbers leave them out.
alter table payments drop constraint if exists payments_mode_check;
alter table payments add constraint payments_mode_check check (mode in ('cash','upi_desk','upi_member','card','import'));
