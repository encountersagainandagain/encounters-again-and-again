-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: allow FAQ blocks in existing post_blocks table
-- Run this in Supabase SQL editor before saving posts with FAQ blocks.

alter table public.post_blocks
drop constraint if exists post_blocks_type_check;

alter table public.post_blocks
add constraint post_blocks_type_check
check (type in ('heading', 'paragraph', 'image', 'image-pair', 'carousel', 'divider', 'youtube', 'quote', 'link', 'affiliate_link', 'stay', 'tour', 'costs', 'quick_facts', 'toc', 'list', 'faq', 'accordion'));
