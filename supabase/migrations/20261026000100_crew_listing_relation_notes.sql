-- Crew members can leave The Crew page and its Home strip while their personal page stays at its address
-- (listed=false), and each related item of a page can carry a short comment, shown on personal pages.
-- Adds two columns with defaults; converts and deletes nothing. save_content is unchanged except that it saves note.
alter table public.crew_members add column listed boolean not null default true;
alter table public.post_relations add column note text not null default '' check (char_length(note)<=1000);

create or replace function public.save_content(
  p_post jsonb, p_blocks jsonb, p_details jsonb default null,
  p_contributors jsonb default null, p_relations jsonb default null,
  p_children jsonb default null, expected_updated_at timestamptz default null
) returns uuid language plpgsql set search_path='' as $$
declare pid uuid; p public.posts; b jsonb; detail_table text; child_table text; child_key text; v_stored_updated_at timestamptz;
begin
  if not public.is_admin() and coalesce(auth.role(),'')<>'service_role' then raise exception 'Admin required' using errcode='42501'; end if;
  pid := coalesce((p_post->>'id')::uuid,gen_random_uuid());
  select updated_at into v_stored_updated_at from public.posts where id=pid for update;
  if expected_updated_at is not null and v_stored_updated_at is distinct from expected_updated_at then raise exception 'Content changed; reload before saving' using errcode='40001'; end if;
  perform public.save_entity('posts',p_post||jsonb_build_object('id',pid));
  select * into p from public.posts where id=pid;
  if jsonb_typeof(p_blocks)<>'array' or jsonb_array_length(p_blocks)>1000 then raise exception 'Invalid blocks'; end if;
  delete from public.post_blocks where post_id=pid;
  for b in select value from jsonb_array_elements(p_blocks) loop
    insert into public.post_blocks(id,post_id,type,position,content,anchor,source_block_id)
    values(coalesce((b->>'id')::uuid,gen_random_uuid()),pid,b->>'type',(b->>'position')::integer,coalesce(b->'content','{}'),b->>'anchor',b->>'source_block_id');
  end loop;
  detail_table := case p.kind when 'expedition' then 'expeditions' when 'workshop' then 'workshops' when 'artwork' then 'artworks' when 'message' then 'messages' end;
  if p_details is not null and detail_table is not null then perform public.save_entity(detail_table,p_details||jsonb_build_object('id',pid)); end if;
  if p_contributors is not null then
    delete from public.post_contributors where post_id=pid;
    insert into public.post_contributors(post_id,crew_member_id,role,position)
    select pid,(value->>'crew_member_id')::uuid,coalesce(value->>'role',''),coalesce((value->>'position')::integer,0) from jsonb_array_elements(p_contributors);
  end if;
  if p_relations is not null then
    delete from public.post_relations where post_id=pid;
    insert into public.post_relations(post_id,related_post_id,relation,sort,note)
    select pid,(value->>'related_post_id')::uuid,coalesce(value->>'relation','related'),coalesce((value->>'sort')::integer,0),left(coalesce(value->>'note',''),1000) from jsonb_array_elements(p_relations);
  end if;
  if p_children is not null then
    child_table := case p.kind when 'expedition' then 'expedition_needs' when 'workshop' then 'workshop_sessions' end;
    child_key := case p.kind when 'expedition' then 'expedition_id' when 'workshop' then 'workshop_id' end;
    if child_table is null then raise exception 'Children not supported'; end if;
    execute format('delete from public.%I where %I=$1',child_table,child_key) using pid;
    for b in select value from jsonb_array_elements(p_children) loop perform public.save_entity(child_table,b||jsonb_build_object(child_key,pid)); end loop;
  end if;
  delete from public.post_media where post_id=pid;
  insert into public.post_media(post_id,media_id)
  select pid,m.id from public.media m where m.id=p.cover_id or p.cover_image like '%/api/media/'||m.id::text||'%'
    or exists(select 1 from public.post_blocks b where b.post_id=pid and b.content::text like '%'||m.id::text||'%');
  return pid;
end $$;
revoke all on function public.save_content(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,timestamptz) from public,anon;
grant execute on function public.save_content(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,timestamptz) to authenticated,service_role;
