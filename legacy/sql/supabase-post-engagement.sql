-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: post "was this helpful" likes and public comments
-- Paste this in Supabase SQL Editor after docs/supabase-admin-security.sql.
-- Requires public.set_updated_at() and public.is_admin(), created earlier
-- in docs/supabase-posts.sql and docs/supabase-admin-security.sql.

create table if not exists public.post_likes (
  post_slug text primary key,
  like_count integer not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_post_likes_updated_at on public.post_likes;
create trigger set_post_likes_updated_at
before update on public.post_likes
for each row
execute function public.set_updated_at();

alter table public.post_likes enable row level security;

drop policy if exists "Anyone can read post likes" on public.post_likes;
create policy "Anyone can read post likes"
on public.post_likes
for select
to anon, authenticated
using (true);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null,
  author_name text not null default 'Anonymous',
  comment_text text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_slug_created_idx
on public.post_comments(post_slug, created_at desc);

alter table public.post_comments enable row level security;

drop policy if exists "Anyone can read visible post comments" on public.post_comments;
create policy "Anyone can read visible post comments"
on public.post_comments
for select
to anon, authenticated
using (is_hidden = false);

drop policy if exists "Admins can read all post comments" on public.post_comments;
create policy "Admins can read all post comments"
on public.post_comments
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can moderate post comments" on public.post_comments;
create policy "Admins can moderate post comments"
on public.post_comments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete post comments" on public.post_comments;
create policy "Admins can delete post comments"
on public.post_comments
for delete
to authenticated
using (public.is_admin());

-- Writes only go through the security-definer functions below so every
-- like/comment gets the same validation regardless of caller.

create or replace function public.increment_post_like(target_slug text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_slug text;
  result integer;
begin
  normalized_slug := left(lower(trim(target_slug)), 200);

  if normalized_slug = '' then
    raise exception 'Missing post slug';
  end if;

  insert into public.post_likes (post_slug, like_count)
  values (normalized_slug, 1)
  on conflict (post_slug) do update
  set like_count = post_likes.like_count + 1,
      updated_at = now()
  returning like_count into result;

  return result;
end;
$$;

create or replace function public.add_post_comment(
  target_slug text,
  commenter_name text,
  comment_body text
)
returns table (
  id uuid,
  post_slug text,
  author_name text,
  comment_text text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_slug text;
  normalized_name text;
  normalized_comment text;
begin
  normalized_slug := left(lower(trim(target_slug)), 200);
  normalized_name := left(coalesce(nullif(trim(commenter_name), ''), 'Anonymous'), 60);
  normalized_comment := trim(comment_body);

  if normalized_slug = '' then
    raise exception 'Missing post slug';
  end if;

  if normalized_comment = '' then
    raise exception 'Comment cannot be empty';
  end if;

  if length(normalized_comment) > 2000 then
    raise exception 'Comment is too long';
  end if;

  return query
  insert into public.post_comments (post_slug, author_name, comment_text)
  values (normalized_slug, normalized_name, normalized_comment)
  returning
    post_comments.id,
    post_comments.post_slug,
    post_comments.author_name,
    post_comments.comment_text,
    post_comments.created_at;
end;
$$;

revoke all on public.post_likes from anon, authenticated;
grant select on public.post_likes to anon, authenticated;

revoke all on public.post_comments from anon, authenticated;
grant select on public.post_comments to anon, authenticated;
grant update, delete on public.post_comments to authenticated;

grant execute on function public.increment_post_like(text) to anon, authenticated;
grant execute on function public.add_post_comment(text, text, text) to anon, authenticated;
