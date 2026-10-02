-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce provider API policy editing.
-- Created 2026-08-13.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- Must be run AFTER docs/supabase-ecommerce-provider-policy-hardening.sql.
--
-- Scope:
-- - Allows admins to update verified policy fields for API providers such as Printful.
-- - Keeps API integration data locked from the admin/browser path.
-- - Does not execute from Codex and does not touch donation/support_us flows.

begin;

create or replace function public.prevent_api_provider_integration_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.fulfillment_mode = 'api' then
    if new.code is distinct from old.code
      or new.name is distinct from old.name
      or new.fulfillment_mode is distinct from old.fulfillment_mode
      or new.is_active is distinct from old.is_active
      or new.shipping_first_item_cents is distinct from old.shipping_first_item_cents
      or new.shipping_additional_item_cents is distinct from old.shipping_additional_item_cents
      or new.contact_email is distinct from old.contact_email
      or new.contact_url is distinct from old.contact_url
      or new.contact_notes is distinct from old.contact_notes then
      raise exception 'API provider integration fields are locked; only verified policy fields can be updated from admin.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ecommerce_providers_prevent_api_integration_mutation on public.ecommerce_providers;
create trigger ecommerce_providers_prevent_api_integration_mutation
before update on public.ecommerce_providers
for each row
execute function public.prevent_api_provider_integration_mutation();

drop policy if exists "Admins can update manual ecommerce providers" on public.ecommerce_providers;
drop policy if exists "Admins can update ecommerce providers" on public.ecommerce_providers;

create policy "Admins can update ecommerce providers"
on public.ecommerce_providers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on policy "Admins can update ecommerce providers" on public.ecommerce_providers is
  'Admins may fully update manual providers. API provider integration fields are locked by prevent_api_provider_integration_mutation(); only verified policy fields can change.';

commit;
