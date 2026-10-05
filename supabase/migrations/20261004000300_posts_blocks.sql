create table public.posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'news' check(kind in ('page','crew_member','expedition','workshop','artwork','message','news','expedition_report','workshop_report')),
  title text not null check(length(trim(title)) > 0),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  subtitle text not null default '', excerpt text not null default '', meta_description text not null default '',
  seo_title text not null default '', kicker text not null default '', meta_line text not null default '',
  cover_id uuid references public.media(id), cover_image text not null default '', cover_alt text not null default '',
  status public.content_status not null default 'draft',
  categories text[] not null default '{}', tags text[] not null default '{}',
  read_time integer not null default 5 check(read_time > 0),
  destination text not null default '', country text not null default '', continent text,
  show_index boolean not null default true, sort integer not null default 0,
  featured boolean not null default false, home_rank integer,
  source_id text unique, source_url text, current_slug text, source_role text,
  migration_status text, source_hash text, imported_at timestamptz,
  source_metadata jsonb not null default '{}',
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status <> 'published' or migration_status is null or migration_status = 'core')
);
alter table public.posts enable row level security;
create policy posts_read on public.posts for select to anon, authenticated using(status='published' or public.is_admin());
create policy posts_admin on public.posts for all to authenticated using(public.is_admin()) with check(public.is_admin());

create table public.post_blocks (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
  type text not null check(type in ('heading','paragraph','image','image-pair','carousel','divider','youtube','quote','link','stay','tour','costs','quick_facts','toc','list','faq','accordion','source')),
  position integer not null check(position >= 0),
  content jsonb not null default '{}' check(jsonb_typeof(content)='object'),
  anchor text, source_block_id text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(post_id,position), unique(post_id,source_block_id)
);
alter table public.post_blocks enable row level security;
create policy blocks_read on public.post_blocks for select to anon, authenticated using(exists(select 1 from public.posts p where p.id=post_id));
create policy blocks_admin on public.post_blocks for all to authenticated using(public.is_admin()) with check(public.is_admin());

create table public.post_media (
  post_id uuid not null references public.posts(id) on delete cascade,
  media_id uuid not null references public.media(id), primary key(post_id,media_id)
);
alter table public.post_media enable row level security;
create policy post_media_read on public.post_media for select to anon, authenticated using(exists(select 1 from public.posts p where p.id=post_id));
create policy post_media_admin on public.post_media for all to authenticated using(public.is_admin()) with check(public.is_admin());

create table public.post_relations (
  post_id uuid not null references public.posts(id) on delete cascade,
  related_post_id uuid not null references public.posts(id) on delete cascade,
  relation text not null default 'result' check(relation in ('result','related')),
  sort integer not null default 0, primary key(post_id,related_post_id), check(post_id<>related_post_id)
);
alter table public.post_relations enable row level security;
create policy relations_read on public.post_relations for select to anon, authenticated using(
  exists(select 1 from public.posts where id=post_id) and exists(select 1 from public.posts where id=related_post_id));
create policy relations_admin on public.post_relations for all to authenticated using(public.is_admin()) with check(public.is_admin());

create table public.route_history (
  old_path text primary key check(old_path like '/%'), post_id uuid references public.posts(id) on delete cascade,
  new_path text not null check(new_path like '/%'), created_at timestamptz not null default now()
);
alter table public.route_history enable row level security;
create policy routes_admin on public.route_history for all to authenticated using(public.is_admin()) with check(public.is_admin());
