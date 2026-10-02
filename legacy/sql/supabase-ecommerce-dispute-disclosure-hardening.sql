-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce dispute disclosure hardening.
-- Created 2026-08-10.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- This supersedes docs/supabase-ecommerce-dispute-disclosure.sql for the
-- append-only evidence trigger, and supersedes the current product RPC
-- definitions only to remove the silent provider_catalog_product_id = 12
-- default for non-Printful/manual providers.
--
-- Do not run via psql from Codex.

begin;

create table if not exists public.product_size_guides (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  version text not null,
  unit text not null,
  measurement_type text not null,
  title text not null,
  tolerance text not null default '',
  source_url text not null default '',
  source_checked_at timestamptz not null default now(),
  guide jsonb not null,
  source_note text not null default '',
  no_published_measurements boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, version),
  check (
    no_published_measurements = false
    or (guide = '{"tables":[]}'::jsonb and length(trim(source_note)) > 0)
  )
);

create index if not exists product_size_guides_active_idx
  on public.product_size_guides (product_id, is_active, source_checked_at desc);

drop trigger if exists product_size_guides_set_updated_at on public.product_size_guides;
create trigger product_size_guides_set_updated_at
  before update on public.product_size_guides
  for each row
  execute function public.set_updated_at();

alter table public.product_size_guides enable row level security;

drop policy if exists "Public can read active product size guides" on public.product_size_guides;
create policy "Public can read active product size guides"
  on public.product_size_guides
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.products p
      where p.id = product_size_guides.product_id
        and p.is_active = true
    )
  );

drop policy if exists "Admins can manage product size guides" on public.product_size_guides;
create policy "Admins can manage product size guides"
  on public.product_size_guides
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.product_size_guides is
  'Versioned product-specific size guides. Manual providers must use this table; checkout blocks rather than attaching unrelated catalog measurements.';

alter table public.products
  alter column provider_catalog_product_id drop not null;

comment on column public.products.provider_catalog_product_id is
  'External catalog/blank product id for API providers. NULL for manual providers unless a real external catalog id exists. Must not silently default to Printful Gildan 64000.';

update public.products p
set provider_catalog_product_id = null
from public.ecommerce_providers ep
where ep.code = p.provider
  and ep.fulfillment_mode = 'manual'
  and p.provider_catalog_product_id = 12;

alter table public.orders
  add column if not exists return_policy_version text,
  add column if not exists return_policy_url text,
  add column if not exists size_guide_version text,
  add column if not exists size_guide_snapshot jsonb,
  add column if not exists terms_accepted boolean not null default false,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists customer_purchase_ip inet,
  add column if not exists customer_purchase_user_agent text,
  add column if not exists cart_terms_accepted boolean not null default false,
  add column if not exists cart_terms_accepted_at timestamptz,
  add column if not exists cart_terms_version text,
  add column if not exists cart_terms_text text;

comment on column public.orders.cart_terms_accepted is
  'Append-only evidence: customer checked What Katie Seas cart policy disclosure before Stripe Checkout.';
comment on column public.orders.cart_terms_text is
  'Append-only evidence: exact What Katie Seas cart disclosure text shown before Stripe Checkout.';

alter table public.order_operational_incidents
  drop constraint if exists order_operational_incidents_incident_type_check;

alter table public.order_operational_incidents
  add constraint order_operational_incidents_incident_type_check
  check (
    incident_type in (
      'manual_refund',
      'manual_provider_retry',
      'manual_status_change',
      'missing_terms_consent'
    )
  );

create or replace function public.prevent_order_dispute_evidence_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.return_policy_version is not null
    and new.return_policy_version is distinct from old.return_policy_version then
    raise exception 'return_policy_version is append-only';
  end if;

  if old.return_policy_url is not null
    and new.return_policy_url is distinct from old.return_policy_url then
    raise exception 'return_policy_url is append-only';
  end if;

  if old.size_guide_version is not null
    and new.size_guide_version is distinct from old.size_guide_version then
    raise exception 'size_guide_version is append-only';
  end if;

  if old.size_guide_snapshot is not null
    and new.size_guide_snapshot is distinct from old.size_guide_snapshot then
    raise exception 'size_guide_snapshot is append-only';
  end if;

  if old.terms_accepted = true
    and new.terms_accepted is distinct from old.terms_accepted then
    raise exception 'terms_accepted is append-only once true';
  end if;

  if old.terms_accepted_at is not null
    and new.terms_accepted_at is distinct from old.terms_accepted_at then
    raise exception 'terms_accepted_at is append-only';
  end if;

  if old.customer_purchase_ip is not null
    and new.customer_purchase_ip is distinct from old.customer_purchase_ip then
    raise exception 'customer_purchase_ip is append-only';
  end if;

  if old.customer_purchase_user_agent is not null
    and new.customer_purchase_user_agent is distinct from old.customer_purchase_user_agent then
    raise exception 'customer_purchase_user_agent is append-only';
  end if;

  if old.cart_terms_accepted = true
    and new.cart_terms_accepted is distinct from old.cart_terms_accepted then
    raise exception 'cart_terms_accepted is append-only once true';
  end if;

  if old.cart_terms_accepted_at is not null
    and new.cart_terms_accepted_at is distinct from old.cart_terms_accepted_at then
    raise exception 'cart_terms_accepted_at is append-only';
  end if;

  if old.cart_terms_version is not null
    and new.cart_terms_version is distinct from old.cart_terms_version then
    raise exception 'cart_terms_version is append-only';
  end if;

  if old.cart_terms_text is not null
    and new.cart_terms_text is distinct from old.cart_terms_text then
    raise exception 'cart_terms_text is append-only';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_prevent_dispute_evidence_mutation on public.orders;
create trigger orders_prevent_dispute_evidence_mutation
  before update on public.orders
  for each row
  execute function public.prevent_order_dispute_evidence_mutation();

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

  insert into public.products (
    name, slug, description, retail_price_cents, currency, provider,
    provider_catalog_product_id, provider_print_provider_id, provider_meta,
    example_images, is_active
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
    coalesce((product_input->>'is_active')::boolean, false)
  )
  returning * into created_product;

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
    is_active = coalesce((product_input->>'is_active')::boolean, false)
  where id = target_product_id
  returning * into updated_product;

  if not found then
    raise exception 'Product % not found', target_product_id;
  end if;

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

commit;
