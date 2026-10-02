-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: ecommerce product slugs + current product RPC definitions
-- Paste this in Supabase SQL Editor and run it once.
--
-- SUPERSEDES:
-- - docs/supabase-ecommerce-create-product-rpc.sql
-- - docs/supabase-ecommerce-update-product-rpc.sql
--
-- Scope:
-- - Adds products.slug for public /shop/[slug] URLs.
-- - Backfills existing products from name before enforcing NOT NULL/UNIQUE.
-- - Replaces the create/update ecommerce product RPCs so they accept and write slug.
--
-- Important:
-- - Do not run via psql/direct DB connection.
-- - The project owner runs this manually in Supabase SQL Editor.

begin;

alter table public.products
add column if not exists slug text;

with generated as (
  select
    id,
    coalesce(
      nullif(
        regexp_replace(
          regexp_replace(
            lower(
              translate(
                name,
                'áàäâãåāăąÁÀÄÂÃÅĀĂĄéèëêēĕėęěÉÈËÊĒĔĖĘĚíìïîīĭįıÍÌÏÎĪĬĮóòöôõøōŏőÓÒÖÔÕØŌŎŐúùüûūŭůűųÚÙÜÛŪŬŮŰŲñÑçÇýÿÝß',
                'aaaaaaaaaAAAAAAAAAeeeeeeeeeEEEEEEEEEiiiiiiiiIIIIIIIoooooooooOOOOOOOOOuuuuuuuuuUUUUUUUUUnNcCyyYs'
              )
            ),
            '[^a-z0-9]+',
            '-',
            'g'
          ),
          '(^-|-$)',
          '',
          'g'
        ),
        ''
      ),
      'product'
    ) as base_slug,
    created_at
  from public.products
  where slug is null or trim(slug) = ''
),
ranked as (
  select
    id,
    base_slug,
    row_number() over (partition by base_slug order by created_at, id) as duplicate_number
  from generated
)
update public.products as product
set slug = case
  when ranked.duplicate_number = 1 then ranked.base_slug
  else ranked.base_slug || '-' || ranked.duplicate_number::text
end
from ranked
where product.id = ranked.id;

update public.products
set slug = regexp_replace(
  regexp_replace(
    lower(
      translate(
        slug,
        'áàäâãåāăąÁÀÄÂÃÅĀĂĄéèëêēĕėęěÉÈËÊĒĔĖĘĚíìïîīĭįıÍÌÏÎĪĬĮóòöôõøōŏőÓÒÖÔÕØŌŎŐúùüûūŭůűųÚÙÜÛŪŬŮŰŲñÑçÇýÿÝß',
        'aaaaaaaaaAAAAAAAAAeeeeeeeeeEEEEEEEEEiiiiiiiiIIIIIIIoooooooooOOOOOOOOOuuuuuuuuuUUUUUUUUUnNcCyyYs'
      )
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  ),
  '(^-|-$)',
  '',
  'g'
)
where slug is not null;

alter table public.products
alter column slug set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_slug_format_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
    add constraint products_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_slug_key'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
    add constraint products_slug_key unique (slug);
  end if;
end;
$$;

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
