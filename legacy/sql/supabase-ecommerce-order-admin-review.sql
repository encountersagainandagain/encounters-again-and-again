-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Run manually in Supabase SQL Editor.
-- Records when Katie first opens a Stripe-confirmed order in the admin dashboard.
-- This is intentionally separate from customer/order fulfillment status.

alter table public.orders
  add column if not exists admin_reviewed_at timestamptz;

drop index if exists public.orders_paid_unreviewed_idx;

create index orders_paid_unreviewed_idx
  on public.orders(created_at desc)
  where stripe_payment_intent_id is not null and admin_reviewed_at is null;
