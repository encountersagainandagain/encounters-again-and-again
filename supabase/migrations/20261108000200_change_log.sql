-- Who changed what (Juani, 2026-11-08): every create, edit and delete of content, Crew, art categories, announcements,
-- images and settings is recorded with the signed-in account that made it. Changes without an account (database
-- maintenance, the nightly clean-up of announcements) are recorded with no user and shown as “System”.
create table public.change_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null check(action in ('created','edited','deleted')),
  table_name text not null,
  row_id text,
  kind text,
  title text
);
create index change_log_at on public.change_log(at desc);
create index change_log_row on public.change_log(table_name,row_id,at desc);
alter table public.change_log enable row level security;
create policy change_log_admin_read on public.change_log for select to authenticated using(public.is_admin());
revoke all on public.change_log from anon;
revoke insert,update,delete on public.change_log from authenticated;

create function public.log_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare r jsonb; act text; label text; changed text;
begin
  if tg_op='DELETE' then r:=to_jsonb(old);act:='deleted';
  elsif tg_op='INSERT' then r:=to_jsonb(new);act:='created';
  else
    r:=to_jsonb(new);act:='edited';
    -- A save that changed nothing but its timestamp is not a change.
    if (to_jsonb(new)-'updated_at')=(to_jsonb(old)-'updated_at') then return new; end if;
  end if;
  if tg_table_name='site_settings' then
    -- Settings live in one row: name the parts that changed (a page of Page settings, Home, or general settings).
    select string_agg(case when k='pages' then coalesce((select string_agg(p,', ') from jsonb_object_keys(coalesce(new.value->'pages','{}'::jsonb)) p
        where (new.value->'pages'->p) is distinct from (old.value->'pages'->p)),'pages') else k end,', ')
      into changed from jsonb_object_keys(coalesce(new.value,'{}'::jsonb)) k where tg_op='UPDATE' and (new.value->k) is distinct from (old.value->k);
    label:=coalesce(nullif(changed,''),'settings');
  else
    label:=coalesce(nullif(r->>'title',''),nullif(r->>'name',''),nullif(r->>'alt',''),'Untitled');
  end if;
  insert into public.change_log(user_id,action,table_name,row_id,kind,title)
    values((select auth.uid()),act,tg_table_name,coalesce(r->>'id',r->>'key'),r->>'kind',left(label,200));
  return coalesce(new,old);
end $$;
revoke all on function public.log_change() from public,anon,authenticated;

create trigger log_posts after insert or update or delete on public.posts for each row execute function public.log_change();
create trigger log_crew after insert or update or delete on public.crew_members for each row execute function public.log_change();
create trigger log_categories after insert or update or delete on public.art_categories for each row execute function public.log_change();
create trigger log_announcements after insert or update or delete on public.upcoming_items for each row execute function public.log_change();
create trigger log_media after insert or update or delete on public.media for each row execute function public.log_change();
create trigger log_settings after insert or update or delete on public.site_settings for each row execute function public.log_change();

-- The admin shows each change with the email of who made it: only administrators can read that list.
create function public.admin_people() returns table(user_id uuid, email text)
language sql stable security definer set search_path='' as $$
  select a.user_id, u.email::text from public.admin_users a join auth.users u on u.id=a.user_id where public.is_admin()
$$;
revoke all on function public.admin_people() from public,anon;
grant execute on function public.admin_people() to authenticated;
