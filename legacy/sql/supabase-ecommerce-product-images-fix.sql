-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: ecommerce product images RPC ambiguity fix
-- Paste this in Supabase SQL Editor and run it once.
--
-- SUPERSEDES the RPC definitions from:
-- - docs/supabase-ecommerce-product-images.sql
--
-- Scope:
-- - Replaces create_ecommerce_product and update_ecommerce_product only.
-- - Fixes SQLSTATE 42702 by avoiding image_input as a column alias inside
--   the products.example_images compatibility mirror subqueries.
-- - Keeps all existing guards: is_admin() first, security definer, fixed
--   search_path, revoke from public, grant execute to authenticated.
--
-- Important:
-- - Do not run via psql/direct DB connection.
-- - The project owner runs this manually in Supabase SQL Editor.

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
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
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

  insert into public.products (
    name,
    slug,
    description,
    retail_price_cents,
    currency,
    provider,
    provider_catalog_product_id,
    provider_print_provider_id,
    provider_meta,
    example_images,
    is_active
  )
  values (
    trim(product_input->>'name'),
    trim(product_input->>'slug'),
    coalesce(product_input->>'description', ''),
    (product_input->>'retail_price_cents')::integer,
    coalesce(nullif(product_input->>'currency', ''), 'USD'),
    coalesce(nullif(product_input->>'provider', ''), 'printful'),
    coalesce((product_input->>'provider_catalog_product_id')::integer, 12),
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
    coalesce((product_input->>'is_active')::boolean, false)
  )
  returning * into created_product;

  for image_input in
    select value from jsonb_array_elements(coalesce(product_input->'product_images', '[]'::jsonb))
  loop
    insert into public.product_images (
      product_id,
      image_url,
      color,
      alt_text,
      position
    )
    values (
      created_product.id,
      trim(image_input->>'image_url'),
      nullif(trim(coalesce(image_input->>'color', '')), ''),
      coalesce(image_input->>'alt_text', ''),
      coalesce((image_input->>'position')::integer, 0)
    );
  end loop;

  for variant_input in
    select value from jsonb_array_elements(variant_inputs)
  loop
    insert into public.product_variants (
      product_id,
      color,
      color_code,
      size,
      provider_variant_id,
      provider_base_cost_cents,
      available_us,
      is_active
    )
    values (
      created_product.id,
      trim(variant_input->>'color'),
      coalesce(variant_input->>'color_code', ''),
      trim(variant_input->>'size'),
      (variant_input->>'provider_variant_id')::integer,
      coalesce((variant_input->>'provider_base_cost_cents')::integer, 0),
      coalesce((variant_input->>'available_us')::boolean, false),
      coalesce((variant_input->>'is_active')::boolean, false)
    );
  end loop;

  for file_input in
    select value from jsonb_array_elements(file_inputs)
  loop
    insert into public.product_files (
      product_id,
      placement,
      file_url,
      provider_file_type,
      position
    )
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
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
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

  update public.products
  set
    name = trim(product_input->>'name'),
    slug = trim(product_input->>'slug'),
    description = coalesce(product_input->>'description', ''),
    retail_price_cents = (product_input->>'retail_price_cents')::integer,
    currency = coalesce(nullif(product_input->>'currency', ''), 'USD'),
    provider = coalesce(nullif(product_input->>'provider', ''), 'printful'),
    provider_catalog_product_id =
      coalesce((product_input->>'provider_catalog_product_id')::integer, 12),
    provider_print_provider_id =
      nullif(product_input->>'provider_print_provider_id', '')::integer,
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
    is_active = coalesce((product_input->>'is_active')::boolean, false)
  where id = target_product_id
  returning * into updated_product;

  if not found then
    raise exception 'Product % not found', target_product_id;
  end if;

  delete from public.product_images
  where product_id = target_product_id;

  for image_input in
    select value from jsonb_array_elements(coalesce(product_input->'product_images', '[]'::jsonb))
  loop
    insert into public.product_images (
      product_id,
      image_url,
      color,
      alt_text,
      position
    )
    values (
      target_product_id,
      trim(image_input->>'image_url'),
      nullif(trim(coalesce(image_input->>'color', '')), ''),
      coalesce(image_input->>'alt_text', ''),
      coalesce((image_input->>'position')::integer, 0)
    );
  end loop;

  update public.product_variants
  set is_active = false
  where product_id = target_product_id;

  for variant_input in
    select value from jsonb_array_elements(variant_inputs)
  loop
    insert into public.product_variants (
      product_id,
      color,
      color_code,
      size,
      provider_variant_id,
      provider_base_cost_cents,
      available_us,
      is_active
    )
    values (
      target_product_id,
      trim(variant_input->>'color'),
      coalesce(variant_input->>'color_code', ''),
      trim(variant_input->>'size'),
      (variant_input->>'provider_variant_id')::integer,
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

  delete from public.product_files
  where product_id = target_product_id;

  for file_input in
    select value from jsonb_array_elements(file_inputs)
  loop
    insert into public.product_files (
      product_id,
      placement,
      file_url,
      provider_file_type,
      position
    )
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

revoke all on function public.update_ecommerce_product(uuid, jsonb, jsonb, jsonb)
from public;
grant execute on function public.update_ecommerce_product(uuid, jsonb, jsonb, jsonb)
to authenticated;

commit;
