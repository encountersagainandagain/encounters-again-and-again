create table public.workshops (
  id uuid primary key references public.posts(id) on delete cascade,
  activity_status public.activity_status not null default 'upcoming',
  registration_status text not null default 'not_applicable' check(registration_status in ('open','closed','full','not_applicable')),
  starts_on date, ends_on date, place text, audience_note text, language text, modality text,
  materials jsonb not null default '[]' check(jsonb_typeof(materials)='array'), includes text,
  price numeric check(price>=0), currency text, capacity integer check(capacity>0),
  signup_email text, signup_subject text, signup_label text, date_label text, availability_label text, cta_label text,
  check(ends_on is null or starts_on is null or ends_on>=starts_on)
);
create table public.workshop_sessions (
  id uuid primary key default gen_random_uuid(), workshop_id uuid not null references public.workshops(id) on delete cascade,
  title text not null, body text not null default '', place text, held_on date,
  media_id uuid references public.media(id), sort integer not null default 0
);
alter table public.workshops enable row level security;
alter table public.workshop_sessions enable row level security;
create policy workshops_read on public.workshops for select to anon,authenticated using(exists(select 1 from public.posts where posts.id=workshops.id));
create policy workshops_admin on public.workshops for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy sessions_read on public.workshop_sessions for select to anon,authenticated using(exists(select 1 from public.posts where id=workshop_id));
create policy sessions_admin on public.workshop_sessions for all to authenticated using(public.is_admin()) with check(public.is_admin());
