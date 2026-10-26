-- Personal pages start with the two opening units of the profile template. Existing
-- pages that still lack the title receive it once; editors can remove it afterwards.
update public.post_blocks b
set position = b.position + 100000
where exists (
  select 1 from public.posts p
  where p.id = b.post_id and p.kind = 'crew_member'
)
and not exists (
  select 1 from public.post_blocks title
  where title.post_id = b.post_id and title.content->>'layout' = 'profile-title'
);

update public.post_blocks b
set position = b.position - 99999
where b.position >= 100000
and exists (
  select 1 from public.posts p
  where p.id = b.post_id and p.kind = 'crew_member'
)
and not exists (
  select 1 from public.post_blocks title
  where title.post_id = b.post_id and title.content->>'layout' = 'profile-title'
);

insert into public.post_blocks (post_id, type, position, content)
select p.id, 'heading', 0,
  jsonb_build_object('layout','profile-title','text','meet '||lower(split_part(trim(c.name),' ',1)))
from public.posts p
join public.crew_members c on c.page_post_id = p.id
where p.kind = 'crew_member'
and not exists (
  select 1 from public.post_blocks b
  where b.post_id = p.id and b.content->>'layout' = 'profile-title'
);

create or replace function public.create_crew_profile(member_id uuid) returns uuid
language plpgsql set search_path='' as $$
declare member public.crew_members; pid uuid;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  select * into member from public.crew_members where id=member_id for update;
  if not found then raise exception 'Crew member not found'; end if;
  if member.page_post_id is not null then return member.page_post_id; end if;
  pid:=gen_random_uuid();
  perform public.save_content(
    jsonb_build_object('id',pid,'kind','crew_member','title',coalesce(nullif(member.alias,''),member.name),'slug',member.slug||'-profile-'||left(pid::text,8),'status','draft','cover_id',member.portrait_id,'kicker',coalesce(member.role,'')),
    jsonb_build_array(
      jsonb_build_object('type','heading','position',0,'content',jsonb_build_object('layout','profile-title','text','meet '||lower(split_part(trim(member.name),' ',1)))),
      jsonb_build_object('type','paragraph','position',1,'content',jsonb_build_object('layout','profile-intro','paragraphs',jsonb_build_array(jsonb_build_object('text',coalesce(member.bio,''),'style','lead'))))
    )
  );
  update public.crew_members set page_post_id=pid,has_page=true where id=member.id;
  return pid;
end $$;
revoke all on function public.create_crew_profile(uuid) from public,anon;
grant execute on function public.create_crew_profile(uuid) to authenticated;
