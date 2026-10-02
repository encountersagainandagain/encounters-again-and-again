-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: custom SEO meta descriptions for posts
-- Paste this in Supabase SQL Editor once before using the admin field.

alter table public.posts
  add column if not exists meta_description text not null default '';

alter table public.posts
  drop constraint if exists posts_meta_description_len;

alter table public.posts
  add constraint posts_meta_description_len
    check (length(meta_description) <= 320);
