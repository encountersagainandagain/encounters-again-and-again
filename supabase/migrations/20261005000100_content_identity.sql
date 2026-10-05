-- A content record keeps its entity type; changing it would orphan typed details.
create function public.keep_content_kind() returns trigger language plpgsql set search_path='' as $$
begin
  if new.kind is distinct from old.kind then raise exception 'Content type cannot change; create a new record'; end if;
  return new;
end $$;
revoke all on function public.keep_content_kind() from public,anon,authenticated;
create trigger keep_content_kind before update of kind on public.posts for each row execute function public.keep_content_kind();

-- Crew profile references must point to crew content, independently of Auth accounts.
create function public.check_crew_page() returns trigger language plpgsql set search_path='' as $$
begin
  if new.page_post_id is not null and not exists(select 1 from public.posts where id=new.page_post_id and kind='crew_member') then
    raise exception 'Crew profile requires crew_member content';
  end if;
  return new;
end $$;
revoke all on function public.check_crew_page() from public,anon,authenticated;
create trigger check_crew_page before insert or update of page_post_id on public.crew_members for each row execute function public.check_crew_page();
