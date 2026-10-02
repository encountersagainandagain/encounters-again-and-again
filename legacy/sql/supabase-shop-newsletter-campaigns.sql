-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: shop newsletter acquisition campaigns and one-use discounts.
-- Created 2026-08-26.
--
-- Run manually in the Supabase SQL Editor. Do not run through psql or the app.
-- Apply after all ecommerce/order migrations and docs/supabase-newsletter.sql.
-- This migration is additive and safe to run once on the current production schema.

begin;

create table public.shop_marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  internal_code text not null unique check (
    internal_code ~ '^[A-Z0-9][A-Z0-9-]{2,39}$'
  ),
  name text not null check (length(trim(name)) between 3 and 100),
  discount_percent integer not null check (discount_percent between 1 and 50),
  code_valid_days integer not null default 30 check (code_valid_days between 1 and 365),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  popup_enabled boolean not null default true,
  banner_enabled boolean not null default false,
  popup_title text not null default 'Get 10% off your first order' check (
    length(trim(popup_title)) between 3 and 100
  ),
  popup_message text not null default 'Join Katie''s newsletter and I''ll email your personal code.' check (
    length(trim(popup_message)) between 3 and 240
  ),
  banner_text text not null default 'Get 10% off your first shop order when you join the newsletter' check (
    length(trim(banner_text)) between 3 and 160
  ),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- Exactly one campaign can distribute new codes at a time. Past campaigns remain
-- queryable for metrics and their already-issued codes retain their own expiry.
create unique index shop_marketing_campaigns_one_active_idx
  on public.shop_marketing_campaigns ((is_active))
  where is_active = true;

create index shop_marketing_campaigns_dates_idx
  on public.shop_marketing_campaigns (starts_at, ends_at);

drop trigger if exists set_shop_marketing_campaigns_updated_at
  on public.shop_marketing_campaigns;
create trigger set_shop_marketing_campaigns_updated_at
  before update on public.shop_marketing_campaigns
  for each row execute function public.set_updated_at();

alter table public.shop_marketing_campaigns enable row level security;

create policy "Admins can manage shop marketing campaigns"
  on public.shop_marketing_campaigns
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.shop_marketing_campaigns from anon, authenticated;
grant select, insert, update, delete on public.shop_marketing_campaigns to authenticated;

create table public.shop_discount_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.shop_marketing_campaigns(id) on delete restrict,
  subscriber_id uuid not null references public.newsletter_subscribers(id) on delete restrict,
  code text not null unique check (code ~ '^WKS-[A-Z0-9]{8}$'),
  discount_percent integer not null check (discount_percent between 1 and 50),
  acquisition_source text not null default 'shop-popup' check (
    length(trim(acquisition_source)) between 1 and 80
  ),
  acquisition_path text not null default '' check (length(acquisition_path) <= 500),
  product_slug text check (product_slug is null or length(product_slug) <= 160),
  expires_at timestamptz not null,
  reservation_token uuid,
  reserved_until timestamptz,
  stripe_session_id text,
  redeemed_at timestamptz,
  redeemed_customer_order_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, subscriber_id),
  check (
    (reservation_token is null and reserved_until is null)
    or (reservation_token is not null and reserved_until is not null)
  ),
  check (
    redeemed_at is null
    or (stripe_session_id is not null and redeemed_customer_order_number is not null)
  )
);

create index shop_discount_codes_campaign_created_idx
  on public.shop_discount_codes (campaign_id, created_at desc);
create index shop_discount_codes_campaign_redeemed_idx
  on public.shop_discount_codes (campaign_id, redeemed_at desc)
  where redeemed_at is not null;

drop trigger if exists set_shop_discount_codes_updated_at on public.shop_discount_codes;
create trigger set_shop_discount_codes_updated_at
  before update on public.shop_discount_codes
  for each row execute function public.set_updated_at();

alter table public.shop_discount_codes enable row level security;

create policy "Admins can read shop discount codes"
  on public.shop_discount_codes
  for select
  to authenticated
  using (public.is_admin());

revoke all on public.shop_discount_codes from anon, authenticated;
grant select on public.shop_discount_codes to authenticated;

alter table public.orders
  add column if not exists marketing_campaign_id uuid
    references public.shop_marketing_campaigns(id) on delete restrict,
  add column if not exists discount_code_id uuid
    references public.shop_discount_codes(id) on delete restrict,
  add column if not exists discount_cents integer not null default 0
    check (discount_cents >= 0);

create index if not exists orders_marketing_campaign_created_idx
  on public.orders (marketing_campaign_id, created_at desc)
  where marketing_campaign_id is not null;
create index if not exists orders_discount_code_idx
  on public.orders (discount_code_id)
  where discount_code_id is not null;

alter table public.order_items
  add column if not exists original_unit_price_cents integer;

update public.order_items
set original_unit_price_cents = unit_price_cents
where original_unit_price_cents is null;

alter table public.order_items
  alter column original_unit_price_cents set not null,
  add constraint order_items_original_unit_price_check
    check (original_unit_price_cents >= unit_price_cents and original_unit_price_cents > 0);

alter table public.order_operational_incidents
  drop constraint if exists order_operational_incidents_incident_type_check;

alter table public.order_operational_incidents
  add constraint order_operational_incidents_incident_type_check
  check (
    incident_type in (
      'manual_refund',
      'manual_provider_retry',
      'manual_status_change',
      'manual_provider_order_reference_change',
      'manual_fulfillment_reminder',
      'missing_terms_consent',
      'pending_order_missing_stripe_session',
      'paid_webhook_order_update_mismatch',
      'paid_checkout_promotion_mismatch',
      'paid_checkout_promotion_session_reconciled',
      'paid_checkout_promotion_redemption_failed'
    )
  );

