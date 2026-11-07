-- Changing the address (slug) of an expedition, a workshop, a story in Results or a message keeps the old address
-- working: it is recorded in route_history and sends visitors to the new one, as works, categories and Crew already do.
-- Older addresses that pointed to the old one follow it to the new one too. Only published pages are redirected to.
create function public.post_route_history() returns trigger
language plpgsql set search_path='' as $$
declare prefix text; old_route text; new_route text;
begin
  if old.slug=new.slug then return new; end if;
  prefix:=case new.kind when 'expedition' then '/expeditions/' when 'workshop' then '/workshops/' when 'message' then '/meaningful-messages/'
    when 'expedition_report' then '/posts/' when 'workshop_report' then '/posts/' when 'news' then '/posts/' else null end;
  if prefix is null then return new; end if;
  old_route:=prefix||old.slug;new_route:=prefix||new.slug;
  update public.route_history set new_path=new_route where new_path=old_route;
  insert into public.route_history(old_path,new_path,post_id) values(old_route,new_route,new.id) on conflict(old_path) do update set new_path=excluded.new_path,post_id=excluded.post_id;
  return new;
end $$;
create trigger post_slug_history after update of slug on public.posts for each row execute function public.post_route_history();

create or replace function public.resolve_editorial_route(path text) returns text
language sql stable security definer set search_path='' as $$
  select h.new_path from public.route_history h where h.old_path=$1 and h.new_path<>h.old_path and (
    h.new_path='/crew'
    or exists(select 1 from public.crew_members c where h.new_path='/crew/'||c.slug and c.status='published' and c.has_page and public.content_is_public(c.page_post_id))
    or exists(select 1 from public.art_categories c where h.new_path='/art/'||c.slug and c.status='published')
    or exists(select 1 from public.artworks a join public.posts p on p.id=a.id join public.art_categories c on c.id=a.category_id where h.new_path='/art/'||c.slug||'/'||p.slug and public.content_is_public(p.id))
    or exists(select 1 from public.posts p where public.content_is_public(p.id) and h.new_path=(case p.kind when 'expedition' then '/expeditions/' when 'workshop' then '/workshops/' when 'message' then '/meaningful-messages/'
      when 'expedition_report' then '/posts/' when 'workshop_report' then '/posts/' when 'news' then '/posts/' end)||p.slug)
  ) limit 1
$$;
