-- PASO 4: category/profile publication gates must also protect REST and Storage.
-- No editorial rows are modified. Existing RLS/admin authorization is retained.
alter table public.art_categories add column featured boolean not null default false;

create function public.content_is_public(content_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.posts p where p.id=$1 and p.status='published'
    and (p.kind<>'artwork' or exists(select 1 from public.artworks a join public.art_categories c on c.id=a.category_id where a.id=p.id and c.status='published'))
    and (p.kind<>'crew_member' or exists(select 1 from public.crew_members c where c.page_post_id=p.id and c.status='published' and c.has_page)))
$$;
revoke all on function public.content_is_public(uuid) from public;
grant execute on function public.content_is_public(uuid) to anon,authenticated,service_role;
alter policy posts_read on public.posts using(public.content_is_public(id) or public.is_admin());

create or replace function public.media_is_published(media_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select
    exists(select 1 from public.post_media pm where pm.media_id=$1 and public.content_is_public(pm.post_id))
    or exists(select 1 from public.posts p where p.cover_id=$1 and public.content_is_public(p.id))
    or exists(select 1 from public.crew_members where portrait_id=$1 and status='published')
    or exists(select 1 from public.art_categories where cover_id=$1 and status='published')
    or exists(select 1 from public.artworks a where a.media_id=$1 and public.content_is_public(a.id))
    or exists(select 1 from public.messages m where m.illustration_id=$1 and public.content_is_public(m.id))
    or exists(select 1 from public.expeditions e where e.underwater_id=$1 and public.content_is_public(e.id))
    or exists(select 1 from public.expedition_cards c where c.media_id=$1 and public.content_is_public(c.post_id))
    or exists(select 1 from public.workshop_sessions s where s.media_id=$1 and public.content_is_public(s.workshop_id))
    or exists(select 1 from public.upcoming_items u where u.media_id=$1 and u.status='published' and (u.post_id is null or public.content_is_public(u.post_id)))
    or exists(select 1 from public.site_settings s where s.status='published' and s.value::text like '%'||$1::text||'%')
$$;

-- Create the optional profile and attach it in one transaction; no Auth account.
create function public.create_crew_profile(member_id uuid) returns uuid
language plpgsql set search_path='' as $$
declare member public.crew_members; pid uuid;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  select * into member from public.crew_members where id=member_id for update;
  if not found then raise exception 'Crew member not found'; end if;
  if member.page_post_id is not null then return member.page_post_id; end if;
  pid:=gen_random_uuid();
  perform public.save_content(jsonb_build_object('id',pid,'kind','crew_member','title',coalesce(nullif(member.alias,''),member.name),'slug',member.slug||'-profile-'||left(pid::text,8),'status','draft','cover_id',member.portrait_id,'kicker',coalesce(member.role,'')),
    jsonb_build_array(jsonb_build_object('type','paragraph','position',0,'content',jsonb_build_object('text',member.bio))));
  update public.crew_members set page_post_id=pid,has_page=true where id=member.id;
  return pid;
end $$;
revoke all on function public.create_crew_profile(uuid) from public,anon;
grant execute on function public.create_crew_profile(uuid) to authenticated;

-- Preserve old paths automatically, including paths affected by category moves.
create function public.art_crew_route_history() returns trigger
language plpgsql set search_path='' as $$
declare old_route text; new_route text; item record; category_slug text;
begin
  if tg_table_name='posts' then
    if new.kind<>'artwork' or old.slug=new.slug then return new; end if;
    select c.slug into category_slug from public.artworks a join public.art_categories c on c.id=a.category_id where a.id=new.id;
    if category_slug is not null then
      old_route:='/art/'||category_slug||'/'||old.slug; new_route:='/art/'||category_slug||'/'||new.slug;
      update public.route_history set new_path=new_route where post_id=new.id;
      insert into public.route_history(old_path,new_path,post_id) values(old_route,new_route,new.id) on conflict(old_path) do update set new_path=excluded.new_path,post_id=excluded.post_id;
    end if;
  elsif tg_table_name='crew_members' then
    if old.slug=new.slug then return new; end if;
    old_route:='/crew/'||old.slug; new_route:='/crew/'||new.slug;
    update public.route_history set new_path=new_route where new_path=old_route;
    insert into public.route_history(old_path,new_path,post_id) values(old_route,new_route,new.page_post_id) on conflict(old_path) do update set new_path=excluded.new_path,post_id=excluded.post_id;
  elsif tg_table_name='artworks' then
    if old.category_id=new.category_id then return new; end if;
    select '/art/'||c.slug||'/'||p.slug into old_route from public.art_categories c,public.posts p where c.id=old.category_id and p.id=new.id;
    select '/art/'||c.slug||'/'||p.slug into new_route from public.art_categories c,public.posts p where c.id=new.category_id and p.id=new.id;
    update public.route_history set new_path=new_route where post_id=new.id;
    insert into public.route_history(old_path,new_path,post_id) values(old_route,new_route,new.id) on conflict(old_path) do update set new_path=excluded.new_path,post_id=excluded.post_id;
  elsif tg_table_name='art_categories' then
    if old.slug=new.slug then return new; end if;
    old_route:='/art/'||old.slug;new_route:='/art/'||new.slug;
    update public.route_history set new_path=new_route where new_path=old_route;
    insert into public.route_history(old_path,new_path) values(old_route,new_route) on conflict(old_path) do update set new_path=excluded.new_path;
    for item in select p.id,p.slug from public.posts p join public.artworks a on a.id=p.id where a.category_id=new.id loop
      new_route:='/art/'||new.slug||'/'||item.slug;
      update public.route_history set new_path=new_route where post_id=item.id;
      insert into public.route_history(old_path,new_path,post_id) values('/art/'||old.slug||'/'||item.slug,new_route,item.id) on conflict(old_path) do update set new_path=excluded.new_path,post_id=excluded.post_id;
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.art_crew_route_history() from public,anon,authenticated;
create trigger art_slug_history after update of slug on public.posts for each row execute function public.art_crew_route_history();
create trigger crew_slug_history after update of slug on public.crew_members for each row execute function public.art_crew_route_history();
create trigger category_slug_history after update of slug on public.art_categories for each row execute function public.art_crew_route_history();
create trigger artwork_category_history after update of category_id on public.artworks for each row execute function public.art_crew_route_history();

-- Read-only resolver exposes only redirects into the two completed, public families.
create function public.resolve_editorial_route(path text) returns text
language sql stable security definer set search_path='' as $$
  select h.new_path from public.route_history h where h.old_path=$1 and h.new_path<>h.old_path and (
    h.new_path='/crew'
    or exists(select 1 from public.crew_members c where h.new_path='/crew/'||c.slug and c.status='published' and c.has_page and public.content_is_public(c.page_post_id))
    or exists(select 1 from public.art_categories c where h.new_path='/art/'||c.slug and c.status='published')
    or exists(select 1 from public.artworks a join public.posts p on p.id=a.id join public.art_categories c on c.id=a.category_id where h.new_path='/art/'||c.slug||'/'||p.slug and public.content_is_public(p.id))
  ) limit 1
$$;
revoke all on function public.resolve_editorial_route(text) from public;
grant execute on function public.resolve_editorial_route(text) to anon,authenticated,service_role;
