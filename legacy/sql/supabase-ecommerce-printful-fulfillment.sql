-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce Printful fulfillment fields.
-- Apply after docs/supabase-ecommerce-order-refunds.sql.
--
-- Scope:
-- - Adds provider submission observability to orders for Etapa 6.
-- - Keeps provider_cost_cents as the existing real/estimated cost field.
--
-- Important:
-- - Do not run via psql/direct DB connection.
-- - The project owner runs this manually in Supabase SQL Editor.

begin;

alter table public.orders
add column if not exists provider_submitted_at timestamptz,
add column if not exists provider_last_attempt_at timestamptz,
add column if not exists provider_last_error text not null default '';

comment on column public.orders.provider_submitted_at is
  'Timestamp when the order was successfully submitted to the fulfillment provider. For Printful draft test mode, this means a draft was created.';

comment on column public.orders.provider_last_attempt_at is
  'Timestamp of the latest fulfillment submission attempt.';

comment on column public.orders.provider_last_error is
  'Latest fulfillment provider error shown in admin. Empty string means no current provider error.';

comment on column public.orders.provider_cost_cents is
  'Provider cost in cents. For Printful, updated with the real costs returned by the order/draft response when available.';

commit;
