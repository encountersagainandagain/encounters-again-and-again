-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: allow monetizable editorial blocks in existing post_blocks table
-- Run this if docs/supabase-posts.sql was already run before stay/tour/costs blocks existed.

alter table public.post_blocks
drop constraint if exists post_blocks_type_check;

alter table public.post_blocks
add constraint post_blocks_type_check
check (type in ('heading', 'paragraph', 'image', 'image-pair', 'carousel', 'divider', 'youtube', 'quote', 'link', 'affiliate_link', 'stay', 'tour', 'costs', 'quick_facts', 'toc', 'list', 'faq', 'accordion'));
