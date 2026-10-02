-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce operational incidents
-- Date: 2026-08-09
--
-- Adds an append-only incident ledger for manual interventions that indicate the
-- automatic commerce flow needed human help: manual refunds, Printful/provider
-- retries, and forced/manual status changes.
--
-- Run manually in Supabase SQL Editor inside the real project.

begin;

create table if not exists public.order_operational_incidents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  incident_type text not null check (
    incident_type in (
      'manual_refund',
      'manual_provider_retry',
      'manual_status_change'
    )
  ),
  reason text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists order_operational_incidents_order_created_idx
  on public.order_operational_incidents (order_id, created_at desc);

create index if not exists order_operational_incidents_type_created_idx
  on public.order_operational_incidents (incident_type, created_at desc);

alter table public.order_operational_incidents enable row level security;

drop policy if exists "Admins can read operational incidents" on public.order_operational_incidents;
create policy "Admins can read operational incidents"
on public.order_operational_incidents
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert operational incidents" on public.order_operational_incidents;
create policy "Admins can insert operational incidents"
on public.order_operational_incidents
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update operational incidents" on public.order_operational_incidents;
drop policy if exists "Admins can delete operational incidents" on public.order_operational_incidents;

comment on table public.order_operational_incidents is
  'Append-only operational incident ledger for manual commerce interventions: refunds, provider retries, and forced/manual status changes.';

comment on column public.order_operational_incidents.reason is
  'Human-readable reason or summary of what required intervention. For refunds this mirrors the customer-facing refund reason.';

comment on column public.order_operational_incidents.metadata is
  'Structured context for debugging and aggregate reporting, e.g. previous status/error, refund id, amount, provider result.';

commit;
