-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce Stripe payment intent support.
-- Adds the Stripe PaymentIntent id to orders so future full/partial refunds can target
-- the authoritative Stripe charge created by Checkout.
--
-- Apply manually in Supabase SQL Editor inside the real project. Do not run via psql.

begin;

alter table public.orders
  add column if not exists stripe_payment_intent_id text;

create index if not exists orders_stripe_payment_intent_id_idx
  on public.orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

commit;
