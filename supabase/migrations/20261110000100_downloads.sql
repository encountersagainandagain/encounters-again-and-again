-- Files to download (Juani, 2026-11-10): a book as PDF or EPUB, offered from a Downloads block or beside a book's
-- cover. They live in the Media library with the images (served the same way, public once published content uses
-- them), are kept as uploaded (no conversion) and may weigh up to 50 MB; images keep their 10 MB limit in the admin.
update storage.buckets set file_size_limit=52428800,
  allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','application/pdf','application/epub+zip']
  where id='media';
alter table public.media drop constraint media_mime_type_check;
alter table public.media add constraint media_mime_type_check check(mime_type in ('image/jpeg','image/png','image/webp','image/gif','image/svg+xml','application/pdf','application/epub+zip'));
alter table public.media drop constraint media_bytes_check;
alter table public.media add constraint media_bytes_check check(bytes > 0 and bytes <= 52428800);

-- The Downloads block.
alter table public.post_blocks drop constraint post_blocks_type_check;
alter table public.post_blocks add constraint post_blocks_type_check check(type in ('heading','paragraph','image','image-pair','carousel','divider','youtube','embed','quote','link','stay','tour','costs','quick_facts','toc','list','faq','accordion','source','download'));

-- A book's free downloads, in order: [{media_id, label}].
alter table public.artworks add column downloads jsonb not null default '[]'::jsonb;

-- The files a published book offers are public like its images.
create or replace function public.media_is_published(media_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select
    exists(select 1 from public.post_media pm where pm.media_id=$1 and public.content_is_public(pm.post_id))
    or exists(select 1 from public.posts p where p.cover_id=$1 and public.content_is_public(p.id))
    or exists(select 1 from public.crew_members where portrait_id=$1 and status='published')
    or exists(select 1 from public.art_categories where cover_id=$1 and status='published')
    or exists(select 1 from public.artworks a where a.media_id=$1 and public.content_is_public(a.id))
    or exists(select 1 from public.artworks a where $1=any(a.images) and public.content_is_public(a.id))
    or exists(select 1 from public.artworks a where a.downloads::text like '%'||$1::text||'%' and public.content_is_public(a.id))
    or exists(select 1 from public.messages m where m.illustration_id=$1 and public.content_is_public(m.id))
    or exists(select 1 from public.expeditions e where e.underwater_id=$1 and public.content_is_public(e.id))
    or exists(select 1 from public.expedition_cards c where c.media_id=$1 and public.content_is_public(c.post_id))
    or exists(select 1 from public.workshop_sessions s where s.media_id=$1 and public.content_is_public(s.workshop_id))
    or exists(select 1 from public.upcoming_items u where u.media_id=$1 and u.status='published' and (u.post_id is null or public.content_is_public(u.post_id)))
    or exists(select 1 from public.site_settings s where s.status='published' and s.value::text like '%'||$1::text||'%')
$$;
