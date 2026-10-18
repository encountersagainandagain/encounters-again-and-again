-- The Crew page with explicit, editable sections (The Crew.dc.html).
-- Crew cards get their own fields for the highlighted line and the favourite animal, and the blocks of
-- the Team page say which section of the page they belong to. Until now the page deduced these from
-- the text (a "Title: kicker" split, the words "Above all", a "Favourite animal: value" split).
-- The conversion below runs once, only where the new fields are still empty, and keeps every text.

alter table public.crew_members
  add column if not exists highlight text,
  add column if not exists favourite_animal text;

comment on column public.crew_members.highlight is 'Line shown in italics under the biography on The Crew page.';
comment on column public.crew_members.favourite_animal is 'Shown as “Favourite animal” on The Crew page.';

update public.crew_members
set highlight = btrim(substr(bio, strpos(bio, 'Above all'))),
    bio = btrim(substr(bio, 1, strpos(bio, 'Above all') - 1))
where highlight is null and strpos(bio, 'Above all') > 1;

update public.crew_members
set favourite_animal = btrim(substr(quote, strpos(quote, ':') + 1)),
    quote = null
where favourite_animal is null and quote ~* '^\s*favou?rite animal\s*:';

-- Team page blocks. content.section: opening | story | pair | project | extra (absent: not shown).
-- content.style for paragraphs: lead | body | aside (continues the previous line in italics) | closing.
do $$
declare
  p record; b record; item jsonb; out jsonb; paras jsonb; para text; n int; i int; pos int; style text;
begin
  for p in select id from public.posts where source_role = 'team' loop
    if exists (select 1 from public.post_blocks where post_id = p.id and content ? 'section') then
      continue;
    end if;
    out := '[]';
    for b in select * from public.post_blocks where post_id = p.id order by position loop
      paras := case when jsonb_typeof(b.content->'paragraphs') = 'array' then b.content->'paragraphs'
                    else jsonb_build_array(coalesce(b.content->>'text', '')) end;
      if b.source_block_id = 'team_002' then
        out := out || jsonb_build_array(jsonb_build_object('id', b.id, 'type', 'heading', 'source', b.source_block_id,
          'content', jsonb_build_object('text', btrim(split_part(paras->>0, ':', 1)), 'section', 'opening')));
        if strpos(paras->>0, ':') > 0 then
          out := out || jsonb_build_array(jsonb_build_object('type', 'heading', 'source', b.source_block_id || '_kicker',
            'content', jsonb_build_object('text', regexp_replace(btrim(substr(paras->>0, strpos(paras->>0, ':') + 1)), '\.$', ''), 'section', 'story')));
        end if;
      elsif b.source_block_id = 'team_004' then
        n := jsonb_array_length(paras); i := 0;
        for para in select value from jsonb_array_elements_text(paras) loop
          style := case when i = 0 then 'lead' when para ~ '^[—–]' then 'aside' when i = n - 1 and n > 2 then 'closing' else 'body' end;
          out := out || jsonb_build_array(jsonb_build_object('id', case when i = 0 then b.id end, 'type', 'paragraph',
            'source', b.source_block_id || case when i = 0 then '' else '_' || i end,
            'content', jsonb_build_object('text', para, 'section', 'story', 'style', style)));
          i := i + 1;
        end loop;
      elsif b.source_block_id in ('team_003', 'team_005') then
        out := out || jsonb_build_array(jsonb_build_object('id', b.id, 'type', b.type, 'source', b.source_block_id, 'anchor', b.anchor,
          'content', b.content || '{"section":"pair"}'));
      elsif b.source_block_id = 'team_006' then
        n := jsonb_array_length(paras); i := 0;
        for para in select value from jsonb_array_elements_text(paras) loop
          out := out || jsonb_build_array(jsonb_build_object('id', case when i = 0 then b.id end,
            'type', case when i = n - 1 and n > 1 then 'heading' else 'paragraph' end,
            'source', b.source_block_id || case when i = 0 then '' else '_' || i end,
            'content', jsonb_build_object('text', para, 'section', 'project', 'style', case when i = 0 and n > 2 then 'lead' else 'body' end)));
          i := i + 1;
        end loop;
      else
        -- Other imported blocks (the biographies now kept in Crew) stay as they are and are not shown.
        out := out || jsonb_build_array(jsonb_build_object('id', b.id, 'type', b.type, 'source', b.source_block_id, 'anchor', b.anchor, 'content', b.content));
      end if;
    end loop;
    delete from public.post_blocks where post_id = p.id;
    pos := 0;
    for item in select value from jsonb_array_elements(out) loop
      insert into public.post_blocks (id, post_id, type, position, content, anchor, source_block_id)
      values (coalesce((item->>'id')::uuid, gen_random_uuid()), p.id, item->>'type', pos, item->'content', item->>'anchor', item->>'source');
      pos := pos + 1;
    end loop;
    update public.posts set kicker = 'Meet the team' where id = p.id and kicker = '';
  end loop;
end $$;
