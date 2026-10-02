-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas ecommerce production test-data cleanup.
-- Created 2026-08-23.
--
-- WARNING: irreversible deletion script.
-- Run the SELECT review section first. Do not run the DELETE section until the counts and samples
-- match the test data you intend to remove.
--
-- Scope:
-- - Deletes ecommerce transactional test data only: orders, order_items, refunds, customer
--   notifications, operational incidents, and processed ecommerce webhook events.
-- - Does NOT delete reference/configuration data: providers, provider policies, shop countries,
--   shipping rates, size guides, products, product variants, product files, or product images.
--
-- Test-order criteria:
-- - Stripe Checkout sessions created in test mode have ids beginning with `cs_test_`.
-- - Pending/failed/on_hold/canceled orders without a Stripe session before the pre-production cutoff
--   are cleanup candidates because they were created during local/manual testing and cannot be
--   safely reconciled to a paid Checkout Session.
--
-- If this file is run after accepting real customers, stop and revise the cutoff first.

-- =============================================================================
-- PART A — REVIEW ONLY. Run this first.
-- =============================================================================

with cleanup_params as (
  select timestamptz '2026-08-23 00:00:00-06' as pre_production_cutoff
),
candidate_orders as (
  select o.id
  from public.orders o
  cross join cleanup_params p
  where
    o.stripe_session_id like 'cs_test_%'
    or (
      o.stripe_session_id is null
      and o.created_at < p.pre_production_cutoff
      and o.status in ('pending', 'failed', 'on_hold', 'canceled')
    )
),
counts as (
  select 'orders' as table_name, count(*)::bigint as rows_to_delete
  from public.orders o
  where o.id in (select id from candidate_orders)
  union all
  select 'order_items', count(*)::bigint
  from public.order_items oi
  where oi.order_id in (select id from candidate_orders)
  union all
  select 'order_refunds', count(*)::bigint
  from public.order_refunds r
  where r.order_id in (select id from candidate_orders)
  union all
  select 'order_customer_notifications', count(*)::bigint
  from public.order_customer_notifications n
  where n.order_id in (select id from candidate_orders)
  union all
  select 'order_operational_incidents', count(*)::bigint
  from public.order_operational_incidents i
  where i.order_id in (select id from candidate_orders)
  union all
  select 'processed_webhook_events', count(*)::bigint
  from public.processed_webhook_events e
  cross join cleanup_params p
  where e.source in ('stripe', 'printful')
    and e.processed_at < p.pre_production_cutoff
)
select *
from counts
order by table_name;

-- Review the exact orders before deleting.
with cleanup_params as (
  select timestamptz '2026-08-23 00:00:00-06' as pre_production_cutoff
)
select
  o.id,
  o.customer_order_number,
  o.status,
  o.provider,
  o.stripe_session_id,
  o.stripe_payment_intent_id,
  o.customer_email,
  o.total_cents,
  o.currency,
  o.created_at
from public.orders o
cross join cleanup_params p
where
  o.stripe_session_id like 'cs_test_%'
  or (
    o.stripe_session_id is null
    and o.created_at < p.pre_production_cutoff
    and o.status in ('pending', 'failed', 'on_hold', 'canceled')
  )
order by o.created_at, o.id;

-- Optional storage review. This does not delete Storage objects.
-- Use these rows to decide which media/print-files objects are test artifacts.
select
  p.id as product_id,
  p.name as product_name,
  p.slug,
  p.is_active,
  pi.image_url,
  regexp_replace(pi.image_url, '^.*/storage/v1/object/public/media/', '') as media_bucket_path
from public.product_images pi
join public.products p on p.id = pi.product_id
where p.is_active = false or p.name ilike '%test%' or p.slug ilike '%test%'
order by p.name, pi.position;

select
  p.id as product_id,
  p.name as product_name,
  p.slug,
  p.is_active,
  pf.placement,
  pf.file_url,
  regexp_replace(pf.file_url, '^.*/storage/v1/object/public/print-files/', '') as print_files_bucket_path
from public.product_files pf
join public.products p on p.id = pf.product_id
where p.is_active = false or p.name ilike '%test%' or p.slug ilike '%test%'
order by p.name, pf.placement, pf.position;

-- Customer order number sequence:
-- If the DELETE section leaves zero rows in public.orders, it is reasonable before launch to reset
-- the sequence so the first real order starts at WKS-1000 again:
--
--   alter sequence public.ecommerce_customer_order_number_seq restart with 1000;
--
-- Risk: only do this before any real customer receives a WKS number. Reusing a number after a real
-- email, support thread, Stripe payment, or screenshot exists would create support confusion.

-- =============================================================================
-- PART B — DELETE. Run only after reviewing PART A.
-- =============================================================================

begin;

with cleanup_params as (
  select timestamptz '2026-08-23 00:00:00-06' as pre_production_cutoff
),
candidate_orders as (
  select o.id
  from public.orders o
  cross join cleanup_params p
  where
    o.stripe_session_id like 'cs_test_%'
    or (
      o.stripe_session_id is null
      and o.created_at < p.pre_production_cutoff
      and o.status in ('pending', 'failed', 'on_hold', 'canceled')
    )
),
deleted_refunds as (
  delete from public.order_refunds r
  where r.order_id in (select id from candidate_orders)
  returning 1
),
deleted_notifications as (
  delete from public.order_customer_notifications n
  where n.order_id in (select id from candidate_orders)
  returning 1
),
deleted_incidents as (
  delete from public.order_operational_incidents i
  where i.order_id in (select id from candidate_orders)
  returning 1
),
deleted_items as (
  delete from public.order_items oi
  where oi.order_id in (select id from candidate_orders)
  returning 1
),
deleted_orders as (
  delete from public.orders o
  where o.id in (select id from candidate_orders)
  returning 1
),
deleted_webhooks as (
  delete from public.processed_webhook_events e
  using cleanup_params p
  where e.source in ('stripe', 'printful')
    and e.processed_at < p.pre_production_cutoff
  returning 1
)
select 'order_refunds' as table_name, count(*)::bigint as rows_deleted from deleted_refunds
union all
select 'order_customer_notifications', count(*)::bigint from deleted_notifications
union all
select 'order_operational_incidents', count(*)::bigint from deleted_incidents
union all
select 'order_items', count(*)::bigint from deleted_items
union all
select 'orders', count(*)::bigint from deleted_orders
union all
select 'processed_webhook_events', count(*)::bigint from deleted_webhooks
order by table_name;

commit;
