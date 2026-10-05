create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(), email text not null unique check(email=lower(trim(email))),
  status text not null default 'subscribed' check(status in ('subscribed','unsubscribed')),
  source text not null, consent_at timestamptz not null default now(), consent_version text not null default 'newsletter-v1',
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  subscribed_at timestamptz not null default now(), unsubscribed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon,authenticated;
grant select,update,delete on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;
create policy newsletter_admin on public.newsletter_subscribers for all to authenticated using(public.is_admin()) with check(public.is_admin());

create function public.subscribe_to_newsletter(subscriber_email text, subscriber_source text default 'unknown', consent boolean default false)
returns boolean language plpgsql security definer set search_path='' as $$
declare normalized text := lower(trim(subscriber_email));
begin
  if not consent or length(normalized)>160 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Valid email and consent required'; end if;
  insert into public.newsletter_subscribers(email,source) values(normalized,left(coalesce(subscriber_source,'unknown'),80))
  on conflict(email) do update set status='subscribed', source=excluded.source, consent_at=now(), subscribed_at=now(), unsubscribed_at=null,
    unsubscribe_token=case when newsletter_subscribers.status='unsubscribed' then gen_random_uuid() else newsletter_subscribers.unsubscribe_token end;
  return true;
end $$;
create function public.unsubscribe_from_newsletter(token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.newsletter_subscribers set status='unsubscribed',unsubscribed_at=coalesce(unsubscribed_at,now()) where unsubscribe_token=token;
  return true;
end $$;
-- The public HTTP endpoint owns validation/rate limiting; no email/token-returning anonymous RPC.
revoke all on function public.subscribe_to_newsletter(text,text,boolean) from public,anon,authenticated;
revoke all on function public.unsubscribe_from_newsletter(uuid) from public,anon,authenticated;
grant execute on function public.subscribe_to_newsletter(text,text,boolean),public.unsubscribe_from_newsletter(uuid) to service_role;
