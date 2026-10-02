-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce product-level shipping rate RPC support.
-- Created 2026-08-21.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- This migration is additive to the schema: product_shipping_rates already exists.
-- It SUPERSEDES the create_ecommerce_product/update_ecommerce_product definitions from:
-- - docs/supabase-ecommerce-product-destination-shipping.sql
--
-- New behavior:
-- - product_input.shipping_rates is an optional array of product/country shipping overrides.
-- - Omitted countries inherit the provider/country default.
-- - update_ecommerce_product deactivates prior product overrides before inserting/upserting the
--   submitted active overrides, which lets Katie revert a product back to the provider default.

begin;

create or replace function public.create_ecommerce_product(
  product_input jsonb,
  variant_inputs jsonb default '[]'::jsonb,
  file_inputs jsonb default '[]'::jsonb
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  created_product public.products%rowtype;
  variant_input jsonb;
  file_input jsonb;
  image_input jsonb;
  country_input jsonb;
  shipping_rate_input jsonb;
  selected_provider text;
  selected_catalog_product_id integer;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  selected_provider := coalesce(nullif(product_input->>'provider', ''), 'printful');
  selected_catalog_product_id := nullif(product_input->>'provider_catalog_product_id', '')::integer;

  if selected_provider = 'printful' and selected_catalog_product_id is null then
    selected_catalog_product_id := 12;
  end if;

  if exists (
    select 1 from public.ecommerce_providers
    where code = selected_provider
      and fulfillment_mode = 'manual'
      and selected_catalog_product_id is not null
  ) then
    raise exception 'Manual providers must not inherit an API catalog product id';
  end if;

  if coalesce(jsonb_typeof(product_input), '') <> 'object' then
    raise exception 'product_input must be an object';
  end if;
  if coalesce(jsonb_typeof(variant_inputs), '') <> 'array' then
    raise exception 'variant_inputs must be an array';
  end if;
  if jsonb_array_length(variant_inputs) = 0 then
    raise exception 'At least one product variant is required';
  end if;
  if coalesce(jsonb_typeof(file_inputs), '') <> 'array' then
    raise exception 'file_inputs must be an array';
  end if;
  if coalesce(jsonb_typeof(coalesce(product_input->'product_images', '[]'::jsonb)), '') <> 'array' then
    raise exception 'product_input.product_images must be an array';
  end if;
  if coalesce(jsonb_typeof(coalesce(product_input->'enabled_countries', '[]'::jsonb)), '') <> 'array' then
    raise exception 'product_input.enabled_countries must be an array';
  end if;
  if coalesce(jsonb_typeof(coalesce(product_input->'shipping_rates', '[]'::jsonb)), '') <> 'array' then
    raise exception 'product_input.shipping_rates must be an array';
  end if;

  insert into public.products (
    name, slug, description, retail_price_cents, currency, provider,
    provider_catalog_product_id, provider_print_provider_id, provider_meta,
    example_images, shipping_price_mode, is_active
  )
  values (
    trim(product_input->>'name'),
    trim(product_input->>'slug'),
    coalesce(product_input->>'description', ''),
    (product_input->>'retail_price_cents')::integer,
    coalesce(nullif(product_input->>'currency', ''), 'USD'),
    selected_provider,
    selected_catalog_product_id,
    nullif(product_input->>'provider_print_provider_id', '')::integer,
    coalesce(product_input->'provider_meta', '{}'::jsonb),
    coalesce(
      array(
        select image_item->>'image_url'
        from jsonb_array_elements(coalesce(product_input->'product_images', '[]'::jsonb))
          as product_image_items(image_item)
        where length(trim(coalesce(image_item->>'image_url', ''))) > 0
        order by coalesce((image_item->>'position')::integer, 0)
      ),
      '{}'::text[]
    ),
    coalesce(nullif(product_input->>'shipping_price_mode', ''), 'included'),
    coalesce((product_input->>'is_active')::boolean, false)
  )
  returning * into created_product;

  for country_input in select value from jsonb_array_elements(coalesce(product_input->'enabled_countries', '[]'::jsonb))
  loop
    insert into public.product_enabled_countries (product_id, country_code, is_enabled)
    values (
      created_product.id,
      upper(trim(country_input->>'country_code')),
      coalesce((country_input->>'is_enabled')::boolean, true)
    );
  end loop;

  for shipping_rate_input in select value from jsonb_array_elements(coalesce(product_input->'shipping_rates', '[]'::jsonb))
  loop
    if coalesce((shipping_rate_input->>'is_active')::boolean, true) then
      insert into public.product_shipping_rates (
        product_id, country_code, first_item_cents, additional_item_cents,
        currency, source_note, verified_at, is_active
      )
      values (
        created_product.id,
        upper(trim(shipping_rate_input->>'country_code')),
        (shipping_rate_input->>'first_item_cents')::integer,
        (shipping_rate_input->>'additional_item_cents')::integer,
        coalesce(nullif(shipping_rate_input->>'currency', ''), created_product.currency),
        coalesce(shipping_rate_input->>'source_note', ''),
        nullif(shipping_rate_input->>'verified_at', '')::date,
        true
      );
    end if;
  end loop;

  for image_input in select value from jsonb_array_elements(coalesce(product_input->'product_images', '[]'::jsonb))
  loop
    insert into public.product_images (product_id, image_url, color, alt_text, position)
    values (
      created_product.id,
      trim(image_input->>'image_url'),
      nullif(trim(coalesce(image_input->>'color', '')), ''),
      coalesce(image_input->>'alt_text', ''),
      coalesce((image_input->>'position')::integer, 0)
    );
  end loop;

  for variant_input in select value from jsonb_array_elements(variant_inputs)
  loop
    insert into public.product_variants (
      product_id, color, color_code, size, provider_variant_id,
      provider_base_cost_cents, available_us, is_active
    )
    values (
      created_product.id,
      trim(variant_input->>'color'),
      coalesce(variant_input->>'color_code', ''),
      trim(variant_input->>'size'),
      nullif(variant_input->>'provider_variant_id', '')::integer,
      coalesce((variant_input->>'provider_base_cost_cents')::integer, 0),
      coalesce((variant_input->>'available_us')::boolean, false),
      coalesce((variant_input->>'is_active')::boolean, false)
    );
  end loop;

  for file_input in select value from jsonb_array_elements(file_inputs)
  loop
    insert into public.product_files (product_id, placement, file_url, provider_file_type, position)
    values (
      created_product.id,
      trim(file_input->>'placement'),
      trim(file_input->>'file_url'),
      coalesce(nullif(file_input->>'provider_file_type', ''), 'default'),
      coalesce((file_input->>'position')::integer, 0)
    );
  end loop;

  return created_product;
end;
$$;

revoke all on function public.create_ecommerce_product(jsonb, jsonb, jsonb) from public;
grant execute on function public.create_ecommerce_product(jsonb, jsonb, jsonb) to authenticated;

create or replace function public.update_ecommerce_product(
  target_product_id uuid,
  product_input jsonb,
  variant_inputs jsonb default '[]'::jsonb,
  file_inputs jsonb default '[]'::jsonb
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_product public.products%rowtype;
  variant_input jsonb;
  file_input jsonb;
  image_input jsonb;
  country_input jsonb;
  shipping_rate_input jsonb;
  selected_provider text;
  selected_catalog_product_id integer;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  selected_provider := coalesce(nullif(product_input->>'provider', ''), 'printful');
  selected_catalog_product_id := nullif(product_input->>'provider_catalog_product_id', '')::integer;

  if selected_provider = 'printful' and selected_catalog_product_id is null then
    selected_catalog_product_id := 12;
  end if;

  if exists (
    select 1 from public.ecommerce_providers
    where code = selected_provider
      and fulfillment_mode = 'manual'
      and selected_catalog_product_id is not null
  ) then
    raise exception 'Manual providers must not inherit an API catalog product id';
  end if;

  if coalesce(jsonb_typeof(product_input), '') <> 'object' then
    raise exception 'product_input must be an object';
  end if;
  if coalesce(jsonb_typeof(variant_inputs), '') <> 'array' then
    raise exception 'variant_inputs must be an array';
  end if;
  if jsonb_array_length(variant_inputs) = 0 then
    raise exception 'At least one product variant is required';
  end if;
  if coalesce(jsonb_typeof(file_inputs), '') <> 'array' then
    raise exception 'file_inputs must be an array';
  end if;
  if coalesce(jsonb_typeof(coalesce(product_input->'product_images', '[]'::jsonb)), '') <> 'array' then
    raise exception 'product_input.product_images must be an array';
  end if;
  if coalesce(jsonb_typeof(coalesce(product_input->'enabled_countries', '[]'::jsonb)), '') <> 'array' then
    raise exception 'product_input.enabled_countries must be an array';
  end if;
  if coalesce(jsonb_typeof(coalesce(product_input->'shipping_rates', '[]'::jsonb)), '') <> 'array' then
    raise exception 'product_input.shipping_rates must be an array';
  end if;

  update public.products
  set
    name = trim(product_input->>'name'),
    slug = trim(product_input->>'slug'),
    description = coalesce(product_input->>'description', ''),
    retail_price_cents = (product_input->>'retail_price_cents')::integer,
    currency = coalesce(nullif(product_input->>'currency', ''), 'USD'),
    provider = selected_provider,
    provider_catalog_product_id = selected_catalog_product_id,
    provider_print_provider_id = nullif(product_input->>'provider_print_provider_id', '')::integer,
    provider_meta = coalesce(product_input->'provider_meta', '{}'::jsonb),
    example_images = coalesce(
      array(
        select image_item->>'image_url'
        from jsonb_array_elements(coalesce(product_input->'product_images', '[]'::jsonb))
          as product_image_items(image_item)
        where length(trim(coalesce(image_item->>'image_url', ''))) > 0
        order by coalesce((image_item->>'position')::integer, 0)
      ),
      '{}'::text[]
    ),
    shipping_price_mode = coalesce(nullif(product_input->>'shipping_price_mode', ''), 'included'),
    is_active = coalesce((product_input->>'is_active')::boolean, false)
  where id = target_product_id
  returning * into updated_product;

  if not found then
    raise exception 'Product % not found', target_product_id;
  end if;

  update public.product_enabled_countries
  set is_enabled = false
  where product_id = target_product_id;

  for country_input in select value from jsonb_array_elements(coalesce(product_input->'enabled_countries', '[]'::jsonb))
  loop
    insert into public.product_enabled_countries (product_id, country_code, is_enabled)
    values (
      target_product_id,
      upper(trim(country_input->>'country_code')),
      coalesce((country_input->>'is_enabled')::boolean, true)
    )
    on conflict (product_id, country_code)
    do update set
      is_enabled = excluded.is_enabled,
      updated_at = now();
  end loop;

  update public.product_shipping_rates
  set is_active = false
  where product_id = target_product_id;

  for shipping_rate_input in select value from jsonb_array_elements(coalesce(product_input->'shipping_rates', '[]'::jsonb))
  loop
    if coalesce((shipping_rate_input->>'is_active')::boolean, true) then
      insert into public.product_shipping_rates (
        product_id, country_code, first_item_cents, additional_item_cents,
        currency, source_note, verified_at, is_active
      )
      values (
        target_product_id,
        upper(trim(shipping_rate_input->>'country_code')),
        (shipping_rate_input->>'first_item_cents')::integer,
        (shipping_rate_input->>'additional_item_cents')::integer,
        coalesce(nullif(shipping_rate_input->>'currency', ''), updated_product.currency),
        coalesce(shipping_rate_input->>'source_note', ''),
        nullif(shipping_rate_input->>'verified_at', '')::date,
        true
      )
      on conflict (product_id, country_code)
      do update set
        first_item_cents = excluded.first_item_cents,
        additional_item_cents = excluded.additional_item_cents,
        currency = excluded.currency,
        source_note = excluded.source_note,
        verified_at = excluded.verified_at,
        is_active = true,
        updated_at = now();
    end if;
  end loop;

  delete from public.product_images where product_id = target_product_id;

  for image_input in select value from jsonb_array_elements(coalesce(product_input->'product_images', '[]'::jsonb))
  loop
    insert into public.product_images (product_id, image_url, color, alt_text, position)
    values (
      target_product_id,
      trim(image_input->>'image_url'),
      nullif(trim(coalesce(image_input->>'color', '')), ''),
      coalesce(image_input->>'alt_text', ''),
      coalesce((image_input->>'position')::integer, 0)
    );
  end loop;

  update public.product_variants set is_active = false where product_id = target_product_id;

  for variant_input in select value from jsonb_array_elements(variant_inputs)
  loop
    insert into public.product_variants (
      product_id, color, color_code, size, provider_variant_id,
      provider_base_cost_cents, available_us, is_active
    )
    values (
      target_product_id,
      trim(variant_input->>'color'),
      coalesce(variant_input->>'color_code', ''),
      trim(variant_input->>'size'),
      nullif(variant_input->>'provider_variant_id', '')::integer,
      coalesce((variant_input->>'provider_base_cost_cents')::integer, 0),
      coalesce((variant_input->>'available_us')::boolean, false),
      coalesce((variant_input->>'is_active')::boolean, false)
    )
    on conflict (product_id, color, size)
    do update set
      color_code = excluded.color_code,
      provider_variant_id = excluded.provider_variant_id,
      provider_base_cost_cents = excluded.provider_base_cost_cents,
      available_us = excluded.available_us,
      is_active = excluded.is_active;
  end loop;

  delete from public.product_files where product_id = target_product_id;

  for file_input in select value from jsonb_array_elements(file_inputs)
  loop
    insert into public.product_files (product_id, placement, file_url, provider_file_type, position)
    values (
      target_product_id,
      trim(file_input->>'placement'),
      trim(file_input->>'file_url'),
      coalesce(nullif(file_input->>'provider_file_type', ''), 'default'),
      coalesce((file_input->>'position')::integer, 0)
    );
  end loop;

  return updated_product;
end;
$$;

revoke all on function public.update_ecommerce_product(uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.update_ecommerce_product(uuid, jsonb, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
