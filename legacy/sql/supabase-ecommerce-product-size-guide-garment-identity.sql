-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce product size guide garment identity hardening.
-- Created 2026-08-21.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- This migration is additive and does not touch donation/support flows.
--
-- Why this exists:
-- Manual-provider size guides are evidence. A guide must say which base garment
-- and provider identifier/SKU it belongs to, otherwise a copied chart from the
-- wrong garment can be frozen into an order snapshot.

begin;

alter table public.product_size_guides
  add column if not exists base_garment_name text,
  add column if not exists base_garment_provider_identifier text;

comment on column public.product_size_guides.base_garment_name is
  'Manual size-guide evidence: exact blank/base garment whose measurements were copied.';

comment on column public.product_size_guides.base_garment_provider_identifier is
  'Manual size-guide evidence: provider SKU/style/listing identifier for the declared base garment.';

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'product_size_guides_declared_garment_identity_check'
       and conrelid = 'public.product_size_guides'::regclass
  ) then
    alter table public.product_size_guides
      add constraint product_size_guides_declared_garment_identity_check
      check (
        no_published_measurements = true
        or (
          length(trim(coalesce(base_garment_name, ''))) between 1 and 160
          and length(trim(coalesce(base_garment_provider_identifier, ''))) between 1 and 120
        )
      )
      not valid;
  end if;
end $$;

commit;
