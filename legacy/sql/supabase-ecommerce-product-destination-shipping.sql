-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce product/destination shipping and sellable country controls.
-- Created 2026-08-15.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- Must be run AFTER docs/supabase-ecommerce-manual-production-hardening.sql.
--
-- Scope:
-- - Moves sellable destinations and shipping costs from code/provider-only fields to data.
-- - Adds provider default shipping rates per country plus product-level overrides.
-- - Adds product-level enabled countries and shipping display mode.
-- - Supersedes create_ecommerce_product/update_ecommerce_product definitions so product
--   country enablement is saved atomically with the rest of the product.
--
-- Do not run via psql from Codex.

begin;

create table if not exists public.ecommerce_shop_countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null,
  is_enabled boolean not null default false,
  requires_legal_review boolean not null default false,
  legal_review_note text not null default '',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ecommerce_shop_countries_set_updated_at on public.ecommerce_shop_countries;
create trigger ecommerce_shop_countries_set_updated_at
  before update on public.ecommerce_shop_countries
  for each row
  execute function public.set_updated_at();

alter table public.ecommerce_shop_countries enable row level security;

drop policy if exists "Public can read ecommerce shop countries" on public.ecommerce_shop_countries;
create policy "Public can read ecommerce shop countries"
  on public.ecommerce_shop_countries
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage ecommerce shop countries" on public.ecommerce_shop_countries;
create policy "Admins can manage ecommerce shop countries"
  on public.ecommerce_shop_countries
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.ecommerce_shop_countries (code, name, is_enabled, requires_legal_review, legal_review_note, admin_note)
values
  ('US', 'United States', true, false, '', 'Launch market. Stripe Checkout accepts US shipping addresses only until Katie deliberately enables more countries.'),
  ('AU', 'Australia', false, false, '', 'Next candidate market. Verify provider shipping, price model, GST thresholds, and returns text before enabling.'),
  ('NZ', 'New Zealand', false, false, '', 'Second-phase candidate market. Verify provider shipping, price model, GST thresholds, and returns text before enabling.'),
  ('GB', 'United Kingdom', false, true, 'Requires professional review before enabling: UK distance-selling consumer withdrawal rights and VAT obligations may conflict with the made-to-order final-sale model.', ''),
  ('DE', 'Germany', false, true, 'Requires professional review before enabling: EU distance-selling consumer withdrawal rights may conflict with the made-to-order final-sale model.', ''),
  ('FR', 'France', false, true, 'Requires professional review before enabling: EU distance-selling consumer withdrawal rights may conflict with the made-to-order final-sale model.', ''),
  ('ES', 'Spain', false, true, 'Requires professional review before enabling: EU distance-selling consumer withdrawal rights may conflict with the made-to-order final-sale model.', ''),
  ('IT', 'Italy', false, true, 'Requires professional review before enabling: EU distance-selling consumer withdrawal rights may conflict with the made-to-order final-sale model.', ''),
  ('NL', 'Netherlands', false, true, 'Requires professional review before enabling: EU distance-selling consumer withdrawal rights may conflict with the made-to-order final-sale model.', '')
on conflict (code)
do update set
  name = excluded.name,
  requires_legal_review = excluded.requires_legal_review,
  legal_review_note = excluded.legal_review_note,
  admin_note = case
    when public.ecommerce_shop_countries.admin_note = '' then excluded.admin_note
    else public.ecommerce_shop_countries.admin_note
  end,
  updated_at = now();

alter table public.products
  add column if not exists shipping_price_mode text not null default 'included';

alter table public.products
  drop constraint if exists products_shipping_price_mode_check;

alter table public.products
  add constraint products_shipping_price_mode_check
  check (shipping_price_mode in ('included', 'separate'));

comment on column public.products.shipping_price_mode is
  'included = retail price includes shipping. separate = shipping is charged as its own Checkout line and stored in orders.shipping_cents.';

create table if not exists public.ecommerce_provider_shipping_rates (
  id uuid primary key default gen_random_uuid(),
  provider text not null references public.ecommerce_providers(code) on update cascade on delete cascade,
  country_code text not null references public.ecommerce_shop_countries(code) on update cascade on delete restrict,
  first_item_cents integer not null check (first_item_cents >= 0),
  additional_item_cents integer not null check (additional_item_cents >= 0),
  currency text not null default 'USD',
  source_note text not null default '',
  verified_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, country_code),
  check (currency ~ '^[A-Z]{3}$')
);

create index if not exists ecommerce_provider_shipping_rates_provider_idx
  on public.ecommerce_provider_shipping_rates (provider, country_code, is_active);

