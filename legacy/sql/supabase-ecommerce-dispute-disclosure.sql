-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce dispute disclosure evidence, return-policy versioning, and size guide snapshot.
-- Created 2026-08-09.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- This migration is additive. It does not modify support_us/donation Stripe flows.
--
-- The seeded Gildan 64000 size guide was fetched from Printful API v1:
-- GET https://api.printful.com/products/12/sizes and GET https://api.printful.com/products/12/sizes?unit=cm
-- Source checked: 2026-08-09.

begin;

create table if not exists public.ecommerce_size_guides (
  id uuid primary key default gen_random_uuid(),
  provider text not null references public.ecommerce_providers(code) on update cascade on delete restrict,
  provider_catalog_product_id integer not null check (provider_catalog_product_id > 0),
  version text not null,
  unit text not null,
  measurement_type text not null,
  title text not null,
  tolerance text not null default '',
  source_url text not null,
  source_checked_at timestamptz not null,
  guide jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_catalog_product_id, version)
);

create index if not exists ecommerce_size_guides_active_idx
  on public.ecommerce_size_guides (provider, provider_catalog_product_id, is_active, source_checked_at desc);

drop trigger if exists ecommerce_size_guides_set_updated_at on public.ecommerce_size_guides;
create trigger ecommerce_size_guides_set_updated_at
  before update on public.ecommerce_size_guides
  for each row
  execute function public.set_updated_at();

alter table public.ecommerce_size_guides enable row level security;

drop policy if exists "Public can read active ecommerce size guides" on public.ecommerce_size_guides;
create policy "Public can read active ecommerce size guides"
  on public.ecommerce_size_guides
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can manage ecommerce size guides" on public.ecommerce_size_guides;
create policy "Admins can manage ecommerce size guides"
  on public.ecommerce_size_guides
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.ecommerce_size_guides (
  provider,
  provider_catalog_product_id,
  version,
  unit,
  measurement_type,
  title,
  tolerance,
  source_url,
  source_checked_at,
  guide,
  is_active
)
values (
  'printful',
  12,
  'printful-12-gildan-64000-2026-08-09-fb48b691',
  'inches',
  'product_measure',
  'Gildan 64000 Softstyle garment measurements',
  'Product measurements may vary by up to 2" (5 cm).',
  'https://api.printful.com/products/12/sizes',
  '2026-08-09T00:00:00Z',
  $size_guide$
  {
    "tables": [
      {
        "type": "measure_yourself",
        "unit": "inches",
        "description": "Measurements are provided by suppliers. Product measurements may vary by up to 2\" (5 cm).",
        "measurements": [
          {"type_label": "Length", "values": [{"size": "S", "value": "28"}, {"size": "M", "value": "29"}, {"size": "L", "value": "30"}, {"size": "XL", "value": "31"}, {"size": "2XL", "value": "32"}, {"size": "3XL", "value": "33"}]},
          {"type_label": "Chest", "values": [{"size": "S", "min_value": "34", "max_value": "37"}, {"size": "M", "min_value": "38", "max_value": "41"}, {"size": "L", "min_value": "42", "max_value": "45"}, {"size": "XL", "min_value": "46", "max_value": "49"}, {"size": "2XL", "min_value": "50", "max_value": "53"}, {"size": "3XL", "min_value": "54", "max_value": "57"}]},
          {"type_label": "Sleeve length", "values": [{"size": "S", "value": "16.75"}, {"size": "M", "value": "17.875"}, {"size": "L", "value": "19.125"}, {"size": "XL", "value": "20.375"}, {"size": "2XL", "value": "21.625"}, {"size": "3XL", "value": "22.75"}]}
        ]
      },
      {
        "type": "product_measure",
        "unit": "inches",
        "description": "Measurements are provided by suppliers. Product measurements may vary by up to 2\" (5 cm). Pro tip: measure one of your products at home and compare with this guide.",
        "measurements": [
          {"type_label": "Length", "values": [{"size": "S", "value": "28"}, {"size": "M", "value": "29"}, {"size": "L", "value": "30"}, {"size": "XL", "value": "31"}, {"size": "2XL", "value": "32"}, {"size": "3XL", "value": "33"}]},
          {"type_label": "Width", "values": [{"size": "S", "value": "18"}, {"size": "M", "value": "20"}, {"size": "L", "value": "22"}, {"size": "XL", "value": "24"}, {"size": "2XL", "value": "26"}, {"size": "3XL", "value": "28"}]},
          {"type_label": "Sleeve length", "values": [{"size": "S", "value": "16.75"}, {"size": "M", "value": "17.875"}, {"size": "L", "value": "19.125"}, {"size": "XL", "value": "20.375"}, {"size": "2XL", "value": "21.625"}, {"size": "3XL", "value": "22.75"}]}
        ]
      },
      {
        "type": "product_measure",
        "unit": "cm",
        "description": "Measurements are provided by suppliers. Product measurements may vary by up to 2\" (5 cm). Pro tip: measure one of your products at home and compare with this guide.",
        "measurements": [
          {"type_label": "Length", "values": [{"size": "S", "value": "71.12"}, {"size": "M", "value": "73.66"}, {"size": "L", "value": "76.20"}, {"size": "XL", "value": "78.74"}, {"size": "2XL", "value": "81.28"}, {"size": "3XL", "value": "83.82"}]},
          {"type_label": "Width", "values": [{"size": "S", "value": "45.72"}, {"size": "M", "value": "50.80"}, {"size": "L", "value": "55.88"}, {"size": "XL", "value": "60.96"}, {"size": "2XL", "value": "66.04"}, {"size": "3XL", "value": "71.12"}]},
          {"type_label": "Sleeve length", "values": [{"size": "S", "value": "42.55"}, {"size": "M", "value": "45.40"}, {"size": "L", "value": "48.58"}, {"size": "XL", "value": "51.75"}, {"size": "2XL", "value": "54.93"}, {"size": "3XL", "value": "57.79"}]}
        ]
      }
    ]
  }
  $size_guide$::jsonb,
  true
)
on conflict (provider, provider_catalog_product_id, version)
do update set
  unit = excluded.unit,
  measurement_type = excluded.measurement_type,
  title = excluded.title,
  tolerance = excluded.tolerance,
  source_url = excluded.source_url,
  source_checked_at = excluded.source_checked_at,
  guide = excluded.guide,
  is_active = excluded.is_active,
  updated_at = now();

alter table public.orders
  add column if not exists return_policy_version text,
  add column if not exists return_policy_url text,
  add column if not exists size_guide_version text,
  add column if not exists size_guide_snapshot jsonb,
  add column if not exists terms_accepted boolean not null default false,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists customer_purchase_ip inet,
  add column if not exists customer_purchase_user_agent text;

comment on column public.orders.return_policy_version is
  'Append-only evidence: public return policy version shown/accepted for this order.';
comment on column public.orders.size_guide_snapshot is
  'Append-only evidence: size guide measurements for purchased sizes at checkout time.';
comment on column public.orders.terms_accepted is
  'Append-only evidence: Stripe Checkout terms_of_service consent result.';
comment on column public.orders.customer_purchase_ip is
  'PII retained only for Stripe dispute evidence customer_purchase_ip.';
comment on column public.orders.customer_purchase_user_agent is
  'PII retained only for Stripe dispute context and checkout audit.';

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

  return new;
end;
$$;

drop trigger if exists orders_prevent_dispute_evidence_mutation on public.orders;
create trigger orders_prevent_dispute_evidence_mutation
  before update on public.orders
  for each row
  execute function public.prevent_order_dispute_evidence_mutation();

commit;
