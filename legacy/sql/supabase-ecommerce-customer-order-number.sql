-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce customer-facing order numbers.
-- Created 2026-08-13.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- Must be run AFTER docs/supabase-ecommerce-provider-api-policy-editing.sql.
--
-- Scope:
-- - Adds a short customer-facing order number such as WKS-1042.
-- - The UUID remains the internal primary key.
-- - A split checkout with multiple provider orders shares one customer_order_number.
-- - Existing orders are backfilled; orders that share a stripe_session_id receive
--   the same customer_order_number, while orders without a session receive one each.

begin;

create sequence if not exists public.ecommerce_customer_order_number_seq
  as bigint
  start with 1000
  increment by 1
  minvalue 1000
  no cycle;

alter table public.orders
  add column if not exists customer_order_number text;

comment on column public.orders.customer_order_number is
  'Customer-facing purchase number, shared by all provider-split internal orders from the same checkout. UUID id remains the internal key.';

alter table public.orders
  drop constraint if exists orders_customer_order_number_format_check;

alter table public.orders
  add constraint orders_customer_order_number_format_check
  check (
    customer_order_number is null
    or customer_order_number ~ '^WKS-[0-9]{4,}$'
  );

create index if not exists orders_customer_order_number_idx
  on public.orders (customer_order_number);

create or replace function public.next_ecommerce_customer_order_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'WKS-' || lpad(nextval('public.ecommerce_customer_order_number_seq')::text, 4, '0');
$$;

revoke all on function public.next_ecommerce_customer_order_number() from public;
grant execute on function public.next_ecommerce_customer_order_number() to service_role;

do $$
declare
  order_group record;
  next_order_number text;
begin
  for order_group in
    select
      coalesce(stripe_session_id, id::text) as group_key
    from public.orders
    where customer_order_number is null
    group by coalesce(stripe_session_id, id::text)
    order by min(created_at), min(id::text)
  loop
    select public.next_ecommerce_customer_order_number() into next_order_number;

    update public.orders
       set customer_order_number = next_order_number
     where customer_order_number is null
       and coalesce(stripe_session_id, id::text) = order_group.group_key;
  end loop;
end;
$$;

alter table public.orders
  alter column customer_order_number set not null;

create or replace function public.prevent_order_customer_number_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.customer_order_number is not null
    and new.customer_order_number is distinct from old.customer_order_number then
    raise exception 'customer_order_number is append-only';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_prevent_customer_number_mutation on public.orders;
create trigger orders_prevent_customer_number_mutation
  before update on public.orders
  for each row
  execute function public.prevent_order_customer_number_mutation();

commit;
