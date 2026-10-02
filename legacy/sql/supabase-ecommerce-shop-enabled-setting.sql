-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce shop availability switch.
-- Created 2026-08-23.
--
-- Run manually in the Supabase SQL Editor.
-- This migration is additive: it keeps all existing site settings and adds
-- shopEnabled=false only when the key is missing. The app default is also
-- false, so the shop stays closed until Katie explicitly enables it from
-- /admin/products.

begin;

insert into public.site_settings (key, value)
values ('site', '{"shopEnabled": false}'::jsonb)
on conflict (key) do update
set
  value = '{"shopEnabled": false}'::jsonb || public.site_settings.value,
  updated_at = now();

commit;