drop trigger if exists ecommerce_provider_shipping_rates_set_updated_at on public.ecommerce_provider_shipping_rates;
create trigger ecommerce_provider_shipping_rates_set_updated_at
  before update on public.ecommerce_provider_shipping_rates
  for each row
  execute function public.set_updated_at();

alter table public.ecommerce_provider_shipping_rates enable row level security;

drop policy if exists "Public can read active provider shipping rates" on public.ecommerce_provider_shipping_rates;
create policy "Public can read active provider shipping rates"
  on public.ecommerce_provider_shipping_rates
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can manage provider shipping rates" on public.ecommerce_provider_shipping_rates;
create policy "Admins can manage provider shipping rates"
  on public.ecommerce_provider_shipping_rates
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.product_shipping_rates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  country_code text not null references public.ecommerce_shop_countries(code) on update cascade on delete restrict,
  first_item_cents integer not null check (first_item_cents >= 0),
  additional_item_cents integer not null check (additional_item_cents >= 0),
  currency text not null default 'USD',
  source_note text not null default '',
  verified_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, country_code),
  check (currency ~ '^[A-Z]{3}$')
);

create index if not exists product_shipping_rates_product_idx
  on public.product_shipping_rates (product_id, country_code, is_active);

drop trigger if exists product_shipping_rates_set_updated_at on public.product_shipping_rates;
create trigger product_shipping_rates_set_updated_at
  before update on public.product_shipping_rates
  for each row
  execute function public.set_updated_at();

alter table public.product_shipping_rates enable row level security;

drop policy if exists "Public can read active product shipping rates" on public.product_shipping_rates;
create policy "Public can read active product shipping rates"
  on public.product_shipping_rates
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.products p
      where p.id = product_shipping_rates.product_id
        and p.is_active = true
    )
  );

drop policy if exists "Admins can manage product shipping rates" on public.product_shipping_rates;
create policy "Admins can manage product shipping rates"
  on public.product_shipping_rates
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.product_enabled_countries (
  product_id uuid not null references public.products(id) on delete cascade,
  country_code text not null references public.ecommerce_shop_countries(code) on update cascade on delete restrict,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, country_code)
);

create index if not exists product_enabled_countries_country_idx
  on public.product_enabled_countries (country_code, is_enabled);

drop trigger if exists product_enabled_countries_set_updated_at on public.product_enabled_countries;
create trigger product_enabled_countries_set_updated_at
  before update on public.product_enabled_countries
  for each row
  execute function public.set_updated_at();

alter table public.product_enabled_countries enable row level security;

drop policy if exists "Public can read active product enabled countries" on public.product_enabled_countries;
create policy "Public can read active product enabled countries"
  on public.product_enabled_countries
  for select
  to anon, authenticated
  using (
    is_enabled = true
    and exists (
      select 1
      from public.products p
      where p.id = product_enabled_countries.product_id
        and p.is_active = true
    )
  );

drop policy if exists "Admins can manage product enabled countries" on public.product_enabled_countries;
create policy "Admins can manage product enabled countries"
  on public.product_enabled_countries
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.ecommerce_provider_shipping_rates (
  provider, country_code, first_item_cents, additional_item_cents, currency, source_note, verified_at, is_active
)
select
  code,
  'US',
  shipping_first_item_cents,
  shipping_additional_item_cents,
  'USD',
  'Backfilled from provider-level shipping fields during Etapa 9 migration.',
  current_date,
  provider_is_sellable and shipping_cost_status = 'published'
from public.ecommerce_providers
where 'US' = any(shipping_countries)
  and shipping_cost_status = 'published'
on conflict (provider, country_code)
do update set
  first_item_cents = excluded.first_item_cents,
  additional_item_cents = excluded.additional_item_cents,
  currency = excluded.currency,
  source_note = case
    when public.ecommerce_provider_shipping_rates.source_note = '' then excluded.source_note
    else public.ecommerce_provider_shipping_rates.source_note
  end,
  verified_at = coalesce(public.ecommerce_provider_shipping_rates.verified_at, excluded.verified_at),
  is_active = excluded.is_active,
  updated_at = now();

insert into public.product_enabled_countries (product_id, country_code, is_enabled)
select p.id, 'US', p.is_active
from public.products p
join public.ecommerce_providers ep on ep.code = p.provider
where 'US' = any(ep.shipping_countries)
  and exists (
    select 1
    from public.ecommerce_provider_shipping_rates psr
    where psr.provider = p.provider
      and psr.country_code = 'US'
      and psr.is_active = true
  )
