create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}' check (jsonb_typeof(value) = 'object'),
  status public.content_status not null default 'published',
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create policy settings_read on public.site_settings for select to anon, authenticated
using (status = 'published' or public.is_admin());
create policy settings_admin on public.site_settings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create table public.media (
  id uuid primary key default gen_random_uuid(),
  asset_id text unique,
  storage_path text not null unique,
  sha256 text not null unique check (sha256 ~ '^[a-f0-9]{64}$'),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/gif')),
  bytes bigint not null check (bytes > 0 and bytes <= 10485760),
  alt text not null default '', width integer check(width > 0), height integer check(height > 0),
  focal_x numeric not null default 0.5 check(focal_x between 0 and 1),
  focal_y numeric not null default 0.5 check(focal_y between 0 and 1),
  fit text not null default 'cover' check(fit in ('cover','contain')),
  credit text not null default '', source_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (storage_path ~ '^(crew|expeditions|workshops|art|posts|settings)/[a-zA-Z0-9._/-]+$' and storage_path not like '%..%')
);
alter table public.media enable row level security;
create policy media_admin on public.media for all to authenticated
using(public.is_admin()) with check(public.is_admin());
