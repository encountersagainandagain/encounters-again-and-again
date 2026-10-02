-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: ecommerce Printful print files storage bucket
-- Paste this in Supabase SQL Editor and run it once.
--
-- Scope: creates a new isolated bucket for original PNG print-ready designs.
-- Does not modify the existing "media" bucket.
--
-- Requires public.is_admin(), created earlier in docs/supabase-admin-security.sql.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'print-files',
  'print-files',
  true,
  26214400,
  array['image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read print files" on storage.objects;
create policy "Anyone can read print files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'print-files');

drop policy if exists "Admins can upload print files" on storage.objects;
create policy "Admins can upload print files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'print-files' and public.is_admin());

drop policy if exists "Admins can update print files" on storage.objects;
create policy "Admins can update print files"
on storage.objects
for update
to authenticated
using (bucket_id = 'print-files' and public.is_admin())
with check (bucket_id = 'print-files' and public.is_admin());

drop policy if exists "Admins can delete print files" on storage.objects;
create policy "Admins can delete print files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'print-files' and public.is_admin());

commit;
