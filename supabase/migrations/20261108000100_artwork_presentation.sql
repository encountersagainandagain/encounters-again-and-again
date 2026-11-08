-- How a work is shown on its page (Juani, 2026-11-07): an image, a series of images, a video, an audio or a book.
-- Empty: deduced from what the work has (a video or audio link, or else its image). A series and a book keep their
-- extra images in order (images); a book or any work can name its button (link_label, e.g. Get the book).
alter table public.artworks add column presentation text check(presentation in ('image','series','video','audio','book'));
alter table public.artworks add column images uuid[] not null default '{}';
alter table public.artworks add column link_label text;

-- The extra images of a published work are public like its main image.
create or replace function public.media_is_published(media_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select
    exists(select 1 from public.post_media pm where pm.media_id=$1 and public.content_is_public(pm.post_id))
    or exists(select 1 from public.posts p where p.cover_id=$1 and public.content_is_public(p.id))
    or exists(select 1 from public.crew_members where portrait_id=$1 and status='published')
    or exists(select 1 from public.art_categories where cover_id=$1 and status='published')
    or exists(select 1 from public.artworks a where a.media_id=$1 and public.content_is_public(a.id))
    or exists(select 1 from public.artworks a where $1=any(a.images) and public.content_is_public(a.id))
    or exists(select 1 from public.messages m where m.illustration_id=$1 and public.content_is_public(m.id))
    or exists(select 1 from public.expeditions e where e.underwater_id=$1 and public.content_is_public(e.id))
    or exists(select 1 from public.expedition_cards c where c.media_id=$1 and public.content_is_public(c.post_id))
    or exists(select 1 from public.workshop_sessions s where s.media_id=$1 and public.content_is_public(s.workshop_id))
    or exists(select 1 from public.upcoming_items u where u.media_id=$1 and u.status='published' and (u.post_id is null or public.content_is_public(u.post_id)))
    or exists(select 1 from public.site_settings s where s.status='published' and s.value::text like '%'||$1::text||'%')
$$;
