-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: ecommerce manual provider variants
-- Paste this in Supabase SQL Editor and run it once.
--
-- Scope:
-- - Allows product_variants.provider_variant_id to be NULL for manual providers
--   that do not have an external API/catalog variant id.
--
-- Design:
-- - provider_variant_id remains required by app logic for API providers like Printful.
-- - provider_base_cost_cents stays NOT NULL because manual providers still need a
--   cost loaded by Katie for margin calculations.
-- - Existing positive check constraints can remain: PostgreSQL CHECK constraints
--   pass NULL values, while still rejecting non-positive API ids.
--
-- Important:
-- - Do not run via psql/direct DB connection.
-- - The project owner runs this manually in Supabase SQL Editor.

begin;

alter table public.product_variants
alter column provider_variant_id drop not null;

comment on column public.product_variants.provider_variant_id is
  'External provider variant id. Required for API providers such as Printful; NULL for manual providers without a catalog API.';

comment on column public.product_variants.provider_base_cost_cents is
  'Provider base cost for this color/size variant. For manual providers, Katie enters this manually.';

commit;
