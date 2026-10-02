-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Ecommerce product story fields.
-- Created 2026-08-21.
--
-- Run manually in the Supabase SQL Editor inside one transaction.
-- Must be run AFTER: docs/supabase-ecommerce-product-shipping-rates-rpc.sql
--
-- Scope: adds three optional narrative fields to public.products so the
-- redesigned shop can show a short story line on collection cards and a
-- longer story block with a photo on the product detail page. All three
-- are optional; a product with none of them set must still render a
-- complete card/PDP with no empty gaps (that is a frontend rule, not
-- enforced here). This migration does not touch any other table and does
-- not change existing columns.
--
-- Do not run via psql/direct DB connection.

begin;

alter table public.products
  add column if not exists story_short_text text not null default '',
  add column if not exists story_long_text text not null default '',
  add column if not exists story_image_url text;

comment on column public.products.story_short_text is
  'Optional one-line story shown on shop collection cards. Empty string means no story line.';
comment on column public.products.story_long_text is
  'Optional longer first-person story shown on the product detail page. Empty string means no story block.';
comment on column public.products.story_image_url is
  'Optional photo URL paired with story_long_text on the product detail page. Null means no story photo.';

commit;
