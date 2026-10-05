create table public.crew_members (
  id uuid primary key default gen_random_uuid(), slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check(length(trim(name))>0), alias text, role text, bio text not null default '', quote text,
  portrait_id uuid references public.media(id), sort integer not null default 0,
  has_page boolean not null default false, page_post_id uuid unique references public.posts(id) on delete set null,
  status public.content_status not null default 'draft', social_links jsonb not null default '{}',
  source_id text unique, source_url text, updated_at timestamptz not null default now(),
  check(not has_page or page_post_id is not null)
);
create table public.art_categories (
  id uuid primary key default gen_random_uuid(), slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check(length(trim(name))>0), sort integer not null default 0,
  number_label text, title text, credit text, lead text, body text, cta_label text, cta_url text,
  cover_id uuid references public.media(id), layout text not null default 'gallery' check(layout in ('gallery','feature','video','audio')),
  status public.content_status not null default 'draft', seo_title text, meta_description text,
  updated_at timestamptz not null default now()
);
create table public.artworks (
  id uuid primary key references public.posts(id) on delete cascade,
  category_id uuid not null references public.art_categories(id), caption text,
  media_id uuid references public.media(id), external_url text,
  embed_kind text check(embed_kind in ('youtube','spotify')), embed_id text,
  span integer not null default 3 check(span between 1 and 6), full_height boolean not null default false
);
create table public.post_contributors (
  post_id uuid not null references public.posts(id) on delete cascade,
  crew_member_id uuid not null references public.crew_members(id) on delete cascade,
  role text not null default '', position integer not null default 0, primary key(post_id,crew_member_id)
);
alter table public.crew_members enable row level security;
alter table public.art_categories enable row level security;
alter table public.artworks enable row level security;
alter table public.post_contributors enable row level security;
create policy crew_read on public.crew_members for select to anon,authenticated using(status='published' or public.is_admin());
create policy crew_admin on public.crew_members for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy categories_read on public.art_categories for select to anon,authenticated using(status='published' or public.is_admin());
create policy categories_admin on public.art_categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy artwork_read on public.artworks for select to anon,authenticated using(exists(select 1 from public.posts where posts.id=artworks.id) and exists(select 1 from public.art_categories where art_categories.id=category_id));
create policy artwork_admin on public.artworks for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy contributors_read on public.post_contributors for select to anon,authenticated using(exists(select 1 from public.posts where id=post_id) and exists(select 1 from public.crew_members where id=crew_member_id));
create policy contributors_admin on public.post_contributors for all to authenticated using(public.is_admin()) with check(public.is_admin());
