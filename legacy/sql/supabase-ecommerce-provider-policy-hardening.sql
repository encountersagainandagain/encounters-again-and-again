-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce provider policy hardening: public view, auto-versioning, text limits, and variant sellability.
-- Created 2026-08-13.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- Must be run AFTER docs/supabase-ecommerce-provider-product-sellability.sql.
-- This migration supersedes the public provider SELECT policy and the provider/product
-- sellability functions from docs/supabase-ecommerce-provider-product-sellability.sql.
--
-- Do not run via psql from Codex.
--
-- IMPORTANT ABOUT ecommerce_public_provider_terms:
-- This migration intentionally exposes customer-facing provider terms through
-- a normal owner-privileged view. Supabase may warn that the view is not
-- security_invoker. Do not "fix" that warning by setting security_invoker = on:
-- the underlying ecommerce_providers table is admin-only, so an invoker-security
-- view would return zero rows to anon users. The shop would then treat every
-- provider as unavailable without a clear UI error. The view itself projects only
-- public customer-facing fields; internal support contacts, claim instructions,
-- return addresses, source notes, and source URLs stay on ecommerce_providers.

begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.ecommerce_providers
  add column if not exists provider_policy_hash text;

comment on column public.ecommerce_providers.provider_policy_hash is
  'SHA-256 hash of the normalized customer-facing provider policy fields. Used to derive provider_policy_version automatically.';

alter table public.ecommerce_providers
  drop constraint if exists ecommerce_providers_photo_evidence_description_len,
  drop constraint if exists ecommerce_providers_lost_package_window_basis_len,
  drop constraint if exists ecommerce_providers_delivered_not_received_policy_len,
  drop constraint if exists ecommerce_providers_address_change_cutoff_len,
  drop constraint if exists ecommerce_providers_wrong_address_reship_policy_len,
  drop constraint if exists ecommerce_providers_production_time_description_len,
  drop constraint if exists ecommerce_providers_shipping_time_description_len,
  drop constraint if exists ecommerce_providers_support_contact_len,
  drop constraint if exists ecommerce_providers_claim_submission_instructions_len,
  drop constraint if exists ecommerce_providers_return_address_len,
  drop constraint if exists ecommerce_providers_policy_source_url_len,
  drop constraint if exists ecommerce_providers_policy_source_note_len,
  drop constraint if exists ecommerce_providers_contact_email_len,
  drop constraint if exists ecommerce_providers_contact_url_len,
  drop constraint if exists ecommerce_providers_contact_notes_len;

alter table public.ecommerce_providers
  add constraint ecommerce_providers_photo_evidence_description_len
    check (photo_evidence_description is null or length(photo_evidence_description) <= 280),
  add constraint ecommerce_providers_lost_package_window_basis_len
    check (lost_package_window_basis is null or length(lost_package_window_basis) <= 120),
  add constraint ecommerce_providers_delivered_not_received_policy_len
    check (delivered_not_received_policy is null or length(delivered_not_received_policy) <= 280),
  add constraint ecommerce_providers_address_change_cutoff_len
    check (address_change_cutoff is null or length(address_change_cutoff) <= 180),
  add constraint ecommerce_providers_wrong_address_reship_policy_len
    check (wrong_address_reship_policy is null or length(wrong_address_reship_policy) <= 220),
  add constraint ecommerce_providers_production_time_description_len
    check (production_time_description is null or length(production_time_description) <= 160),
  add constraint ecommerce_providers_shipping_time_description_len
    check (shipping_time_description is null or length(shipping_time_description) <= 160),
  add constraint ecommerce_providers_support_contact_len
    check (support_contact is null or length(support_contact) <= 240),
  add constraint ecommerce_providers_claim_submission_instructions_len
    check (claim_submission_instructions is null or length(claim_submission_instructions) <= 500),
  add constraint ecommerce_providers_return_address_len
    check (return_address is null or length(return_address) <= 300),
  add constraint ecommerce_providers_policy_source_url_len
    check (policy_source_url is null or length(policy_source_url) <= 500),
  add constraint ecommerce_providers_policy_source_note_len
    check (policy_source_note is null or length(policy_source_note) <= 500),
  add constraint ecommerce_providers_contact_email_len
    check (contact_email is null or length(contact_email) <= 240),
  add constraint ecommerce_providers_contact_url_len
    check (contact_url is null or length(contact_url) <= 500),
  add constraint ecommerce_providers_contact_notes_len
    check (contact_notes is null or length(contact_notes) <= 1000);

