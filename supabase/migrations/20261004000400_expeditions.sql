create table public.expeditions (
  id uuid primary key references public.posts(id) on delete cascade,
  activity_status public.activity_status not null default 'upcoming',
  starts_on date, ends_on date, place text, date_label text, availability_label text, cta_label text,
  underwater_id uuid references public.media(id),
  check(ends_on is null or starts_on is null or ends_on>=starts_on)
);
create table public.expedition_needs (
  id uuid primary key default gen_random_uuid(), expedition_id uuid not null references public.expeditions(id) on delete cascade,
  title text not null check(length(trim(title))>0), body text not null default '',
  status text not null default 'pending' check(status in ('pending','obtained','closed')),
  contact_url text, sort integer not null default 0
);
create table public.expedition_cards (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
  kicker text, title text not null, body text, signature text, bullets jsonb not null default '[]',
  media_id uuid references public.media(id), media_side text check(media_side in ('left','right')),
  theme text not null default 'light' check(theme in ('light','dark')), cta_label text, cta_url text,
  sort integer not null default 0
);
alter table public.expeditions enable row level security;
alter table public.expedition_needs enable row level security;
alter table public.expedition_cards enable row level security;
create policy expedition_read on public.expeditions for select to anon,authenticated using(exists(select 1 from public.posts where posts.id=expeditions.id));
create policy expedition_admin on public.expeditions for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy needs_read on public.expedition_needs for select to anon,authenticated using(exists(select 1 from public.posts where id=expedition_id));
create policy needs_admin on public.expedition_needs for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy cards_read on public.expedition_cards for select to anon,authenticated using(exists(select 1 from public.posts where id=post_id));
create policy cards_admin on public.expedition_cards for all to authenticated using(public.is_admin()) with check(public.is_admin());
