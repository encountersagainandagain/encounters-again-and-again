-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce provider policy tri-state fields and TapStitch verified policy.
-- Created 2026-08-14.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- Must be run AFTER docs/supabase-ecommerce-customer-order-number.sql.
--
-- This supersedes provider policy sellability/hash/view logic from:
-- - docs/supabase-ecommerce-provider-product-sellability.sql
-- - docs/supabase-ecommerce-provider-policy-hardening.sql
-- - docs/supabase-ecommerce-provider-api-policy-editing.sql
--
-- Model:
-- - published: provider publishes/confirms the value and the text/value is saved.
-- - not_published: Katie verified the provider does not publish the value; customer copy
--   must say that honestly instead of inventing a deadline/estimate.
-- - unverified: not checked yet; blocks sellability.
--
-- Shipping cost is stricter: not_published is allowed as a recorded state, but it is
-- not sellable because fixed-price products include shipping in the margin.

begin;

alter table public.ecommerce_providers
  add column if not exists shipping_cost_status text not null default 'published',
  add column if not exists recommended_issue_report_window_days integer,
  add column if not exists eligible_return_request_window_days integer,
  add column if not exists address_change_status text not null default 'published',
  add column if not exists wrong_address_reship_status text not null default 'published',
  add column if not exists shipping_time_status text not null default 'published',
  add column if not exists return_shipping_payer text,
  add column if not exists return_authorization_required boolean not null default true,
  add column if not exists claim_review_time_description text,
  add column if not exists cancellation_cutoff text,
  add column if not exists non_returnable_categories text,
  add column if not exists refund_method_description text,
  add column if not exists production_delay_compensation text,
  add column if not exists customs_responsibility text,
  add column if not exists return_address_status text not null default 'published',
  add column if not exists policy_source_urls text[] not null default '{}';

alter table public.ecommerce_providers
  drop constraint if exists ecommerce_providers_shipping_cost_status_check,
  drop constraint if exists ecommerce_providers_address_change_status_check,
  drop constraint if exists ecommerce_providers_wrong_address_reship_status_check,
  drop constraint if exists ecommerce_providers_shipping_time_status_check,
  drop constraint if exists ecommerce_providers_return_address_status_check,
  drop constraint if exists ecommerce_providers_recommended_issue_report_window_days_check,
  drop constraint if exists ecommerce_providers_eligible_return_request_window_days_check,
  drop constraint if exists ecommerce_providers_return_shipping_payer_len,
  drop constraint if exists ecommerce_providers_claim_review_time_description_len,
  drop constraint if exists ecommerce_providers_cancellation_cutoff_len,
  drop constraint if exists ecommerce_providers_non_returnable_categories_len,
  drop constraint if exists ecommerce_providers_refund_method_description_len,
  drop constraint if exists ecommerce_providers_production_delay_compensation_len,
  drop constraint if exists ecommerce_providers_customs_responsibility_len;

alter table public.ecommerce_providers
  add constraint ecommerce_providers_shipping_cost_status_check
    check (shipping_cost_status in ('published', 'not_published', 'unverified')),
  add constraint ecommerce_providers_address_change_status_check
    check (address_change_status in ('published', 'not_published', 'unverified')),
  add constraint ecommerce_providers_wrong_address_reship_status_check
    check (wrong_address_reship_status in ('published', 'not_published', 'unverified')),
  add constraint ecommerce_providers_shipping_time_status_check
    check (shipping_time_status in ('published', 'not_published', 'unverified')),
  add constraint ecommerce_providers_return_address_status_check
    check (return_address_status in ('published', 'not_published', 'unverified')),
  add constraint ecommerce_providers_recommended_issue_report_window_days_check
    check (recommended_issue_report_window_days is null or recommended_issue_report_window_days > 0),
  add constraint ecommerce_providers_eligible_return_request_window_days_check
    check (eligible_return_request_window_days is null or eligible_return_request_window_days > 0),
  add constraint ecommerce_providers_return_shipping_payer_len
    check (return_shipping_payer is null or length(return_shipping_payer) <= 180),
  add constraint ecommerce_providers_claim_review_time_description_len
    check (claim_review_time_description is null or length(claim_review_time_description) <= 180),
  add constraint ecommerce_providers_cancellation_cutoff_len
    check (cancellation_cutoff is null or length(cancellation_cutoff) <= 180),
  add constraint ecommerce_providers_non_returnable_categories_len
    check (non_returnable_categories is null or length(non_returnable_categories) <= 280),
  add constraint ecommerce_providers_refund_method_description_len
    check (refund_method_description is null or length(refund_method_description) <= 180),
  add constraint ecommerce_providers_production_delay_compensation_len
    check (production_delay_compensation is null or length(production_delay_compensation) <= 180),
  add constraint ecommerce_providers_customs_responsibility_len
    check (customs_responsibility is null or length(customs_responsibility) <= 220);

