-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: newsletter subscribers
-- Paste this in Supabase SQL Editor after docs/supabase-admin-security.sql.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  source text not null default 'unknown',
  unsubscribe_token uuid not null default gen_random_uuid(),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_unsubscribe_token_idx
on public.newsletter_subscribers(unsubscribe_token);

create index if not exists newsletter_subscribers_status_idx
on public.newsletter_subscribers(status);

drop trigger if exists set_newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger set_newsletter_subscribers_updated_at
before update on public.newsletter_subscribers
for each row
execute function public.set_updated_at();

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Admins can read newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins can read newsletter subscribers"
on public.newsletter_subscribers
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins can update newsletter subscribers"
on public.newsletter_subscribers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.subscribe_to_newsletter(
  subscriber_email text,
  subscriber_source text default 'unknown'
)
returns table (
  email text,
  status text,
  unsubscribe_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  normalized_source text;
begin
  normalized_email := lower(trim(subscriber_email));
  normalized_source := left(coalesce(nullif(trim(subscriber_source), ''), 'unknown'), 80);

  if normalized_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Invalid email address';
  end if;

  insert into public.newsletter_subscribers (
    email,
    status,
    source,
    unsubscribe_token,
    subscribed_at,
    unsubscribed_at
  )
  values (
    normalized_email,
    'subscribed',
    normalized_source,
    gen_random_uuid(),
    now(),
    null
  )
  on conflict on constraint newsletter_subscribers_email_key do update
  set
    status = 'subscribed',
    source = excluded.source,
    subscribed_at = now(),
    unsubscribed_at = null
  returning
    newsletter_subscribers.email,
    newsletter_subscribers.status,
    newsletter_subscribers.unsubscribe_token
  into
    email,
    status,
    unsubscribe_token;

  return next;
end;
$$;

create or replace function public.unsubscribe_from_newsletter(token uuid)
returns table (
  email text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.newsletter_subscribers
  set
    status = 'unsubscribed',
    unsubscribed_at = now()
  where unsubscribe_token = token
  returning
    newsletter_subscribers.email,
    newsletter_subscribers.status
  into
    email,
    status;

  if email is null then
    raise exception 'Subscriber not found';
  end if;

  return next;
end;
$$;

revoke all on public.newsletter_subscribers from anon, authenticated;
grant select, update on public.newsletter_subscribers to authenticated;

grant execute on function public.subscribe_to_newsletter(text, text) to anon, authenticated;
grant execute on function public.unsubscribe_from_newsletter(uuid) to anon, authenticated;
