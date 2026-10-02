-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: ecommerce + Printful foundation
-- Paste this in Supabase SQL Editor, then run it once.
-- Requires public.set_updated_at() and public.is_admin(), created earlier
-- in docs/supabase-posts.sql and docs/supabase-admin-security.sql.
--
-- Scope: data model only. No UI, API routes, checkout logic, or Printful submission.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  retail_price_cents integer not null check (retail_price_cents > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  printful_catalog_product_id integer not null default 12 check (printful_catalog_product_id > 0),
  example_images text[] not null default '{}',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_created_idx
on public.products(is_active, created_at desc);

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products"
on public.products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color text not null check (length(trim(color)) > 0),
  color_code text not null default '' check (
    color_code = ''
    or color_code ~ '^#[0-9A-Fa-f]{6}$'
  ),
  size text not null check (length(trim(size)) > 0),
  printful_variant_id integer not null check (printful_variant_id > 0),
  printful_base_cost_cents integer not null default 0 check (printful_base_cost_cents >= 0),
  available_us boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_product_color_size_key unique (product_id, color, size),
  constraint product_variants_product_printful_variant_key unique (product_id, printful_variant_id)
);

create index if not exists product_variants_product_active_idx
on public.product_variants(product_id, is_active, available_us);

create index if not exists product_variants_printful_variant_idx
on public.product_variants(printful_variant_id);

drop trigger if exists set_product_variants_updated_at on public.product_variants;
create trigger set_product_variants_updated_at
before update on public.product_variants
for each row
execute function public.set_updated_at();

alter table public.product_variants enable row level security;

drop policy if exists "Anyone can read active product variants" on public.product_variants;
create policy "Anyone can read active product variants"
on public.product_variants
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.products
    where products.id = product_variants.product_id
      and products.is_active = true
  )
);

drop policy if exists "Admins can manage product variants" on public.product_variants;
create policy "Admins can manage product variants"
on public.product_variants
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  placement text not null check (length(trim(placement)) > 0),
  file_url text not null check (length(trim(file_url)) > 0),
  printful_file_type text not null default 'default' check (length(trim(printful_file_type)) > 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_files_product_placement_position_key unique (product_id, placement, position)
);

create index if not exists product_files_product_position_idx
on public.product_files(product_id, position);

drop trigger if exists set_product_files_updated_at on public.product_files;
create trigger set_product_files_updated_at
before update on public.product_files
for each row
execute function public.set_updated_at();

alter table public.product_files enable row level security;

drop policy if exists "Anyone can read active product files" on public.product_files;
create policy "Anyone can read active product files"
on public.product_files
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_files.product_id
      and products.is_active = true
  )
);

drop policy if exists "Admins can manage product files" on public.product_files;
create policy "Admins can manage product files"
on public.product_files
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (
    status in (
      'pending',
      'paid',
      'submitting',
      'submitted',
      'in_production',
      'shipped',
      'delivered',
      'on_hold',
      'failed',
      'canceled',
      'refunded'
    )
  ),
  stripe_session_id text unique,
  printful_order_id text unique,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  printful_cost_cents integer not null default 0 check (printful_cost_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  customer_email text not null default '',
  shipping_name text not null default '',
  shipping_address1 text not null default '',
  shipping_address2 text not null default '',
  shipping_city text not null default '',
  shipping_state_code text not null default '',
  shipping_zip text not null default '',
  shipping_country_code text not null default 'US',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_created_idx
on public.orders(status, created_at desc);

create index if not exists orders_customer_email_created_idx
on public.orders(customer_email, created_at desc);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

alter table public.orders enable row level security;

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders"
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents > 0),
  color text not null check (length(trim(color)) > 0),
  size text not null check (length(trim(size)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx
on public.order_items(order_id);

create index if not exists order_items_product_variant_idx
on public.order_items(product_variant_id);

alter table public.order_items enable row level security;

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items"
on public.order_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.processed_webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('stripe', 'printful')),
  event_id text not null unique,
  processed_at timestamptz not null default now()
);

create index if not exists processed_webhook_events_source_processed_idx
on public.processed_webhook_events(source, processed_at desc);

alter table public.processed_webhook_events enable row level security;

drop policy if exists "Admins can read processed webhook events" on public.processed_webhook_events;
create policy "Admins can read processed webhook events"
on public.processed_webhook_events
for select
to authenticated
using (public.is_admin());
