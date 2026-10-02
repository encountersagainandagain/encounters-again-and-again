-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: Tapstitch address-change and wrong-address reshipping policy
-- Run manually in Supabase SQL Editor.
-- Source: direct response from Tapstitch support received by Katie on 2026-08-28.

update public.ecommerce_providers
set
  address_change_status = 'published',
  address_change_cutoff = 'Shipping addresses can generally be changed before production or fulfillment. Contact Katie immediately; after production starts or the order ships, a change may not be possible.',
  wrong_address_reship_status = 'published',
  wrong_address_reship_policy = 'If an incorrect or incomplete customer address causes return or failed delivery, the customer pays reshipping. A new shipping fee may apply to the replacement shipment.',
  policy_source_note = 'Public Terms and Returns Policy reviewed 2026-08-14. Direct Tapstitch support confirmed 2026-08-28: address changes are generally possible before production/fulfillment but should be requested immediately; after production starts or shipment, changes may not be possible. Customers pay reshipping when an incorrect/incomplete address causes return or failed delivery; a new fee may apply. Transit time and fixed return address remain not published.',
  policy_verified_at = date '2026-08-28',
  updated_at = now()
where code = 'tapstitch';

do $$
begin
  if not exists (
    select 1
    from public.ecommerce_providers
    where code = 'tapstitch'
  ) then
    raise exception 'Tapstitch provider row was not found.';
  end if;
end
$$;
