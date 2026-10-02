-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce provider and product sellability requirements.
-- Created 2026-08-13.
--
-- Run manually in the Supabase SQL Editor.
-- Must be run AFTER docs/supabase-ecommerce-dispute-disclosure-hardening.sql
-- because this migration depends on product_size_guides and the nullable
-- products.provider_catalog_product_id model introduced there.
--
-- This migration is additive and does not modify donation/support_us flows.
-- Do not run via psql from Codex.

begin;

alter table public.ecommerce_providers
  add column if not exists provider_is_sellable boolean not null default false,
  add column if not exists provider_policy_version text,
  add column if not exists damaged_claim_window_days integer,
  add column if not exists photo_evidence_required boolean not null default true,
  add column if not exists photo_evidence_description text,
  add column if not exists lost_package_claim_window_days integer,
  add column if not exists lost_package_window_basis text,
  add column if not exists delivered_not_received_policy text,
  add column if not exists address_change_cutoff text,
  add column if not exists wrong_address_reship_policy text,
  add column if not exists accepts_size_color_remorse_returns boolean not null default false,
  add column if not exists production_time_description text,
  add column if not exists shipping_time_description text,
  add column if not exists support_contact text,
  add column if not exists claim_submission_instructions text,
  add column if not exists return_address text,
  add column if not exists policy_source_url text,
  add column if not exists policy_source_note text,
  add column if not exists policy_verified_at date;

alter table public.ecommerce_providers
  drop constraint if exists ecommerce_providers_damaged_claim_window_days_check,
  drop constraint if exists ecommerce_providers_lost_package_claim_window_days_check;

alter table public.ecommerce_providers
  add constraint ecommerce_providers_damaged_claim_window_days_check
    check (damaged_claim_window_days is null or damaged_claim_window_days > 0),
  add constraint ecommerce_providers_lost_package_claim_window_days_check
    check (lost_package_claim_window_days is null or lost_package_claim_window_days > 0);

comment on column public.ecommerce_providers.provider_is_sellable is
  'Computed by trigger. True only when provider policy requirements are complete enough to sell products truthfully.';
comment on column public.ecommerce_providers.provider_policy_version is
  'Version identifier for provider-specific support/returns/shipping rules shown before checkout and snapshotted onto orders.';
comment on column public.ecommerce_providers.policy_verified_at is
  'Date Katie or the technical team last verified the provider policy source.';

update public.ecommerce_providers
set
  provider_policy_version = 'printful-policy-v1-2026-08-09',
  damaged_claim_window_days = 30,
  photo_evidence_required = true,
  photo_evidence_description = 'Clear photos of the issue. For print placement or measurement claims, ask for a full garment photo, close-up photos, and the size tag. For wrong item claims, include the product and packing slip if available.',
  lost_package_claim_window_days = 30,
  lost_package_window_basis = 'the estimated delivery date',
  delivered_not_received_policy = 'When tracking says delivered, Printful generally does not cover a free replacement or refund. Ask the customer to check the delivery location, neighbors/front desk/housemates, and the local carrier, then decide case-by-case.',
  address_change_cutoff = 'Before the order is shipped. Once shipped, the address usually cannot be changed.',
  wrong_address_reship_policy = 'If the package is returned because the customer entered an incorrect or incomplete address, reshipping requires a new shipping charge.',
  accepts_size_color_remorse_returns = false,
  production_time_description = 'Usually 2–5 business days for apparel, depending on fulfillment load.',
  shipping_time_description = 'US transit time varies by carrier after fulfillment; customer receives tracking when shipped.',
  support_contact = 'Printful Dashboard / Help Center support request',
  claim_submission_instructions = 'Open a problem report from the Printful order or contact Printful support with the order id, issue description, and photo evidence.',
  return_address = 'Provider-managed return address when applicable. Customers should contact Katie first and should not mail returns directly unless instructed.',
  policy_source_url = 'https://www.printful.com/policies/returns',
  policy_source_note = 'Printful return policy, lost package guidance, and order-change guidance verified for POD fulfillment. Nothing here is legal advice.',
  policy_verified_at = date '2026-08-09',
  provider_is_sellable = true,
  is_active = true,
  updated_at = now()
where code = 'printful';

update public.ecommerce_providers
set
  provider_is_sellable = false,
  is_active = false,
  updated_at = now()