comment on column public.ecommerce_providers.shipping_cost_status is
  'Tri-state source status for shipping costs. Must be published for provider sellability.';
comment on column public.ecommerce_providers.eligible_return_request_window_days is
  'Maximum window to request an already eligible/approved return. Not a general no-cause return window.';
comment on column public.ecommerce_providers.policy_source_urls is
  'Additional source URLs. Direct provider email/chat confirmation should be described in policy_source_note.';

update public.ecommerce_providers
set
  shipping_cost_status = 'published',
  address_change_status = 'published',
  wrong_address_reship_status = 'published',
  shipping_time_status = 'published',
  return_address_status = 'published',
  return_shipping_payer = coalesce(return_shipping_payer, 'Provider-managed / case-specific. Customers should contact Katie first.'),
  return_authorization_required = true,
  claim_review_time_description = coalesce(claim_review_time_description, 'Provider reviews claims after Katie submits the issue and evidence.'),
  cancellation_cutoff = coalesce(cancellation_cutoff, 'Before the provider starts fulfillment or shipping, if the provider still allows cancellation.'),
  non_returnable_categories = coalesce(non_returnable_categories, 'Correctly made made-to-order items are not returnable for size, color, or buyer’s remorse.'),
  refund_method_description = coalesce(refund_method_description, 'Refunds, when approved, are returned through the original payment flow.'),
  production_delay_compensation = coalesce(production_delay_compensation, 'No public automatic delay-compensation rule is stored for this provider.'),
  customs_responsibility = coalesce(customs_responsibility, 'International customs/duties are not supported by the shop yet.'),
  policy_source_urls = case
    when cardinality(policy_source_urls) = 0 and length(trim(coalesce(policy_source_url, ''))) > 0
      then array[policy_source_url]
    else policy_source_urls
  end
where code = 'printful';

