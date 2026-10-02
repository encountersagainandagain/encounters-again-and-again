-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: gallery items table
-- Paste this in Supabase SQL Editor, then run it once.

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text default '',
  continent text not null check (
    continent in (
      'asia',
      'europe',
      'oceania',
      'north-america',
      'central-america',
      'south-america',
      'africa'
    )
  ),
  image_url text not null,
  alt_text text default '',
  orientation text not null default 'landscape' check (orientation in ('portrait', 'landscape', 'square')),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gallery_items_visible_order_idx
on public.gallery_items(is_visible, sort_order, created_at desc);

create index if not exists gallery_items_continent_idx
on public.gallery_items(continent);

drop trigger if exists set_gallery_items_updated_at on public.gallery_items;
create trigger set_gallery_items_updated_at
before update on public.gallery_items
for each row
execute function public.set_updated_at();

alter table public.gallery_items enable row level security;

drop policy if exists "Anyone can read visible gallery items" on public.gallery_items;
create policy "Anyone can read visible gallery items"
on public.gallery_items
for select
to anon, authenticated
using (is_visible = true);

drop policy if exists "Authenticated users can read all gallery items" on public.gallery_items;
create policy "Authenticated users can read all gallery items"
on public.gallery_items
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create gallery items" on public.gallery_items;
create policy "Authenticated users can create gallery items"
on public.gallery_items
for insert
to authenticated
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can update gallery items" on public.gallery_items;
create policy "Authenticated users can update gallery items"
on public.gallery_items
for update
to authenticated
using (true)
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can delete gallery items" on public.gallery_items;
create policy "Authenticated users can delete gallery items"
on public.gallery_items
for delete
to authenticated
using (true);