where code <> 'printful'
  and (
    length(trim(coalesce(provider_policy_version, ''))) = 0
    or damaged_claim_window_days is null
    or length(trim(coalesce(photo_evidence_description, ''))) = 0
    or lost_package_claim_window_days is null
    or length(trim(coalesce(lost_package_window_basis, ''))) = 0
    or length(trim(coalesce(delivered_not_received_policy, ''))) = 0
    or length(trim(coalesce(address_change_cutoff, ''))) = 0
    or length(trim(coalesce(wrong_address_reship_policy, ''))) = 0
    or length(trim(coalesce(production_time_description, ''))) = 0
    or length(trim(coalesce(shipping_time_description, ''))) = 0
    or length(trim(coalesce(support_contact, ''))) = 0
    or length(trim(coalesce(claim_submission_instructions, ''))) = 0
    or length(trim(coalesce(return_address, ''))) = 0
    or length(trim(coalesce(policy_source_note, ''))) = 0
    or policy_verified_at is null
  );

create or replace function public.ecommerce_provider_missing_policy_fields(
  provider_row public.ecommerce_providers
)
returns text[]
language plpgsql
stable
set search_path = public
as $$
declare
  missing text[] := '{}'::text[];
begin
  if length(trim(coalesce(provider_row.provider_policy_version, ''))) = 0 then
    missing := array_append(missing, 'provider_policy_version');
  end if;
  if provider_row.damaged_claim_window_days is null or provider_row.damaged_claim_window_days <= 0 then
    missing := array_append(missing, 'damaged_claim_window_days');
  end if;
  if length(trim(coalesce(provider_row.photo_evidence_description, ''))) = 0 then
    missing := array_append(missing, 'photo_evidence_description');
  end if;
  if provider_row.lost_package_claim_window_days is null or provider_row.lost_package_claim_window_days <= 0 then
    missing := array_append(missing, 'lost_package_claim_window_days');
  end if;
  if length(trim(coalesce(provider_row.lost_package_window_basis, ''))) = 0 then
    missing := array_append(missing, 'lost_package_window_basis');
  end if;
  if length(trim(coalesce(provider_row.delivered_not_received_policy, ''))) = 0 then
    missing := array_append(missing, 'delivered_not_received_policy');
  end if;
  if length(trim(coalesce(provider_row.address_change_cutoff, ''))) = 0 then
    missing := array_append(missing, 'address_change_cutoff');
  end if;
  if length(trim(coalesce(provider_row.wrong_address_reship_policy, ''))) = 0 then
    missing := array_append(missing, 'wrong_address_reship_policy');
  end if;
  if length(trim(coalesce(provider_row.production_time_description, ''))) = 0 then
    missing := array_append(missing, 'production_time_description');
  end if;
  if length(trim(coalesce(provider_row.shipping_time_description, ''))) = 0 then
    missing := array_append(missing, 'shipping_time_description');
  end if;
  if length(trim(coalesce(provider_row.support_contact, ''))) = 0 then
    missing := array_append(missing, 'support_contact');
  end if;
  if length(trim(coalesce(provider_row.claim_submission_instructions, ''))) = 0 then
    missing := array_append(missing, 'claim_submission_instructions');
  end if;
  if length(trim(coalesce(provider_row.return_address, ''))) = 0 then
    missing := array_append(missing, 'return_address');
  end if;
  if length(trim(coalesce(provider_row.policy_source_note, ''))) = 0 then
    missing := array_append(missing, 'policy_source_note');
  end if;
  if provider_row.policy_verified_at is null then
    missing := array_append(missing, 'policy_verified_at');
  end if;

  return missing;
end;
$$;

create or replace function public.set_ecommerce_provider_sellability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  missing text[];
begin
  missing := public.ecommerce_provider_missing_policy_fields(new);
  new.provider_is_sellable := cardinality(missing) = 0;

  if tg_op = 'INSERT' and new.fulfillment_mode = 'manual' and not new.provider_is_sellable then
    raise exception 'Manual provider policy requirements incomplete: %', array_to_string(missing, ', ');
  end if;

  if new.is_active and not new.provider_is_sellable then
    raise exception 'Provider policy requirements incomplete: %', array_to_string(missing, ', ');
  end if;

  return new;
end;
$$;

drop trigger if exists ecommerce_providers_set_sellability on public.ecommerce_providers;
create trigger ecommerce_providers_set_sellability
before insert or update on public.ecommerce_providers
for each row
execute function public.set_ecommerce_provider_sellability();

drop policy if exists "Public can read sellable ecommerce providers" on public.ecommerce_providers;
create policy "Public can read sellable ecommerce providers"
on public.ecommerce_providers
for select
to anon, authenticated
using (is_active = true and provider_is_sellable = true);

