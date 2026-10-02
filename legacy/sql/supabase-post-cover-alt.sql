-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: add alt text for post cover/banner images.
-- Run this in Supabase SQL Editor before deploying the app change that saves cover_alt.

alter table public.posts
add column if not exists cover_alt text default '';

