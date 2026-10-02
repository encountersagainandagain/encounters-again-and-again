-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Allow a complete manual product to bootstrap its size guide before activation.
-- Created 2026-08-25.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- Run AFTER docs/supabase-ecommerce-product-destination-shipping.sql and
-- docs/supabase-ecommerce-manual-production-hardening.sql.
--
-- This supersedes only public.enforce_product_sellability(). It preserves the
-- production lock for API providers while allowing an inactive manual-product draft
-- to exist before its product-specific size guide is inserted. Deactivation by UPDATE
-- remains unconditionally allowed, even for inconsistent legacy rows.
--
-- Do not run via psql from Codex.

begin;

create or replace function public.enforce_product_sellability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  provider_row public.ecommerce_providers%rowtype;
begin
  -- Turning a product off must always be possible. This is intentionally before every
  -- provider/guide/shipping check so inconsistent data can still be made safer.
  if TG_OP = 'UPDATE' and new.is_active = false then
    return new;
  end if;

  select *
  into provider_row
  from public.ecommerce_providers
  where code = new.provider;

  if not found then
    raise exception 'Product cannot use provider % because it does not exist.', new.provider;
  end if;

  -- Locked API providers cannot be used for new products, including inactive drafts.
  if provider_row.fulfillment_mode = 'api' and provider_row.api_fulfillment_enabled = false then
    raise exception 'Product cannot use provider % because API fulfillment is locked for production.', new.provider;
  end if;

  if provider_row.is_active = false or provider_row.provider_is_sellable = false then
    raise exception 'Product cannot be active because provider % is not sellable.', new.provider;
  end if;

  if provider_row.fulfillment_mode = 'manual' and new.provider_catalog_product_id is not null then
    raise exception 'Manual provider products must not use an API catalog product id.';
  end if;

  if provider_row.fulfillment_mode = 'api' and new.provider_catalog_product_id is null then
    raise exception 'API provider products require a provider catalog product id.';
  end if;

  -- A new manual product must exist briefly as an inactive draft so its product-specific
  -- size guide can reference products.id. Sellability checks apply on the later activation.
  if new.is_active = false then
    return new;
  end if;

  if not public.product_size_guide_covers_active_sizes(
    new.id,
    new.provider,
    new.provider_catalog_product_id
  ) then
    raise exception 'Product cannot be active because its size guide is missing or does not cover every active size.';
  end if;

  if not exists (
    select 1
    from public.product_enabled_countries pec
    where pec.product_id = new.id
      and pec.is_enabled = true
      and public.ecommerce_product_has_effective_shipping_rate(new.id, pec.country_code)
  ) then
    raise exception 'Product cannot be active until at least one enabled country has a known shipping rate.';
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';

commit;