create or replace function public.product_size_guide_covers_active_sizes(
  selected_product_id uuid,
  selected_provider text,
  selected_provider_catalog_product_id integer
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  active_size_count integer;
  missing_size_count integer;
  guide_record record;
begin
  select count(distinct pv.size)
  into active_size_count
  from public.product_variants pv
  where pv.product_id = selected_product_id
    and pv.is_active = true
    and pv.available_us = true;

  if active_size_count = 0 then
    return false;
  end if;

  for guide_record in
    select
      psg.version,
      psg.no_published_measurements,
      guide_table.table_json
    from public.product_size_guides psg
    cross join lateral jsonb_array_elements(psg.guide->'tables') as guide_table(table_json)
    where psg.product_id = selected_product_id
      and psg.is_active = true
      and psg.no_published_measurements = false
      and guide_table.table_json->>'type' = psg.measurement_type
      and guide_table.table_json->>'unit' = psg.unit
    order by psg.source_checked_at desc
  loop
    select count(*)
    into missing_size_count
    from (
      select distinct pv.size
      from public.product_variants pv
      where pv.product_id = selected_product_id
        and pv.is_active = true
        and pv.available_us = true
    ) required_sizes
    where not exists (
      select 1
      from jsonb_array_elements(guide_record.table_json->'measurements') measurement(measurement_json)
      cross join lateral jsonb_array_elements(measurement.measurement_json->'values') value(value_json)
      where value.value_json->>'size' = required_sizes.size
    );

    if missing_size_count = 0 then
      return true;
    end if;
  end loop;

  if selected_provider_catalog_product_id is not null then
    for guide_record in
      select guide_table.table_json
      from public.ecommerce_size_guides esg
      cross join lateral jsonb_array_elements(esg.guide->'tables') as guide_table(table_json)
      where esg.provider = selected_provider
        and esg.provider_catalog_product_id = selected_provider_catalog_product_id
        and esg.is_active = true
        and guide_table.table_json->>'type' = esg.measurement_type
        and guide_table.table_json->>'unit' = esg.unit
      order by esg.source_checked_at desc
    loop
      select count(*)
      into missing_size_count
      from (
        select distinct pv.size
        from public.product_variants pv
        where pv.product_id = selected_product_id
          and pv.is_active = true
          and pv.available_us = true
      ) required_sizes
      where not exists (
        select 1
        from jsonb_array_elements(guide_record.table_json->'measurements') measurement(measurement_json)
        cross join lateral jsonb_array_elements(measurement.measurement_json->'values') value(value_json)
        where value.value_json->>'size' = required_sizes.size
      );

      if missing_size_count = 0 then
        return true;
      end if;
    end loop;
  end if;

  return false;
end;
$$;

create or replace function public.enforce_product_sellability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  provider_row public.ecommerce_providers%rowtype;
begin
  if new.is_active = false then
    return new;
  end if;

  select *
  into provider_row
  from public.ecommerce_providers
  where code = new.provider;

  if not found then
    raise exception 'Product cannot be active because provider % does not exist.', new.provider;
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

  return new;
end;
$$;

update public.products p
set
  is_active = false,
  updated_at = now()
from public.ecommerce_providers ep
where p.is_active = true
  and ep.code = p.provider
  and not public.product_size_guide_covers_active_sizes(
    p.id,
    p.provider,
    p.provider_catalog_product_id
  );

drop trigger if exists products_enforce_sellability on public.products;
create constraint trigger products_enforce_sellability
after insert or update of is_active, provider, provider_catalog_product_id on public.products
deferrable initially deferred
for each row
execute function public.enforce_product_sellability();

update public.products p
set
  is_active = false,
  updated_at = now()
where is_active = true
  and exists (
    select 1
    from public.ecommerce_providers ep
    where ep.code = p.provider
      and (ep.is_active = false or ep.provider_is_sellable = false)
  );

update public.products p
set
  provider_catalog_product_id = null,
  updated_at = now()
from public.ecommerce_providers ep
where ep.code = p.provider
  and ep.fulfillment_mode = 'manual'
  and p.provider_catalog_product_id is not null;

alter table public.orders
  add column if not exists provider_policy_snapshot jsonb;

comment on column public.orders.provider_policy_snapshot is
  'Append-only evidence: provider-specific claim/shipping/return terms shown for each provider in this order.';

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

  if old.provider_policy_snapshot is not null
    and new.provider_policy_snapshot is distinct from old.provider_policy_snapshot then
    raise exception 'provider_policy_snapshot is append-only';
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

commit;
