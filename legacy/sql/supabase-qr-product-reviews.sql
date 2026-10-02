-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- Reseñas de producto abiertas por QR.
-- Creado 2026-09-06.
--
-- Correr a mano en el SQL Editor de Supabase, dentro de una sola transacción.
-- Es aditivo: no cambia ninguna reseña existente ni el flujo por invitación.
--
-- Contexto: hasta ahora toda reseña nacía de una invitación atada a una orden
-- (`order_id` + `token_hash`), lo que permite mostrarla como compra verificada.
-- El QR impreso en la etiqueta del producto es el mismo para todos los
-- compradores, así que esas reseñas no se pueden atar a una orden. Conviven las
-- dos fuentes en esta tabla, distinguidas por `source`.
--
-- Las de QR NO se muestran con el sello "Verified purchase": no hay forma de
-- comprobar la compra, y afirmarlo sería engañoso para quien lee.

begin;

-- 1. Campos que solo existen en el camino por invitación.
alter table public.product_reviews alter column order_id drop not null;
alter table public.product_reviews alter column token_hash drop not null;
alter table public.product_reviews alter column expires_at drop not null;

-- 2. Origen de la reseña. Por defecto 'invitation' para no tocar las existentes.
alter table public.product_reviews
  add column if not exists source text not null default 'invitation';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_reviews_source_check'
      and conrelid = 'public.product_reviews'::regclass
  ) then
    alter table public.product_reviews
      add constraint product_reviews_source_check check (source in ('invitation', 'qr'));
  end if;
end $$;

-- 3. Email de quien deja la reseña. Nunca se muestra en público: sirve para
--    contactar por un problema y para la suscripción opcional al newsletter.
alter table public.product_reviews
  add column if not exists reviewer_email text;

alter table public.product_reviews
  add column if not exists newsletter_opt_in boolean not null default false;

-- 4. Foto opcional del cliente usando el producto. Se guarda ya recodificada por
--    el servidor; nunca se almacenan los bytes originales que subió el visitante.
alter table public.product_reviews
  add column if not exists photo_url text;

-- Katie aprueba la reseña y la foto por separado: un comentario puede servir
-- aunque la foto no. Al rechazar la foto se borra el archivo de Storage y esta
-- columna vuelve a null, para no acumular archivos que nadie va a mostrar.
alter table public.product_reviews
  add column if not exists photo_approved boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_reviews_reviewer_email_len'
      and conrelid = 'public.product_reviews'::regclass
  ) then
    alter table public.product_reviews
      add constraint product_reviews_reviewer_email_len check (
        reviewer_email is null
        or (char_length(reviewer_email) between 3 and 160 and reviewer_email like '%@%')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'product_reviews_photo_url_shape'
      and conrelid = 'public.product_reviews'::regclass
  ) then
    -- La foto solo puede vivir en el bucket propio. Evita que una ruta guardada
    -- termine apuntando a un host de terceros si algo se cuela más arriba.
    alter table public.product_reviews
      add constraint product_reviews_photo_url_shape check (
        photo_url is null
        or photo_url like 'https://%/storage/v1/object/public/media/optimized/reviews/%'
      );
  end if;

  -- Una foto no puede quedar aprobada si no hay foto.
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_reviews_photo_approval_check'
      and conrelid = 'public.product_reviews'::regclass
  ) then
    alter table public.product_reviews
      add constraint product_reviews_photo_approval_check check (
        photo_approved = false or photo_url is not null
      );
  end if;
end $$;

-- 5. Integridad por origen: una reseña por invitación necesita su orden y su
--    token; una de QR no puede tener ninguno de los dos, para que nunca pueda
--    hacerse pasar por compra verificada.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'product_reviews_source_fields_check'
      and conrelid = 'public.product_reviews'::regclass
  ) then
    alter table public.product_reviews
      add constraint product_reviews_source_fields_check check (
        (source = 'invitation' and order_id is not null and token_hash is not null and expires_at is not null)
        or
        (source = 'qr' and order_id is null and token_hash is null and expires_at is null)
      );
  end if;
end $$;

-- 6. Índice para el panel de moderación, que ordena por fecha de envío.
create index if not exists product_reviews_source_status_idx
  on public.product_reviews (source, status, submitted_at desc);

comment on column public.product_reviews.source is
  'invitation = atada a una orden real, se muestra como compra verificada. qr = enviada desde el QR de la etiqueta, sin sello de verificación.';

comment on column public.product_reviews.reviewer_email is
  'Privado. Nunca se renderiza en público.';

comment on column public.product_reviews.photo_url is
  'Foto recodificada por el servidor en media/optimized/reviews. Los bytes originales del visitante nunca se guardan.';

comment on column public.product_reviews.photo_approved is
  'Katie modera la foto aparte del texto. Al rechazarla se borra el archivo y photo_url vuelve a null.';

commit;
