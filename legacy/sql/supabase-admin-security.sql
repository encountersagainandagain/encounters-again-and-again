-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: admin allowlist and stricter write policies
-- Paste this in Supabase SQL Editor after the posts, gallery, and storage SQL files.
--
-- Important:
-- 1. Populate admin_users only with confirmed Encounters administrators.
-- 2. Turn off public signups in Supabase Auth settings before production.

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Source administrator seed omitted. Confirm Encounters administrators in PASO 2.

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users
for select
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can read posts" on public.posts;
drop policy if exists "Admins can read posts" on public.posts;
create policy "Admins can read posts"
on public.posts
for select
to authenticated
using (public.is_admin());

drop policy if exists "Anyone can read published posts" on public.posts;
create policy "Anyone can read published posts"
on public.posts
for select
to anon
using (status = 'published');

drop policy if exists "Authenticated users can create posts" on public.posts;
drop policy if exists "Admins can create posts" on public.posts;
create policy "Admins can create posts"
on public.posts
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Authenticated users can update posts" on public.posts;
drop policy if exists "Admins can update posts" on public.posts;
create policy "Admins can update posts"
on public.posts
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can delete posts" on public.posts;
drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts"
on public.posts
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can read post blocks" on public.post_blocks;
drop policy if exists "Admins can read post blocks" on public.post_blocks;
create policy "Admins can read post blocks"
on public.post_blocks
for select
to authenticated
using (public.is_admin());

drop policy if exists "Anyone can read published post blocks" on public.post_blocks;
create policy "Anyone can read published post blocks"
on public.post_blocks
for select
to anon
using (
  exists (
    select 1
    from public.posts
    where posts.id = post_blocks.post_id
      and posts.status = 'published'
  )
);

drop policy if exists "Authenticated users can create post blocks" on public.post_blocks;
drop policy if exists "Admins can create post blocks" on public.post_blocks;
create policy "Admins can create post blocks"
on public.post_blocks
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Authenticated users can update post blocks" on public.post_blocks;
drop policy if exists "Admins can update post blocks" on public.post_blocks;
create policy "Admins can update post blocks"
on public.post_blocks
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can delete post blocks" on public.post_blocks;
drop policy if exists "Admins can delete post blocks" on public.post_blocks;
create policy "Admins can delete post blocks"
on public.post_blocks
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can read all gallery items" on public.gallery_items;
drop policy if exists "Admins can read all gallery items" on public.gallery_items;
create policy "Admins can read all gallery items"
on public.gallery_items
for select
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can create gallery items" on public.gallery_items;
drop policy if exists "Admins can create gallery items" on public.gallery_items;
create policy "Admins can create gallery items"
on public.gallery_items
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Authenticated users can update gallery items" on public.gallery_items;
drop policy if exists "Admins can update gallery items" on public.gallery_items;
create policy "Admins can update gallery items"
on public.gallery_items
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can delete gallery items" on public.gallery_items;
drop policy if exists "Admins can delete gallery items" on public.gallery_items;
create policy "Admins can delete gallery items"
on public.gallery_items
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can upload media files" on storage.objects;
drop policy if exists "Admins can upload media files" on storage.objects;
create policy "Admins can upload media files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "Authenticated users can update media files" on storage.objects;
drop policy if exists "Admins can update media files" on storage.objects;
create policy "Admins can update media files"
on storage.objects
for update
to authenticated
using (bucket_id = 'media' and public.is_admin())
with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "Authenticated users can delete media files" on storage.objects;
drop policy if exists "Admins can delete media files" on storage.objects;
create policy "Admins can delete media files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'media' and public.is_admin());
