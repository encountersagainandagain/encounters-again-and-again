-- Announcements leave the database once they are over, as they leave Home (Juani, 2026-11-06): every night, just after
-- midnight in Perth, an announcement whose last day (or only day) has passed is deleted. One without dates stays until
-- someone unpublishes or deletes it. What it announced and its image stay.
create extension if not exists pg_cron with schema pg_catalog;
create or replace function public.delete_expired_announcements() returns integer
language sql security definer set search_path='' as $$
  with gone as (delete from public.upcoming_items where coalesce(ends_on,starts_on) < (now() at time zone 'Australia/Perth')::date returning 1)
  select count(*)::integer from gone;
$$;
revoke all on function public.delete_expired_announcements() from public,anon,authenticated;
-- 16:10 UTC is 00:10 in Perth (no daylight saving there).
select cron.schedule('delete-expired-announcements','10 16 * * *','select public.delete_expired_announcements()');
-- The ones already over go now.
select public.delete_expired_announcements();
