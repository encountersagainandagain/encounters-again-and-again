-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: first admin posts table
-- Paste this in Supabase SQL Editor, then run it once.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  subtitle text default '',
  excerpt text not null,
  cover_image text default '',
  cover_alt text default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  categories text[] not null default '{}',
  tags text[] not null default '{}',
  read_time integer not null default 5 check (read_time > 0),
  destination text default '',
  country text default '',
  continent text check (
    continent is null
    or continent in (
      'asia',
      'europe',
      'oceania',
      'north-america',
      'central-america',
      'south-america',
      'africa'
    )
  ),
  published_at date,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_status_idx on public.posts(status);
create index if not exists posts_published_at_idx on public.posts(published_at desc);
create index if not exists posts_continent_idx on public.posts(continent);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

alter table public.posts enable row level security;

drop policy if exists "Authenticated users can read posts" on public.posts;
create policy "Authenticated users can read posts"
on public.posts
for select
to authenticated
using (true);

drop policy if exists "Anyone can read published posts" on public.posts;
create policy "Anyone can read published posts"
on public.posts
for select
to anon
using (status = 'published');

drop policy if exists "Authenticated users can create posts" on public.posts;
create policy "Authenticated users can create posts"
on public.posts
for insert
to authenticated
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can update posts" on public.posts;
create policy "Authenticated users can update posts"
on public.posts
for update
to authenticated
using (true)
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can delete posts" on public.posts;
create policy "Authenticated users can delete posts"
on public.posts
for delete
to authenticated
using (true);

create table if not exists public.post_blocks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  type text not null check (type in ('heading', 'paragraph', 'image', 'image-pair', 'carousel', 'divider', 'youtube', 'quote', 'link', 'affiliate_link', 'stay', 'tour', 'costs', 'quick_facts', 'toc', 'list', 'faq', 'accordion')),
  position integer not null default 0 check (position >= 0),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_blocks_post_position_idx
on public.post_blocks(post_id, position);

drop trigger if exists set_post_blocks_updated_at on public.post_blocks;
create trigger set_post_blocks_updated_at
before update on public.post_blocks
for each row
execute function public.set_updated_at();

alter table public.post_blocks enable row level security;

drop policy if exists "Authenticated users can read post blocks" on public.post_blocks;
create policy "Authenticated users can read post blocks"
on public.post_blocks
for select
to authenticated
using (true);

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
create policy "Authenticated users can create post blocks"
on public.post_blocks
for insert
to authenticated
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can update post blocks" on public.post_blocks;
create policy "Authenticated users can update post blocks"
on public.post_blocks
for update
to authenticated
using (true)
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can delete post blocks" on public.post_blocks;
create policy "Authenticated users can delete post blocks"
on public.post_blocks
for delete
to authenticated
using (true);
