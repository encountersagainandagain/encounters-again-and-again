-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Allow legacy size-guide rows to be archived without inventing garment identity.
-- Created 2026-08-26.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- Run AFTER docs/supabase-ecommerce-product-size-guide-garment-identity.sql.
--
-- Background:
-- Rows created before garment identity was introduced can have NULL base-garment fields.
-- The original NOT VALID check leaves those rows in place, but PostgreSQL evaluates the
-- check on every later UPDATE. That made it impossible to set an old row is_active=false
-- after inserting its valid replacement. The replacement was committed by the first API
-- request, while the second request failed with 23514 and left two active guides.
--
-- This migration does not invent identity for historical evidence. It requires identity
-- for every active measured guide, permits missing identity only on archived/inactive rows,
-- and removes duplicate active flags by keeping the newest valid active guide per product.
--
-- Do not run via psql from Codex.

begin;

alter table public.product_size_guides
  drop constraint if exists product_size_guides_declared_garment_identity_check;

alter table public.product_size_guides
  add constraint product_size_guides_declared_garment_identity_check
  check (
    is_active = false
    or no_published_measurements = true
    or (
      length(trim(coalesce(base_garment_name, ''))) between 1 and 160
      and length(trim(coalesce(base_garment_provider_identifier, ''))) between 1 and 120
    )
  )
  not valid;

-- A failed two-request save may have left both the new valid guide and an old legacy guide
-- active. Keep one active guide per product, preferring a guide with declared identity and
-- then the most recently created version. Older rows remain as immutable historical records.
with ranked_active_guides as (
  select
    id,
    row_number() over (
      partition by product_id
      order by
        case
          when no_published_measurements = false
            and length(trim(coalesce(base_garment_name, ''))) between 1 and 160
            and length(trim(coalesce(base_garment_provider_identifier, ''))) between 1 and 120
            then 0
          when no_published_measurements = true then 1
          else 2
        end,
        source_checked_at desc,
        created_at desc,
        id desc
    ) as active_rank
  from public.product_size_guides
  where is_active = true
)
update public.product_size_guides guide
set
  is_active = false,
  updated_at = now()
from ranked_active_guides ranked
where guide.id = ranked.id
  and ranked.active_rank > 1;

notify pgrst, 'reload schema';

commit;
