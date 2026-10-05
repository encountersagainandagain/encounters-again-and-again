-- All writes remain subject to RLS. Identifier allowlist prevents arbitrary table writes.
create function public.save_entity(entity text, payload jsonb) returns uuid
language plpgsql set search_path='' as $$
declare entity_id uuid := coalesce((payload->>'id')::uuid,gen_random_uuid()); cols text; vals text; updates text;
begin
  if not public.is_admin() and coalesce(auth.role(),'')<>'service_role' then raise exception 'Admin required' using errcode='42501'; end if;
  if entity not in ('posts','crew_members','art_categories','expeditions','expedition_needs','expedition_cards','workshops','workshop_sessions','artworks','messages','upcoming_items','media') then raise exception 'Unknown entity'; end if;
  payload := (payload - 'created_at' - 'updated_at' - 'created_by') || jsonb_build_object('id',entity_id);
  select string_agg(format('%I',c.column_name),','),string_agg(format('r.%I',c.column_name),','),
    string_agg(format('%I=excluded.%I',c.column_name,c.column_name),',') filter(where c.column_name<>'id')
  into cols,vals,updates from information_schema.columns c
  where c.table_schema='public' and c.table_name=entity and payload ? c.column_name;
  if (select count(*) from jsonb_object_keys(payload)) <> (select count(*) from information_schema.columns c where c.table_schema='public' and c.table_name=entity and payload ? c.column_name) then raise exception 'Unknown field'; end if;
  execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) r on conflict(id) do update set %s',entity,cols,vals,entity,coalesce(updates,'id=excluded.id')) using payload;
  return entity_id;
end $$;
revoke all on function public.save_entity(text,jsonb) from public,anon;
grant execute on function public.save_entity(text,jsonb) to authenticated,service_role;

create function public.save_content(
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
    insert into public.post_relations(post_id,related_post_id,relation,sort)
    select pid,(value->>'related_post_id')::uuid,coalesce(value->>'relation','related'),coalesce((value->>'sort')::integer,0) from jsonb_array_elements(p_relations);
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

create function public.check_content_kind() returns trigger language plpgsql set search_path='' as $$
declare actual text; expected text;
begin
  expected := case tg_table_name when 'expeditions' then 'expedition' when 'workshops' then 'workshop' when 'artworks' then 'artwork' when 'messages' then 'message' end;
  select kind into actual from public.posts where id=new.id;
  if actual is distinct from expected then raise exception 'Content kind mismatch'; end if;
  return new;
end $$;
revoke all on function public.check_content_kind() from public,anon,authenticated;
create function public.check_relation_kind() returns trigger language plpgsql set search_path='' as $$
declare source_kind text; target_kind text;
begin
  select kind into source_kind from public.posts where id=new.post_id;
  select kind into target_kind from public.posts where id=new.related_post_id;
  if new.relation='result' and not(source_kind in ('expedition','workshop') and target_kind in ('news','expedition_report','workshop_report')) then raise exception 'Results require an activity and a report'; end if;
  return new;
end $$;
revoke all on function public.check_relation_kind() from public,anon,authenticated;
create trigger check_relation before insert or update on public.post_relations for each row execute function public.check_relation_kind();

do $$ declare t text; begin
  foreach t in array array['expeditions','workshops','artworks','messages'] loop
    execute format('create trigger check_kind before insert or update on public.%I for each row execute function public.check_content_kind()',t);
  end loop;
  foreach t in array array['posts','post_blocks','site_settings','media','crew_members','art_categories','newsletter_subscribers'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
  end loop;
  foreach t in array array['posts','post_blocks','post_media','post_relations','post_contributors','route_history','site_settings','media','crew_members','art_categories','artworks','expeditions','expedition_needs','expedition_cards','workshops','workshop_sessions','messages','upcoming_items'] loop
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to anon',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
create index posts_public_order on public.posts(kind,status,sort,published_at desc);
create index post_media_media_idx on public.post_media(media_id);
create index contributors_crew_idx on public.post_contributors(crew_member_id);
create index related_posts_idx on public.post_relations(related_post_id);
create index artwork_category_idx on public.artworks(category_id);
create index needs_order_idx on public.expedition_needs(expedition_id,sort);
create index sessions_order_idx on public.workshop_sessions(workshop_id,sort);
create index cards_order_idx on public.expedition_cards(post_id,sort);
create index newsletter_status_idx on public.newsletter_subscribers(status);
