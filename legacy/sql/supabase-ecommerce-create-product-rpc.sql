-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: atomic ecommerce product creation RPC
-- Paste this in Supabase SQL Editor and run it once.
--
-- Scope:
-- - Adds a security-definer RPC that creates one product plus its variants
--   and print files atomically.
-- - Does not modify existing table structure.
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

  insert into public.products (
    name,
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
    coalesce(product_input->>'description', ''),
    (product_input->>'retail_price_cents')::integer,
    coalesce(nullif(product_input->>'currency', ''), 'USD'),
    coalesce(nullif(product_input->>'provider', ''), 'printful'),
    coalesce((product_input->>'provider_catalog_product_id')::integer, 12),
    nullif(product_input->>'provider_print_provider_id', '')::integer,
    coalesce(product_input->'provider_meta', '{}'::jsonb),
    coalesce(
      array(
        select jsonb_array_elements_text(coalesce(product_input->'example_images', '[]'::jsonb))
      ),
      '{}'::text[]
    ),
    coalesce((product_input->>'is_active')::boolean, false)
  )
  returning * into created_product;

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

commit;
