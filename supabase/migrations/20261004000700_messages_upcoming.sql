create table public.messages (
  id uuid primary key references public.posts(id) on delete cascade,
  message text not null default '', body text not null default '', illustration_id uuid references public.media(id), credit text
);
create table public.upcoming_items (
  id uuid primary key default gen_random_uuid(), post_id uuid unique references public.posts(id) on delete cascade,
  title text, body text, starts_on date, media_id uuid references public.media(id),
  status public.content_status not null default 'draft', sort integer not null default 0,
  check(post_id is not null or length(trim(title))>0)
);
alter table public.messages enable row level security;
alter table public.upcoming_items enable row level security;
create policy messages_read on public.messages for select to anon,authenticated using(exists(select 1 from public.posts where posts.id=messages.id));
create policy messages_admin on public.messages for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy upcoming_read on public.upcoming_items for select to anon,authenticated using(public.is_admin() or (status='published' and (post_id is null or exists(select 1 from public.posts where posts.id=post_id and posts.status='published'))));
create policy upcoming_admin on public.upcoming_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
