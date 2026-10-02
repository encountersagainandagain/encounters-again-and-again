-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: media storage bucket and policies
-- Paste this in Supabase SQL Editor, then run it once.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read media files" on storage.objects;
create policy "Anyone can read media files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'media');

drop policy if exists "Authenticated users can upload media files" on storage.objects;
create policy "Authenticated users can upload media files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'media');

drop policy if exists "Authenticated users can update media files" on storage.objects;
create policy "Authenticated users can update media files"
on storage.objects
for update
to authenticated
using (bucket_id = 'media')
with check (bucket_id = 'media');

drop policy if exists "Authenticated users can delete media files" on storage.objects;
create policy "Authenticated users can delete media files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'media');
