-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: gear items table
-- Paste this in Supabase SQL Editor, then run it once.

create table if not exists public.gear_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text not null,
  link text not null default '',
  tag text not null default '',
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gear_items_visible_order_idx
on public.gear_items(is_visible, sort_order, created_at desc);

create index if not exists gear_items_tag_idx
on public.gear_items(tag);

drop trigger if exists set_gear_items_updated_at on public.gear_items;
create trigger set_gear_items_updated_at
before update on public.gear_items
for each row
execute function public.set_updated_at();

alter table public.gear_items enable row level security;

drop policy if exists "Anyone can read visible gear items" on public.gear_items;
create policy "Anyone can read visible gear items"
on public.gear_items
for select
to anon, authenticated
using (is_visible = true);

drop policy if exists "Authenticated users can read all gear items" on public.gear_items;
create policy "Authenticated users can read all gear items"
on public.gear_items
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create gear items" on public.gear_items;
create policy "Authenticated users can create gear items"
on public.gear_items
for insert
to authenticated
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can update gear items" on public.gear_items;
create policy "Authenticated users can update gear items"
on public.gear_items
for update
to authenticated
using (true)
with check ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can delete gear items" on public.gear_items;
create policy "Authenticated users can delete gear items"
on public.gear_items
for delete
to authenticated
using (true);
