-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce order refunds ledger.
-- Apply after docs/supabase-ecommerce-order-payment-intent.sql and
-- docs/supabase-ecommerce-order-tracking-notifications.sql.
--
-- Scope:
-- - Adds order_refunds as an append-only accounting ledger, one row per Stripe refund operation.
-- - Extends order_customer_notifications to record refund emails.
--
-- Important:
-- - Do not run via psql/direct DB connection.
-- - The project owner runs this manually in Supabase SQL Editor.

begin;

create table if not exists public.order_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid references public.order_items(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  quantity integer check (quantity is null or quantity > 0),
  reason text not null check (length(trim(reason)) > 0),
  stripe_refund_id text not null unique,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_order_refunds_updated_at on public.order_refunds;
create trigger set_order_refunds_updated_at
before update on public.order_refunds
for each row
execute function public.set_updated_at();

create index if not exists order_refunds_order_created_idx
  on public.order_refunds (order_id, created_at desc);

create index if not exists order_refunds_order_item_idx
  on public.order_refunds (order_item_id)
  where order_item_id is not null;

alter table public.order_refunds enable row level security;

drop policy if exists "Admins can read order refunds"
on public.order_refunds;
create policy "Admins can read order refunds"
on public.order_refunds
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create order refunds"
on public.order_refunds;
create policy "Admins can create order refunds"
on public.order_refunds
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update order refunds"
on public.order_refunds;

drop policy if exists "Admins can delete order refunds"
on public.order_refunds;

do $$
declare
  notification_check_name text;
begin
  select con.conname
  into notification_check_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'order_customer_notifications'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%notification_type%'
  limit 1;

  if notification_check_name is not null then
    execute format('alter table public.order_customer_notifications drop constraint %I', notification_check_name);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_customer_notifications_notification_type_check'
      and conrelid = 'public.order_customer_notifications'::regclass
  ) then
    alter table public.order_customer_notifications
    add constraint order_customer_notifications_notification_type_check
    check (
      notification_type in (
        'payment_received',
        'manual_provider_submitted',
        'shipped',
        'delivered',
        'refund'
      )
    );
  end if;
end $$;

comment on table public.order_refunds is
  'Append-only refund ledger. One row maps to one Stripe refund operation. Refund state is derived from sums, not cached on orders.';

comment on column public.order_refunds.order_item_id is
  'Nullable. Null means the refund operation applies to the order as a whole; non-null points to the refunded item line.';

comment on column public.order_refunds.quantity is
  'Quantity refunded for item-level refunds. Null for order-level refund operations.';

commit;
