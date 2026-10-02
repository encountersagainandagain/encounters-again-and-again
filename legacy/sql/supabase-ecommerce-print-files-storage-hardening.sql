-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: harden ecommerce print-files Storage SELECT policy
-- Paste this in Supabase SQL Editor and run it once.
--
-- Context:
-- - The "print-files" bucket is public so Printful can fetch a specific object
--   by public URL when creating products/orders.
-- - Public object delivery does not need a broad SELECT policy on storage.objects.
-- - A broad SELECT policy allows bucket listing/enumeration, which would expose
--   original print-ready PNG designs.
--
-- After applying, verify that a public URL for one existing print-files object
-- still opens in an incognito window without a Supabase session. Printful needs
-- that object-level GET access.
--
-- Do not touch the existing "media" bucket or its policies here.

begin;

drop policy if exists "Anyone can read print files" on storage.objects;

drop policy if exists "Admins can read print files" on storage.objects;
create policy "Admins can read print files"
on storage.objects
for select
to authenticated
using (bucket_id = 'print-files' and public.is_admin());

commit;
