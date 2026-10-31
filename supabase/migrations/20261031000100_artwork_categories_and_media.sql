-- Art: a work can belong to more than one category, its video or audio can come from more services, and any page can
-- have a Video or audio block (type embed: a link to YouTube, Vimeo, Spotify or SoundCloud, played from there).
-- category_id stays the main category (it gives the work its address); more_categories lists the other ones.
-- Adds a column with a default and widens two checks; converts and deletes nothing. save_content saves the new column
-- with the other details of the work (save_entity reads the columns of the table).
alter table public.artworks add column more_categories uuid[] not null default '{}';
alter table public.artworks drop constraint artworks_embed_kind_check;
alter table public.artworks add constraint artworks_embed_kind_check check(embed_kind in ('youtube','vimeo','spotify','soundcloud'));
alter table public.post_blocks drop constraint post_blocks_type_check;
alter table public.post_blocks add constraint post_blocks_type_check check(type in ('heading','paragraph','image','image-pair','carousel','divider','youtube','embed','quote','link','stay','tour','costs','quick_facts','toc','list','faq','accordion','source'));
