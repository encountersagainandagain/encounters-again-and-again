insert into public.site_settings(key,value) values('site',jsonb_build_object(
  'name','Encounters Again and Again', 'url','https://encountersagainandagain.com',
  'email','', 'home',jsonb_build_object('sections',jsonb_build_array('projects','upcoming','posts','art','crew','about'),'hidden_sections','[]'::jsonb,'pinned_post_ids','[]'::jsonb),
  'pages','{}'::jsonb
));
