-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce manual-provider production hardening.
-- Created 2026-08-14.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- Must be run AFTER docs/supabase-ecommerce-pending-order-sweep-hardening.sql.
--
-- Scope:
-- - Locks API fulfillment providers out of sellable state until deliberately enabled.
-- - Keeps existing Printful policy/config data intact.
-- - Prevents products from being created/activated for locked API providers.
-- - Adds idempotent operational-incident indexes for permanent alerts/reminders.
--
-- To re-enable Printful later, after its integration is production-tested, run a deliberate
-- SQL migration that sets ecommerce_providers.api_fulfillment_enabled = true for code='printful'
-- and then revalidates products. Do not toggle this casually from the admin UI.

begin;

alter table public.ecommerce_providers
  add column if not exists api_fulfillment_enabled boolean not null default false;

comment on column public.ecommerce_providers.api_fulfillment_enabled is
  'Production safety switch for API fulfillment. API providers cannot be sellable or have active/created products unless this is deliberately enabled by SQL.';

update public.ecommerce_providers
set api_fulfillment_enabled = false
where fulfillment_mode = 'api'
  and api_fulfillment_enabled is distinct from false;

create or replace function public.set_ecommerce_provider_sellability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  missing text[];
  policy_hash text;
  verified_date date;
  policy_complete boolean;
begin
  missing := public.ecommerce_provider_missing_policy_fields(new);
  policy_complete := cardinality(missing) = 0;
  new.provider_is_sellable := policy_complete;

  if new.fulfillment_mode = 'api' and new.api_fulfillment_enabled = false then
    new.provider_is_sellable := false;
  end if;

  if policy_complete then
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

  if new.is_active and not new.provider_is_sellable and new.fulfillment_mode = 'manual' then
    raise exception 'Provider policy requirements incomplete: %', array_to_string(missing, ', ');
  end if;

  return new;
end;
$$;

update public.ecommerce_providers
set updated_at = now();

create or replace function public.enforce_product_sellability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  provider_row public.ecommerce_providers%rowtype;
begin
  -- Turning a product off must always be allowed. This lets the migration and the admin
  -- make the system more restrictive even if the provider is locked or inconsistent.
  -- Inserts still validate below so locked API providers cannot be used for new products.
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

  return new;
end;
$$;

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
from public.ecommerce_providers ep
where ep.code = p.provider
  and ep.fulfillment_mode = 'api'
  and ep.api_fulfillment_enabled = false
  and p.is_active = true;

alter table public.order_operational_incidents
  drop constraint if exists order_operational_incidents_incident_type_check;

alter table public.order_operational_incidents
  add constraint order_operational_incidents_incident_type_check
  check (
    incident_type in (
      'manual_refund',
      'manual_provider_retry',
      'manual_status_change',
      'manual_fulfillment_reminder',
      'missing_terms_consent',
      'pending_order_missing_stripe_session',
      'paid_webhook_order_update_mismatch'
    )
  );

create unique index if not exists order_operational_incidents_once_idx
  on public.order_operational_incidents (order_id, incident_type)
  where incident_type in (
    'pending_order_missing_stripe_session',
    'paid_webhook_order_update_mismatch'
  );

create unique index if not exists order_operational_incidents_reminder_key_idx
  on public.order_operational_incidents (order_id, incident_type, ((metadata->>'reminder_key')))
  where incident_type = 'manual_fulfillment_reminder'
    and metadata ? 'reminder_key';

notify pgrst, 'reload schema';

commit;
