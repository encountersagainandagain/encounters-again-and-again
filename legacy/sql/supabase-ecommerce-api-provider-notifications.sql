-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce API provider customer notifications
-- Date: 2026-08-09
--
-- Adds a customer notification type for automatic API provider confirmation emails
-- (Printful now; Printify later). This supersedes the notification_type check from
-- docs/supabase-ecommerce-order-tracking-notifications.sql and
-- docs/supabase-ecommerce-order-refunds.sql.
--
-- Run manually in Supabase SQL Editor inside the real project.

begin;

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

  alter table public.order_customer_notifications
  add constraint order_customer_notifications_notification_type_check
  check (
    notification_type in (
      'payment_received',
      'manual_provider_submitted',
      'api_provider_submitted',
      'shipped',
      'delivered',
      'refund'
    )
  );
end $$;

commit;
