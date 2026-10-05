create function public.media_is_published(media_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select
    exists(select 1 from public.post_media pm join public.posts p on p.id=pm.post_id where pm.media_id=$1 and p.status='published')
    or exists(select 1 from public.posts where cover_id=$1 and status='published')
    or exists(select 1 from public.crew_members where portrait_id=$1 and status='published')
    or exists(select 1 from public.art_categories where cover_id=$1 and status='published')
    or exists(select 1 from public.artworks a join public.posts p on p.id=a.id where a.media_id=$1 and p.status='published')
    or exists(select 1 from public.messages m join public.posts p on p.id=m.id where m.illustration_id=$1 and p.status='published')
    or exists(select 1 from public.expeditions e join public.posts p on p.id=e.id where e.underwater_id=$1 and p.status='published')
    or exists(select 1 from public.expedition_cards c join public.posts p on p.id=c.post_id where c.media_id=$1 and p.status='published')
    or exists(select 1 from public.workshop_sessions s join public.posts p on p.id=s.workshop_id where s.media_id=$1 and p.status='published')
    or exists(select 1 from public.upcoming_items u where u.media_id=$1 and u.status='published' and (u.post_id is null or exists(select 1 from public.posts p where p.id=u.post_id and p.status='published')))
    or exists(select 1 from public.site_settings s where s.status='published' and s.value::text like '%'||$1::text||'%')
$$;
revoke all on function public.media_is_published(uuid) from public;
grant execute on function public.media_is_published(uuid) to anon,authenticated,service_role;
create policy media_read on public.media for select to anon,authenticated using(public.media_is_published(id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('media','media',false,10485760,array['image/jpeg','image/png','image/webp','image/gif']);
create policy encounters_media_read on storage.objects for select to anon,authenticated using(
  bucket_id='media' and (public.is_admin() or exists(select 1 from public.media m where m.storage_path=name and public.media_is_published(m.id)))
);
create policy encounters_media_insert on storage.objects for insert to authenticated with check(
  bucket_id='media' and public.is_admin() and (storage.foldername(name))[1] in ('crew','expeditions','workshops','art','posts','settings')
);
create policy encounters_media_update on storage.objects for update to authenticated
using(bucket_id='media' and public.is_admin()) with check(bucket_id='media' and public.is_admin());
create policy encounters_media_delete on storage.objects for delete to authenticated using(bucket_id='media' and public.is_admin());
