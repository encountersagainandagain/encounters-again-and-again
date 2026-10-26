-- The previous migration must not mark a fully legacy profile as explicit merely
-- by adding its title: the editor still needs to convert all of its old blocks.
delete from public.post_blocks title
where title.content->>'layout' = 'profile-title'
and not exists (
  select 1 from public.post_blocks explicit
  where explicit.post_id = title.post_id
    and explicit.id <> title.id
    and explicit.content->>'layout' like 'profile-%'
);

update public.post_blocks b
set position = b.position + 100000
where b.position > 0
and exists (
  select 1 from public.posts p
  where p.id = b.post_id and p.kind = 'crew_member'
)
and not exists (
  select 1 from public.post_blocks explicit
  where explicit.post_id = b.post_id and explicit.content->>'layout' like 'profile-%'
);

update public.post_blocks b
set position = b.position - 100001
where b.position >= 100000
and exists (
  select 1 from public.posts p
  where p.id = b.post_id and p.kind = 'crew_member'
)
and not exists (
  select 1 from public.post_blocks explicit
  where explicit.post_id = b.post_id and explicit.content->>'layout' like 'profile-%'
);