create or replace function public.ecommerce_provider_policy_hash(
  provider_row public.ecommerce_providers
)
returns text
language sql
stable
set search_path = public
as $$
  select encode(
    extensions.digest(
      jsonb_build_object(
        'damaged_claim_window_days', provider_row.damaged_claim_window_days,
        'photo_evidence_required', provider_row.photo_evidence_required,
        'photo_evidence_description', trim(coalesce(provider_row.photo_evidence_description, '')),
        'lost_package_claim_window_days', provider_row.lost_package_claim_window_days,
        'lost_package_window_basis', trim(coalesce(provider_row.lost_package_window_basis, '')),
        'delivered_not_received_policy', trim(coalesce(provider_row.delivered_not_received_policy, '')),
        'address_change_cutoff', trim(coalesce(provider_row.address_change_cutoff, '')),
        'wrong_address_reship_policy', trim(coalesce(provider_row.wrong_address_reship_policy, '')),
        'accepts_size_color_remorse_returns', provider_row.accepts_size_color_remorse_returns,
        'production_time_description', trim(coalesce(provider_row.production_time_description, '')),
        'shipping_time_description', trim(coalesce(provider_row.shipping_time_description, '')),
        'policy_verified_at', provider_row.policy_verified_at
      )::text,
      'sha256'
    ),
    'hex'
  );
$$;

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
  policy_hash text;
  verified_date date;
begin
  missing := public.ecommerce_provider_missing_policy_fields(new);
  new.provider_is_sellable := cardinality(missing) = 0;

  if new.provider_is_sellable then
    policy_hash := public.ecommerce_provider_policy_hash(new);
    verified_date := coalesce(new.policy_verified_at, current_date);
    new.provider_policy_hash := policy_hash;
    new.provider_policy_version := concat(
      new.code,
      '-policy-',
      to_char(verified_date, 'YYYY-MM-DD'),
      '-',
      left(policy_hash, 12)
    );
  else
    new.provider_policy_hash := null;
    new.provider_policy_version := null;
  end if;

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

update public.ecommerce_providers
set updated_at = now();

drop policy if exists "Public can read sellable ecommerce providers" on public.ecommerce_providers;

create or replace view public.ecommerce_public_provider_terms as
select
  code,
  name,
  is_active,
  provider_is_sellable,
  provider_policy_version,
  provider_policy_hash,
  damaged_claim_window_days,
  photo_evidence_required,
  photo_evidence_description,
  lost_package_claim_window_days,
  lost_package_window_basis,
  delivered_not_received_policy,
  address_change_cutoff,
  wrong_address_reship_policy,
  accepts_size_color_remorse_returns,
  production_time_description,
  shipping_time_description,
  policy_verified_at
from public.ecommerce_providers
where is_active = true
  and provider_is_sellable = true;

comment on view public.ecommerce_public_provider_terms is
  'Public customer-facing provider policy fields only. Internal provider contacts, claim instructions, source notes, and return addresses stay on ecommerce_providers for admins.';

grant select on public.ecommerce_public_provider_terms to anon, authenticated;

create or replace function public.product_size_guide_missing_active_sizes(
  selected_product_id uuid,
  selected_provider text,
  selected_provider_catalog_product_id integer
)
returns text[]
language plpgsql
stable
set search_path = public
as $$
declare
  required_size text;
  guide_record record;
  has_measurement boolean;
  missing text[] := '{}'::text[];
