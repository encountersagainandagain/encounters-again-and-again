-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce refund cause classification
-- Date: 2026-08-09
--
-- Distinguishes refunds caused by a process/provider failure from normal customer
-- service refunds. Only process failures should count as operational incidents.
--
-- Run manually in Supabase SQL Editor inside the real project.

begin;

alter table public.order_refunds
  add column if not exists cause text not null default 'process_failure';

do $$
declare
  refund_cause_check_name text;
begin
  select con.conname
  into refund_cause_check_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'order_refunds'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%cause%'
  limit 1;

  if refund_cause_check_name is not null then
    execute format('alter table public.order_refunds drop constraint %I', refund_cause_check_name);
  end if;

  alter table public.order_refunds
  add constraint order_refunds_cause_check
  check (cause in ('process_failure', 'customer_request'));
end $$;

comment on column public.order_refunds.cause is
  'Refund cause classification. process_failure counts as operational incident; customer_request is normal customer service noise.';

commit;
