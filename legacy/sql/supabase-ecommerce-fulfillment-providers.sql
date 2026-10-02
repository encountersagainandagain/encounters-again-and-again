-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: ecommerce fulfillment providers
-- Paste this in Supabase SQL Editor and run it once.
--
-- Scope:
-- - Adds provider table with API/manual fulfillment mode and per-provider shipping.
-- - Seeds Printful and Printify.
-- - Migrates products.provider and orders.provider from closed check constraints to
--   foreign keys against ecommerce_providers(code), preserving the column name.
-- - Adds the manual order status needed before checkout/manual fulfillment.
--
-- Important:
-- - Do not run via psql/direct DB connection.
-- - The project owner runs this manually in Supabase SQL Editor.

begin;

create table if not exists public.ecommerce_providers (
  code text primary key check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  fulfillment_mode text not null check (fulfillment_mode in ('api', 'manual')),
  is_active boolean not null default true,
  shipping_first_item_cents integer not null default 0 check (shipping_first_item_cents >= 0),
  shipping_additional_item_cents integer not null default 0 check (shipping_additional_item_cents >= 0),
  contact_notes text not null default '',
  contact_email text not null default '',
  contact_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_ecommerce_providers_updated_at on public.ecommerce_providers;
create trigger set_ecommerce_providers_updated_at
before update on public.ecommerce_providers
for each row
execute function public.set_updated_at();

alter table public.ecommerce_providers enable row level security;

drop policy if exists "Admins can manage ecommerce providers" on public.ecommerce_providers;

drop policy if exists "Admins can read ecommerce providers" on public.ecommerce_providers;
create policy "Admins can read ecommerce providers"
on public.ecommerce_providers
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create manual ecommerce providers" on public.ecommerce_providers;
create policy "Admins can create manual ecommerce providers"
on public.ecommerce_providers
for insert
to authenticated
with check (public.is_admin() and fulfillment_mode = 'manual');

drop policy if exists "Admins can update manual ecommerce providers" on public.ecommerce_providers;
create policy "Admins can update manual ecommerce providers"
on public.ecommerce_providers
for update
to authenticated
using (public.is_admin() and fulfillment_mode = 'manual')
with check (public.is_admin() and fulfillment_mode = 'manual');

drop policy if exists "Admins can delete manual ecommerce providers" on public.ecommerce_providers;
create policy "Admins can delete manual ecommerce providers"
on public.ecommerce_providers
for delete
to authenticated
using (public.is_admin() and fulfillment_mode = 'manual');

insert into public.ecommerce_providers (
  code,
  name,
  fulfillment_mode,
  is_active,
  shipping_first_item_cents,
  shipping_additional_item_cents,
  contact_notes
)
values
  (
    'printful',
    'Printful',
    'api',
    true,
    475,
    220,
    'Seeded API provider. Shipping verified for US shirts on 2026-07-29.'
  ),
  (
    'printify',
    'Printify',
    'api',
    false,
    0,
    0,
    'Seeded API provider. Inactive until Printify integration is implemented.'
  )
on conflict (code) do update
set
  name = excluded.name,
  fulfillment_mode = excluded.fulfillment_mode,
  shipping_first_item_cents = excluded.shipping_first_item_cents,
  shipping_additional_item_cents = excluded.shipping_additional_item_cents,
  contact_notes = case
    when public.ecommerce_providers.contact_notes = ''
      then excluded.contact_notes
    else public.ecommerce_providers.contact_notes
  end;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'products_provider_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products drop constraint products_provider_check;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'orders_provider_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders drop constraint orders_provider_check;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_provider_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
    add constraint products_provider_fkey
    foreign key (provider)
    references public.ecommerce_providers(code)
    on update cascade
    on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_provider_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
    add constraint orders_provider_fkey
    foreign key (provider)
    references public.ecommerce_providers(code)
    on update cascade
    on delete restrict;
  end if;
end $$;

do $$
declare
  status_check_name text;
begin
  select con.conname
  into status_check_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'orders'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%pending%'
    and pg_get_constraintdef(con.oid) like '%submitted%'
    and pg_get_constraintdef(con.oid) like '%refunded%'
  limit 1;

  if status_check_name is not null then
    execute format('alter table public.orders drop constraint %I', status_check_name);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
    add constraint orders_status_check
    check (
      status in (
        'pending',
        'paid',
        'awaiting_manual_fulfillment',
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
    );
  end if;
end $$;

comment on column public.orders.status is
  'awaiting_manual_fulfillment means payment is captured and Katie must place/advance a manual provider order. API orders use submitting/submitted for automatic provider submission.';

commit;
