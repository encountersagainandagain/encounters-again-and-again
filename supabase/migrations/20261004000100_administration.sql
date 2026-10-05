create extension if not exists pgcrypto with schema extensions;

create function public.set_updated_at() returns trigger language plpgsql
set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant all on public.admin_users to service_role;

create function public.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = (select auth.uid()))
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create type public.content_status as enum ('draft', 'published');
create type public.activity_status as enum ('upcoming','running','finished','postponed','cancelled');