drop index if exists public.order_operational_incidents_once_idx;
create unique index order_operational_incidents_once_idx
  on public.order_operational_incidents (order_id, incident_type)
  where incident_type in (
    'pending_order_missing_stripe_session',
    'paid_webhook_order_update_mismatch',
    'paid_checkout_promotion_mismatch',
    'paid_checkout_promotion_session_reconciled',
    'paid_checkout_promotion_redemption_failed'
  );

-- Owner-privileged public projection. The underlying campaign table stays admin-only;
-- this view exposes only presentation fields and only while a campaign is currently live.
create view public.ecommerce_public_shop_campaign
as
select
  id,
  discount_percent,
  code_valid_days,
  popup_enabled,
  banner_enabled,
  popup_title,
  popup_message,
  banner_text,
  starts_at,
  ends_at
from public.shop_marketing_campaigns
where is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now());

revoke all on public.ecommerce_public_shop_campaign from public;
grant select on public.ecommerce_public_shop_campaign to anon, authenticated;

create or replace function public.reserve_shop_discount_code(
  requested_code text,
  requested_reservation_token uuid
)
returns table (
  discount_code_id uuid,
  campaign_id uuid,
  discount_percent integer,
  subscriber_email text,
  expires_at timestamptz,
  previous_stripe_session_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  code_row public.shop_discount_codes%rowtype;
  subscriber_email_value text;
begin
  select * into code_row
  from public.shop_discount_codes
  where code = upper(trim(requested_code))
  for update;

  if code_row.id is null then
    raise exception 'Promotion code not found';
  end if;
  if code_row.redeemed_at is not null then
    raise exception 'Promotion code already used';
  end if;
  if code_row.expires_at <= now() then
    raise exception 'Promotion code expired';
  end if;
  if code_row.reserved_until is not null
    and code_row.reserved_until > now()
    and code_row.reservation_token is distinct from requested_reservation_token then
    raise exception 'Promotion code is already reserved';
  end if;

  select email into subscriber_email_value
  from public.newsletter_subscribers
  where id = code_row.subscriber_id
  for update;

  if exists (
    select 1
    from public.shop_discount_codes
    where subscriber_id = code_row.subscriber_id
      and id <> code_row.id
      and redeemed_at is null
      and reserved_until > now()
  ) then
    raise exception 'Subscriber already has another promotion code reserved';
  end if;

  if exists (
    select 1
    from public.orders
    where lower(customer_email) = lower(subscriber_email_value)
      and stripe_payment_intent_id is not null
  ) then
    raise exception 'Promotion code is only valid for a first order';
  end if;

  update public.shop_discount_codes
  set
    reservation_token = requested_reservation_token,
    reserved_until = now() + interval '60 minutes'
  where id = code_row.id;

  return query select
    code_row.id,
    code_row.campaign_id,
    code_row.discount_percent,
    subscriber_email_value,
    code_row.expires_at,
    code_row.stripe_session_id;
end;
$$;

create or replace function public.attach_shop_discount_session(
  requested_discount_code_id uuid,
  requested_reservation_token uuid,
  requested_stripe_session_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shop_discount_codes
  set stripe_session_id = requested_stripe_session_id
  where id = requested_discount_code_id
    and reservation_token = requested_reservation_token
    and redeemed_at is null
    and reserved_until > now();

  return found;
end;
$$;

create or replace function public.release_shop_discount_code(
  requested_discount_code_id uuid,
  requested_reservation_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shop_discount_codes
  set
    reservation_token = null,
    reserved_until = null,
    stripe_session_id = null
  where id = requested_discount_code_id
    and reservation_token = requested_reservation_token
    and redeemed_at is null;

  return found;
end;
$$;

create or replace function public.redeem_shop_discount_code(
  requested_discount_code_id uuid,
  requested_stripe_session_id text,
  requested_customer_order_number text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code_row public.shop_discount_codes%rowtype;
begin
  select * into code_row
  from public.shop_discount_codes
  where id = requested_discount_code_id
  for update;

  if code_row.id is null then return 'missing'; end if;

  if code_row.redeemed_at is not null then
    if code_row.stripe_session_id = requested_stripe_session_id then
      return 'already_redeemed_same_session';
    end if;
    return 'already_redeemed_other_session';
  end if;

  update public.shop_discount_codes
  set
    stripe_session_id = requested_stripe_session_id,
    redeemed_at = now(),
    redeemed_customer_order_number = requested_customer_order_number,
    reservation_token = null,
    reserved_until = null
  where id = code_row.id;

  if code_row.stripe_session_id is distinct from requested_stripe_session_id then
    return 'redeemed_after_session_mismatch';
  end if;
  return 'redeemed';
end;
$$;

revoke all on function public.reserve_shop_discount_code(text, uuid) from public;
revoke all on function public.attach_shop_discount_session(uuid, uuid, text) from public;
revoke all on function public.release_shop_discount_code(uuid, uuid) from public;
revoke all on function public.redeem_shop_discount_code(uuid, text, text) from public;
grant execute on function public.reserve_shop_discount_code(text, uuid) to service_role;
grant execute on function public.attach_shop_discount_session(uuid, uuid, text) to service_role;
grant execute on function public.release_shop_discount_code(uuid, uuid) to service_role;
grant execute on function public.redeem_shop_discount_code(uuid, text, text) to service_role;

notify pgrst, 'reload schema';

commit;
