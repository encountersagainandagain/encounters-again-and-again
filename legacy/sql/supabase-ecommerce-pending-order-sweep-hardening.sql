-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce pending-order sweep hardening.
-- Created 2026-08-14.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- Must be run AFTER docs/supabase-ecommerce-shipping-scope.sql.
--
-- Adds a non-provider cancellation reason field and incident types for paid-webhook
-- reconciliation failures. Do not deploy code that writes these fields before this
-- migration is applied.

begin;

alter table public.orders
  add column if not exists cancellation_reason text not null default '';

comment on column public.orders.cancellation_reason is
  'Shop/order lifecycle cancellation reason. Do not use provider_last_error for checkout abandonment or other non-provider cancellations.';

alter table public.order_operational_incidents
  drop constraint if exists order_operational_incidents_incident_type_check;

alter table public.order_operational_incidents
  add constraint order_operational_incidents_incident_type_check
  check (
    incident_type in (
      'manual_refund',
      'manual_provider_retry',
      'manual_status_change',
      'missing_terms_consent',
      'pending_order_missing_stripe_session',
      'paid_webhook_order_update_mismatch'
    )
  );

notify pgrst, 'reload schema';

commit;
