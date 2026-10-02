-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: atomic ecommerce product update RPC
-- Paste this in Supabase SQL Editor and run it once.
--
-- Scope:
-- - Updates one product plus its selected variants and print files atomically.
-- - Never deletes product_variants: deselected variants are deactivated so
--   historical order_items references remain valid.
-- - Replaces product_files inside the transaction because order history does
--   not reference those rows.
--
-- Important:
-- - Do not run via psql/direct DB connection.
-- - The project owner runs this manually in Supabase SQL Editor.

begin;

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

  update public.products
  set
    name = trim(product_input->>'name'),
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
        select jsonb_array_elements_text(
          coalesce(product_input->'example_images', '[]'::jsonb)
        )
      ),
      '{}'::text[]
    ),
    is_active = coalesce((product_input->>'is_active')::boolean, false)
  where id = target_product_id
  returning * into updated_product;

  if not found then
    raise exception 'Product % not found', target_product_id;
  end if;

  -- Preserve every existing row for order history. Rows absent from the
  -- submitted selection remain available for later reactivation.
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

  -- Files have no order-history foreign key, so replacing them is safe.
  -- Deleting first also avoids collisions while positions are renumbered.
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
