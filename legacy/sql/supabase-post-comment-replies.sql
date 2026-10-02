-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: admin comment inbox and public replies from Katie.
-- Created 2026-08-26.
--
-- Run manually in the Supabase SQL Editor. This migration is additive and
-- preserves every existing comment. Existing visible comments become unread
-- inbox items so Katie can review them once.

begin;

alter table public.post_comments
  add column if not exists admin_reply_text text,
  add column if not exists admin_reply_author text,
  add column if not exists admin_replied_at timestamptz,
  add column if not exists admin_reviewed_at timestamptz;

alter table public.post_comments
  drop constraint if exists post_comments_admin_reply_length_check,
  drop constraint if exists post_comments_admin_reply_complete_check;

alter table public.post_comments
  add constraint post_comments_admin_reply_length_check
    check (
      admin_reply_text is null
      or length(trim(admin_reply_text)) between 1 and 2000
    ),
  add constraint post_comments_admin_reply_complete_check
    check (
      (
        admin_reply_text is null
        and admin_reply_author is null
        and admin_replied_at is null
      )
      or (
        admin_reply_text is not null
        and length(trim(admin_reply_author)) between 1 and 80
        and admin_replied_at is not null
      )
    );

create index if not exists post_comments_admin_inbox_idx
  on public.post_comments (admin_reviewed_at, created_at desc)
  where is_hidden = false;

comment on column public.post_comments.admin_reply_text is
  'Public reply written by the site admin and displayed beneath the reader comment.';
comment on column public.post_comments.admin_reply_author is
  'Public signature for the admin reply; currently Katie.';
comment on column public.post_comments.admin_replied_at is
  'Timestamp of the latest published admin reply.';
comment on column public.post_comments.admin_reviewed_at is
  'Admin inbox state. Null means the comment still needs review; a reply also marks it reviewed.';

commit;
