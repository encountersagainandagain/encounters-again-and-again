-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce order tracking and customer notification history.
-- Supersedes no previous SQL file; apply after docs/supabase-ecommerce-order-payment-intent.sql.
--
-- Scope:
-- - Adds provider-agnostic tracking fields to orders for manual providers and future Printful webhooks.
-- - Adds order_customer_notifications to record customer-facing email attempts.
--
-- Important:
-- - Do not run via psql/direct DB connection.
-- - The project owner runs this manually in Supabase SQL Editor.

begin;

alter table public.orders
  add column if not exists tracking_carrier text not null default '',
  add column if not exists tracking_number text not null default '',
  add column if not exists tracking_url text not null default '';

create table if not exists public.order_customer_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  notification_type text not null check (
    notification_type in (
      'payment_received',
      'manual_provider_submitted',
      'shipped',
      'delivered'
    )
  ),
  status text not null check (status in ('sent', 'failed')),
  recipient_email text not null default '',
  subject text not null default '',
  resend_email_id text,
  error_message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists order_customer_notifications_order_created_idx
  on public.order_customer_notifications (order_id, created_at desc);

create index if not exists order_customer_notifications_type_status_idx
  on public.order_customer_notifications (notification_type, status);

alter table public.order_customer_notifications enable row level security;

drop policy if exists "Admins can read order customer notifications"
on public.order_customer_notifications;
create policy "Admins can read order customer notifications"
on public.order_customer_notifications
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create order customer notifications"
on public.order_customer_notifications;
create policy "Admins can create order customer notifications"
on public.order_customer_notifications
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update order customer notifications"
on public.order_customer_notifications;
create policy "Admins can update order customer notifications"
on public.order_customer_notifications
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete order customer notifications"
on public.order_customer_notifications;
create policy "Admins can delete order customer notifications"
on public.order_customer_notifications
for delete
to authenticated
using (public.is_admin());

comment on column public.orders.tracking_carrier is
  'Shipping carrier/provider-reported carrier. Used by manual providers and future Printful/Printify webhooks.';

comment on column public.orders.tracking_number is
  'Carrier tracking number. Empty string means no tracking number is available yet.';

comment on column public.orders.tracking_url is
  'Public tracking URL. Empty string means no tracking URL is available yet.';

comment on table public.order_customer_notifications is
  'History of customer-facing ecommerce email attempts. Used to show Katie what was sent and preserve failed attempts for retry/debugging.';

commit;
