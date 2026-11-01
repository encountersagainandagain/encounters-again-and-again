-- An optional name for each image in the Media library, so editors can tell photos apart when choosing one.
-- The description (alt) stays what the site reads aloud; nothing is converted.
alter table public.media add column title text not null default '';
