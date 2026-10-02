-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: ecommerce product images + current product RPC definitions
-- Paste this in Supabase SQL Editor and run it once.
--
-- SUPERSEDES:
-- - docs/supabase-ecommerce-create-product-rpc.sql
-- - docs/supabase-ecommerce-update-product-rpc.sql
-- - docs/supabase-ecommerce-product-slug.sql RPC definitions
--
-- Scope:
-- - Adds product_images so example photos can have color, alt text, and position.
-- - Backfills product_images from products.example_images.
-- - Keeps products.example_images as a deprecated compatibility mirror for now.
-- - Replaces the create/update ecommerce product RPCs so they write product_images.
--
-- Important:
-- - Do not run via psql/direct DB connection.
-- - The project owner runs this manually in Supabase SQL Editor.

begin;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null check (length(trim(image_url)) > 0),
  color text,
  alt_text text not null default '',
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_images_product_position_idx
on public.product_images(product_id, position);

create index if not exists product_images_product_color_idx
on public.product_images(product_id, color);

drop trigger if exists set_product_images_updated_at on public.product_images;
create trigger set_product_images_updated_at
before update on public.product_images
for each row
execute function public.set_updated_at();

alter table public.product_images enable row level security;

drop policy if exists "Anyone can read active product images" on public.product_images;
create policy "Anyone can read active product images"
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and products.is_active = true
  )
);

drop policy if exists "Admins can manage product images" on public.product_images;
create policy "Admins can manage product images"
on public.product_images
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.product_images (
  product_id,
  image_url,
  color,
  alt_text,
  position
)
select
  products.id,
  image_url,
  null,
  products.name,
  image_position - 1
from public.products
cross join lateral unnest(products.example_images) with ordinality as image(image_url, image_position)
where not exists (
  select 1
  from public.product_images
  where product_images.product_id = products.id
    and product_images.image_url = image.image_url
);

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
        select image_input->>'image_url'
        from jsonb_array_elements(coalesce(product_input->'product_images', '[]'::jsonb))
          as product_image_items(image_input)
        where length(trim(coalesce(image_input->>'image_url', ''))) > 0
        order by coalesce((image_input->>'position')::integer, 0)
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
        select image_input->>'image_url'
        from jsonb_array_elements(coalesce(product_input->'product_images', '[]'::jsonb))
          as product_image_items(image_input)
        where length(trim(coalesce(image_input->>'image_url', ''))) > 0
        order by coalesce((image_input->>'position')::integer, 0)
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
