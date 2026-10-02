-- ARCHIVED REFERENCE ONLY. Not an Encounters migration. Do not execute as a sequence.
-- What Katie Seas: ecommerce provider-agnostic rename
-- Paste this in Supabase SQL Editor and run it once.
--
-- Scope: renames Printful-specific ecommerce schema fields so products,
-- variants, files, orders, and webhook events can support multiple POD
-- providers later.
--
-- Important:
-- - Do not run via psql/direct DB connection.
-- - The project owner runs this manually in Supabase SQL Editor.
-- - Uses ALTER ... RENAME COLUMN; does not recreate tables.

begin;

alter table public.products
add column if not exists provider text not null default 'printful';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_provider_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
    add constraint products_provider_check
    check (provider in ('printful', 'printify'));
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'printful_catalog_product_id'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'provider_catalog_product_id'
  ) then
    alter table public.products
    rename column printful_catalog_product_id to provider_catalog_product_id;
  end if;
end $$;

alter table public.products
add column if not exists provider_print_provider_id integer null;

alter table public.products
add column if not exists provider_meta jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'printful_variant_id'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'provider_variant_id'
  ) then
    alter table public.product_variants
    rename column printful_variant_id to provider_variant_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'printful_base_cost_cents'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'provider_base_cost_cents'
  ) then
    alter table public.product_variants
    rename column printful_base_cost_cents to provider_base_cost_cents;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_files'
      and column_name = 'printful_file_type'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_files'
      and column_name = 'provider_file_type'
  ) then
    alter table public.product_files
    rename column printful_file_type to provider_file_type;
  end if;
end $$;

alter table public.orders
add column if not exists provider text not null default 'printful';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_provider_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
    add constraint orders_provider_check
    check (provider in ('printful', 'printify'));
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'printful_order_id'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'provider_order_id'
  ) then
    alter table public.orders
    rename column printful_order_id to provider_order_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'printful_cost_cents'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'provider_cost_cents'
  ) then
    alter table public.orders
    rename column printful_cost_cents to provider_cost_cents;
  end if;
end $$;

do $$
declare
  old_constraint_name text;
begin
  select con.conname
  into old_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'orders'
    and con.contype = 'u'
    and array_length(con.conkey, 1) = 1
    and (
      select att.attname
      from pg_attribute att
      where att.attrelid = con.conrelid
        and att.attnum = con.conkey[1]
    ) = 'stripe_session_id'
  limit 1;

  if old_constraint_name is not null then
    execute format('alter table public.orders drop constraint %I', old_constraint_name);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_stripe_session_provider_key'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
    add constraint orders_stripe_session_provider_key
    unique (stripe_session_id, provider);
  end if;
end $$;

do $$
declare
  source_check_name text;
begin
  select con.conname
  into source_check_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'processed_webhook_events'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%source%'
    and pg_get_constraintdef(con.oid) like '%stripe%'
    and pg_get_constraintdef(con.oid) like '%printful%'
  limit 1;

  if source_check_name is not null then
    execute format(
      'alter table public.processed_webhook_events drop constraint %I',
      source_check_name
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'processed_webhook_events_source_check'
      and conrelid = 'public.processed_webhook_events'::regclass
  ) then
    alter table public.processed_webhook_events
    add constraint processed_webhook_events_source_check
    check (source in ('stripe', 'printful', 'printify'));
  end if;
end $$;

commit;