on conflict (product_id, country_code)
do update set
  is_enabled = excluded.is_enabled,
  updated_at = now();

create or replace function public.ecommerce_product_has_effective_shipping_rate(
  target_product_id uuid,
  target_country_code text
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.products p
    where p.id = target_product_id
      and (
        exists (
          select 1
          from public.product_shipping_rates psr
          where psr.product_id = p.id
            and psr.country_code = target_country_code
            and psr.is_active = true
        )
        or exists (
          select 1
          from public.ecommerce_provider_shipping_rates epsr
          where epsr.provider = p.provider
            and epsr.country_code = target_country_code
            and epsr.is_active = true
        )
      )
  );
$$;

create or replace function public.ecommerce_product_effective_shipping_rates(target_product_id uuid)
returns table (
  product_id uuid,
  country_code text,
  country_name text,
  first_item_cents integer,
  additional_item_cents integer,
  currency text,
  rate_source text
)
language sql
stable
set search_path = public
as $$
  select
    p.id as product_id,
    c.code as country_code,
    c.name as country_name,
    coalesce(psr.first_item_cents, epsr.first_item_cents) as first_item_cents,
    coalesce(psr.additional_item_cents, epsr.additional_item_cents) as additional_item_cents,
    coalesce(psr.currency, epsr.currency, p.currency) as currency,
    case when psr.id is not null then 'product' else 'provider' end as rate_source
  from public.products p
  join public.ecommerce_providers ep on ep.code = p.provider
  join public.ecommerce_shop_countries c on c.code = any(ep.shipping_countries)
  left join public.product_shipping_rates psr
    on psr.product_id = p.id
   and psr.country_code = c.code
   and psr.is_active = true
  left join public.ecommerce_provider_shipping_rates epsr
    on epsr.provider = p.provider
   and epsr.country_code = c.code
   and epsr.is_active = true
  where p.id = target_product_id
    and c.is_enabled = true
    and coalesce(psr.id, epsr.id) is not null;
$$;

create or replace function public.enforce_product_enabled_country()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  product_row public.products%rowtype;
  provider_row public.ecommerce_providers%rowtype;
  country_row public.ecommerce_shop_countries%rowtype;
begin
  if new.is_enabled = false then
    return new;
  end if;

  select * into product_row from public.products where id = new.product_id;
  if not found then
    raise exception 'Product % does not exist.', new.product_id;
  end if;

  select * into provider_row from public.ecommerce_providers where code = product_row.provider;
  if not found then
    raise exception 'Provider % does not exist.', product_row.provider;
  end if;

  select * into country_row from public.ecommerce_shop_countries where code = new.country_code;
  if not found then
    raise exception 'Country % is not configured for the shop.', new.country_code;
  end if;

  if country_row.is_enabled = false then
    raise exception 'Country % is not enabled for the shop.', new.country_code;
  end if;

  if country_row.requires_legal_review then
    raise exception 'Country % requires legal review before sales can be enabled.', new.country_code;
  end if;

  if not (new.country_code = any(provider_row.shipping_countries)) then
    raise exception 'Provider % does not declare shipping to %.', provider_row.code, new.country_code;
  end if;

  if not public.ecommerce_product_has_effective_shipping_rate(new.product_id, new.country_code) then
    raise exception 'Product % cannot sell to % without a known shipping rate.', new.product_id, new.country_code;
  end if;

  return new;
end;
$$;

drop trigger if exists product_enabled_countries_enforce_sellability on public.product_enabled_countries;
create constraint trigger product_enabled_countries_enforce_sellability
after insert or update of is_enabled, country_code on public.product_enabled_countries
deferrable initially deferred
for each row
execute function public.enforce_product_enabled_country();

create or replace function public.enforce_product_sellability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  provider_row public.ecommerce_providers%rowtype;
begin
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

drop view if exists public.ecommerce_public_sellable_product_countries;
create view public.ecommerce_public_sellable_product_countries as
select
  pec.product_id,
  c.code as country_code,
  c.name as country_name,
  p.shipping_price_mode,
  rates.first_item_cents,
  rates.additional_item_cents,
  rates.currency,
  rates.rate_source
from public.product_enabled_countries pec
join public.products p on p.id = pec.product_id
join public.ecommerce_shop_countries c on c.code = pec.country_code
join lateral public.ecommerce_product_effective_shipping_rates(pec.product_id) rates
  on rates.country_code = pec.country_code
where pec.is_enabled = true
  and p.is_active = true
  and c.is_enabled = true;

grant select on public.ecommerce_public_sellable_product_countries to anon, authenticated;

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
