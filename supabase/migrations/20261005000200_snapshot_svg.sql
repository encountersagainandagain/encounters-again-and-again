-- The verified editorial snapshot includes an SVG logo. Serve it with a sandbox CSP.
alter table public.media drop constraint media_mime_type_check;
alter table public.media add constraint media_mime_type_check check(mime_type in ('image/jpeg','image/png','image/webp','image/gif','image/svg+xml'));
update storage.buckets set allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'] where id='media';