update public.ecommerce_providers
set
  name = 'TapStitch',
  fulfillment_mode = 'manual',
  is_active = false,
  provider_is_sellable = false,
  shipping_cost_status = 'not_published',
  shipping_first_item_cents = 0,
  shipping_additional_item_cents = 0,
  contact_email = coalesce(nullif(contact_email, ''), 'support@tapstitch.com'),
  contact_url = coalesce(nullif(contact_url, ''), 'https://www.tapstitch.com'),
  contact_notes = coalesce(nullif(contact_notes, ''), 'Manual provider. Shipping cost must be confirmed before products can sell.'),
  damaged_claim_window_days = 30,
  recommended_issue_report_window_days = 7,
  photo_evidence_required = false,
  photo_evidence_description = 'Katie asks customers for photos or videos of the issue when applicable, plus a short description and order number.',
  lost_package_claim_window_days = 7,
  lost_package_window_basis = 'the estimated delivery date',
  eligible_return_request_window_days = 180,
  delivered_not_received_policy = 'For carrier tracking marked delivered but not received, TapStitch says the customer is responsible for filing a claim directly with the carrier; TapStitch will not resend or refund absent evidence of carrier error.',
  address_change_status = 'not_published',
  address_change_cutoff = '',
  wrong_address_reship_status = 'published',
  wrong_address_reship_policy = 'Refunds are not issued for orders that cannot be delivered due to incorrect or incomplete address information provided by the customer.',
  accepts_size_color_remorse_returns = false,
  production_time_description = 'Small-volume orders: production target 3–7 business days, with shipment arranged no later than the 8th business day after payment confirmation.',
  shipping_time_status = 'not_published',
  shipping_time_description = '',
  return_shipping_payer = 'Customers are responsible for return shipping costs. TapStitch does not provide Freight-To-Collect return services.',
  return_authorization_required = true,
  claim_review_time_description = 'TapStitch aims to review and process requests within 7 business days.',
  cancellation_cutoff = 'Orders may only be canceled and fully refunded while they remain in “In Review” status. Once production starts, cancellation may no longer be eligible for a full refund.',
  non_returnable_categories = 'Tights, underwear, pajamas, swimsuits, socks, masks, sample items, deliberately damaged items, items beyond the 180-day eligible-return window, correctly produced items later deemed unwanted, incorrect-address orders, and customer-requested design/order modifications.',
  refund_method_description = 'Approved refunds are issued to the original payment method and processed in the original purchase currency.',
  production_delay_compensation = 'For small-volume orders, if no shipping or tracking information has been provided by the end of the 7th business day, customers may be eligible for compensation of up to 10% of the original product value.',
  customs_responsibility = 'Refunds are not issued for orders seized, held, or destroyed by customs or other governmental authority.',
  support_contact = 'support@tapstitch.com',
  claim_submission_instructions = 'Contact TapStitch support with Katie/order details, customer issue description, and photos/videos if applicable. Wait for approval before sending any return.',
  return_address_status = 'not_published',
  return_address = '',
  policy_source_url = 'https://www.tapstitch.com/help-center/faq/detail/Returns-Policy',
  policy_source_urls = array[
    'https://www.tapstitch.com/terms-of-service',
    'https://www.tapstitch.com/help-center/faq/detail/Returns-Policy'
  ],
  policy_source_note = 'TapStitch Terms of Service and Returns & Refund Policy verified 2026-08-14. Shipping cost, transit time, address-change cutoff, and fixed return address are not published in these sources.',
  policy_verified_at = date '2026-08-14',
  updated_at = now()
