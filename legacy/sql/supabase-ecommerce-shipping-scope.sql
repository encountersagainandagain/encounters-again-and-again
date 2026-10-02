-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce shipping scope and provider shipping-country metadata.
-- Created 2026-08-14.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- Must be run AFTER:
-- 1. docs/supabase-ecommerce-provider-unpublished-policy.sql
--
-- This migration stores where each provider says it can ship as provider metadata.
-- It is deliberately separate from the shop's commercial selling countries, which are
-- defined in application code. A provider shipping somewhere does not mean What Katie
-- Seas sells there.

begin;

alter table public.ecommerce_providers
  add column if not exists shipping_countries text[] not null default '{}';

alter table public.ecommerce_providers
  drop constraint if exists ecommerce_providers_shipping_countries_codes;

alter table public.ecommerce_providers
  add constraint ecommerce_providers_shipping_countries_codes
    check (
      cardinality(shipping_countries) = 0
      or array_to_string(shipping_countries, ',') ~ '^([A-Z]{2})(,[A-Z]{2})*$'
    );

comment on column public.ecommerce_providers.shipping_countries is
  'Provider-reported ISO 3166-1 alpha-2 shipping countries. Informational only; shop selling countries are controlled separately in application code.';

update public.ecommerce_providers
set shipping_countries = array['US']
where code = 'printful'
  and cardinality(shipping_countries) = 0;

update public.ecommerce_providers
set shipping_countries = array['US']
where code = 'printify'
  and cardinality(shipping_countries) = 0;

-- TapStitch remains intentionally untouched here. Its current verified policy data does
-- not include complete shipping cost/time details, so Katie should record confirmed
-- shipping countries in the admin together with the missing shipping costs.

notify pgrst, 'reload schema';

commit;
