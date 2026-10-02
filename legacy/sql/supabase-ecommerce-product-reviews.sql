-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Verified-purchase product reviews for the What Katie Seas shop.
--
-- Run manually in Supabase SQL Editor after the existing ecommerce migrations.
-- Codex does not execute SQL against the project database.
--
-- Each row begins as a private invitation created only after a paid order is
-- marked delivered. A submitted review remains private until Katie approves it.

begin;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'invited' check (
    status in ('invited', 'pending', 'approved', 'rejected')
  ),
  author_name text,
  rating smallint,
  comment_text text,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_reviews_order_product_key unique (order_id, product_id),
  constraint product_reviews_author_name_len check (
    author_name is null or char_length(author_name) between 1 and 60
  ),
  constraint product_reviews_rating_range check (
    rating is null or rating between 1 and 5
  ),
  constraint product_reviews_comment_len check (
    comment_text is null or char_length(comment_text) between 3 and 2000
  ),
  constraint product_reviews_submission_state_check check (
    (
      status = 'invited'
      and author_name is null
      and rating is null
      and comment_text is null
      and submitted_at is null
      and moderated_at is null
    )
    or
    (
      status = 'pending'
      and author_name is not null
      and rating is not null
      and comment_text is not null
      and submitted_at is not null
      and moderated_at is null
    )
    or
    (
      status in ('approved', 'rejected')
      and author_name is not null
      and rating is not null
      and comment_text is not null
      and submitted_at is not null
      and moderated_at is not null
    )
  )
);

create index if not exists product_reviews_status_submitted_idx
  on public.product_reviews (status, submitted_at desc);

create index if not exists product_reviews_product_approved_idx
  on public.product_reviews (product_id, submitted_at desc)
  where status = 'approved';

create index if not exists product_reviews_order_idx
  on public.product_reviews (order_id);

alter table public.product_reviews enable row level security;

drop policy if exists "Admins can read product reviews" on public.product_reviews;
create policy "Admins can read product reviews"
on public.product_reviews
for select
to authenticated
using (public.is_admin());

-- Public visitors never read or write this table directly. Review links,
-- submissions, publication, and public rendering all pass through server code
-- that validates the private token or the authenticated admin session.

comment on table public.product_reviews is
  'Private verified-purchase review invitations and Katie-moderated product reviews.';

comment on column public.product_reviews.token_hash is
  'SHA-256 digest of the one-time review URL token; the raw token is never stored.';

commit;