begin
  for required_size in
    select distinct pv.size
    from public.product_variants pv
    where pv.product_id = selected_product_id
      and pv.is_active = true
      and pv.available_us = true
    order by pv.size
  loop
    has_measurement := false;

    for guide_record in
      select guide_table.table_json
      from public.product_size_guides psg
      cross join lateral jsonb_array_elements(psg.guide->'tables') as guide_table(table_json)
      where psg.product_id = selected_product_id
        and psg.is_active = true
        and psg.no_published_measurements = false
        and guide_table.table_json->>'type' = psg.measurement_type
        and guide_table.table_json->>'unit' = psg.unit
      order by psg.source_checked_at desc
    loop
      if exists (
        select 1
        from jsonb_array_elements(guide_record.table_json->'measurements') measurement(measurement_json)
        cross join lateral jsonb_array_elements(measurement.measurement_json->'values') value(value_json)
        where value.value_json->>'size' = required_size
      ) then
        has_measurement := true;
        exit;
      end if;
    end loop;

    if not has_measurement and selected_provider_catalog_product_id is not null then
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
        if exists (
          select 1
          from jsonb_array_elements(guide_record.table_json->'measurements') measurement(measurement_json)
          cross join lateral jsonb_array_elements(measurement.measurement_json->'values') value(value_json)
          where value.value_json->>'size' = required_size
        ) then
          has_measurement := true;
          exit;
        end if;
      end loop;
    end if;

    if not has_measurement then
      missing := array_append(missing, required_size);
    end if;
  end loop;

  return missing;
end;
$$;

create or replace function public.product_size_guide_covers_active_sizes(
  selected_product_id uuid,
  selected_provider text,
  selected_provider_catalog_product_id integer
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.product_variants pv
    where pv.product_id = selected_product_id
      and pv.is_active = true
      and pv.available_us = true
  )
  and cardinality(
    public.product_size_guide_missing_active_sizes(
      selected_product_id,
      selected_provider,
      selected_provider_catalog_product_id
    )
  ) = 0;
$$;

create or replace function public.enforce_product_sellability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  provider_row public.ecommerce_providers%rowtype;
  missing_sizes text[];
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

  missing_sizes := public.product_size_guide_missing_active_sizes(
    new.id,
    new.provider,
    new.provider_catalog_product_id
  );

  if cardinality(missing_sizes) > 0 then
    raise exception 'Product cannot be active because its size guide is missing active size(s): %.', array_to_string(missing_sizes, ', ');
  end if;

  return new;
end;
$$;

drop trigger if exists products_enforce_sellability on public.products;
create constraint trigger products_enforce_sellability
after insert or update of is_active, provider, provider_catalog_product_id on public.products
deferrable initially deferred
for each row
execute function public.enforce_product_sellability();

create or replace function public.enforce_product_variant_sellability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  product_row public.products%rowtype;
  selected_product_id uuid;
  missing_sizes text[];
begin
  selected_product_id := coalesce(new.product_id, old.product_id);

  select *
  into product_row
  from public.products
  where id = selected_product_id;

  if not found or product_row.is_active = false then
    return coalesce(new, old);
  end if;

  missing_sizes := public.product_size_guide_missing_active_sizes(
    product_row.id,
    product_row.provider,
    product_row.provider_catalog_product_id
  );

  if cardinality(missing_sizes) > 0 then
    raise exception 'Active product % has active size(s) without size guide measurements: %.', product_row.name, array_to_string(missing_sizes, ', ');
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists product_variants_enforce_sellability on public.product_variants;
create constraint trigger product_variants_enforce_sellability
after insert or update of size, is_active, available_us or delete on public.product_variants
deferrable initially deferred
for each row
execute function public.enforce_product_variant_sellability();

commit;
