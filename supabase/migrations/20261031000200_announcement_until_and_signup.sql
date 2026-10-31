-- Announcements are passing notices: the last day they are shown (ends_on, empty: their date) and an optional
-- sign-up button (a link or an email address) so people can register from the Home card. Nothing is converted.
alter table public.upcoming_items add column ends_on date;
alter table public.upcoming_items add column cta_label text;
alter table public.upcoming_items add column cta_url text;
alter table public.upcoming_items add constraint upcoming_items_dates_check check(ends_on is null or starts_on is null or ends_on>=starts_on);