where code = 'tapstitch';

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
        'shipping_cost_status', provider_row.shipping_cost_status,
        'damaged_claim_window_days', provider_row.damaged_claim_window_days,
        'recommended_issue_report_window_days', provider_row.recommended_issue_report_window_days,
        'photo_evidence_required', provider_row.photo_evidence_required,
        'photo_evidence_description', trim(coalesce(provider_row.photo_evidence_description, '')),
        'lost_package_claim_window_days', provider_row.lost_package_claim_window_days,
        'lost_package_window_basis', trim(coalesce(provider_row.lost_package_window_basis, '')),
        'eligible_return_request_window_days', provider_row.eligible_return_request_window_days,
        'delivered_not_received_policy', trim(coalesce(provider_row.delivered_not_received_policy, '')),
        'address_change_status', provider_row.address_change_status,
        'address_change_cutoff', trim(coalesce(provider_row.address_change_cutoff, '')),
        'wrong_address_reship_status', provider_row.wrong_address_reship_status,
        'wrong_address_reship_policy', trim(coalesce(provider_row.wrong_address_reship_policy, '')),
        'accepts_size_color_remorse_returns', provider_row.accepts_size_color_remorse_returns,
        'production_time_description', trim(coalesce(provider_row.production_time_description, '')),
        'shipping_time_status', provider_row.shipping_time_status,
        'shipping_time_description', trim(coalesce(provider_row.shipping_time_description, '')),
        'return_shipping_payer', trim(coalesce(provider_row.return_shipping_payer, '')),
        'return_authorization_required', provider_row.return_authorization_required,
        'claim_review_time_description', trim(coalesce(provider_row.claim_review_time_description, '')),
        'cancellation_cutoff', trim(coalesce(provider_row.cancellation_cutoff, '')),
        'non_returnable_categories', trim(coalesce(provider_row.non_returnable_categories, '')),
        'refund_method_description', trim(coalesce(provider_row.refund_method_description, '')),
        'production_delay_compensation', trim(coalesce(provider_row.production_delay_compensation, '')),
        'customs_responsibility', trim(coalesce(provider_row.customs_responsibility, '')),
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
  if provider_row.shipping_cost_status is distinct from 'published' then
    missing := array_append(missing, 'shipping_cost_status');
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
  if provider_row.address_change_status = 'unverified' then
    missing := array_append(missing, 'address_change_status');
  elsif provider_row.address_change_status = 'published'
    and length(trim(coalesce(provider_row.address_change_cutoff, ''))) = 0 then
    missing := array_append(missing, 'address_change_cutoff');
  end if;
  if provider_row.wrong_address_reship_status = 'unverified' then
    missing := array_append(missing, 'wrong_address_reship_status');
  elsif provider_row.wrong_address_reship_status = 'published'
    and length(trim(coalesce(provider_row.wrong_address_reship_policy, ''))) = 0 then
    missing := array_append(missing, 'wrong_address_reship_policy');
  end if;
  if length(trim(coalesce(provider_row.production_time_description, ''))) = 0 then
    missing := array_append(missing, 'production_time_description');
  end if;
  if provider_row.shipping_time_status = 'unverified' then
    missing := array_append(missing, 'shipping_time_status');
  elsif provider_row.shipping_time_status = 'published'
    and length(trim(coalesce(provider_row.shipping_time_description, ''))) = 0 then
    missing := array_append(missing, 'shipping_time_description');
  end if;
  if length(trim(coalesce(provider_row.support_contact, ''))) = 0 then
    missing := array_append(missing, 'support_contact');
  end if;
  if length(trim(coalesce(provider_row.claim_submission_instructions, ''))) = 0 then
    missing := array_append(missing, 'claim_submission_instructions');
  end if;
  if provider_row.return_address_status = 'unverified' then
    missing := array_append(missing, 'return_address_status');
  elsif provider_row.return_address_status = 'published'
    and length(trim(coalesce(provider_row.return_address, ''))) = 0 then
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

-- IMPORTANT: this view changed shape by inserting customer-facing columns before
-- existing columns. PostgreSQL cannot handle that with CREATE OR REPLACE VIEW; it
-- reads the shifted columns as renames and aborts with 42P16. Any future shape change
-- to this view must use DROP VIEW + CREATE VIEW + GRANT + PostgREST schema reload.
drop view if exists public.ecommerce_public_provider_terms;

create view public.ecommerce_public_provider_terms as
select
  code,
  name,
  is_active,
  provider_is_sellable,
  provider_policy_version,
  provider_policy_hash,
  shipping_cost_status,
  damaged_claim_window_days,
  recommended_issue_report_window_days,
  photo_evidence_required,
  photo_evidence_description,
  lost_package_claim_window_days,
  lost_package_window_basis,
  eligible_return_request_window_days,
  delivered_not_received_policy,
  address_change_status,
  address_change_cutoff,
  wrong_address_reship_status,
  wrong_address_reship_policy,
  accepts_size_color_remorse_returns,
  production_time_description,
  shipping_time_status,
  shipping_time_description,
  return_shipping_payer,
  return_authorization_required,
  claim_review_time_description,
  cancellation_cutoff,
  non_returnable_categories,
  refund_method_description,
  production_delay_compensation,
  customs_responsibility,
  policy_verified_at
from public.ecommerce_providers
where is_active = true
  and provider_is_sellable = true;

comment on view public.ecommerce_public_provider_terms is
  'Public customer-facing provider policy fields only. Tri-state not_published values are intentionally shown as honest customer disclosures; internal provider contacts, claim instructions, source notes, and return addresses stay on ecommerce_providers for admins.';

grant select on public.ecommerce_public_provider_terms to anon, authenticated;

notify pgrst, 'reload schema';

commit;
