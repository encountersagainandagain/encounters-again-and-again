-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: public read policies for published content
-- Run this if published posts work for admins but do not appear for public/anonymous users,
-- Google, or the dynamic sitemap.
--
-- This keeps drafts private. Anonymous visitors can only read:
-- 1. posts where status = 'published'
-- 2. blocks that belong to published posts

alter table public.posts enable row level security;
alter table public.post_blocks enable row level security;

drop policy if exists "Anyone can read published posts" on public.posts;
create policy "Anyone can read published posts"
on public.posts
for select
to anon
using (status = 'published');

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
