-- Expeditions and Workshops pages (Expeditions.dc.html, Workshops.dc.html).
-- Explicit texts the prototypes show and the schema did not have yet:
--   workshops.note_title  title of the note in the left column ("Who it is for", "A note about the stall").
--   workshops.outcome     "How it went": the few lines a finished workshop shows before "See the result".
--   expeditions.outcome   the same for a finished expedition in the list of /expeditions.
-- Optional texts: nothing is converted and nothing is deleted.

alter table public.workshops
  add column if not exists note_title text,
  add column if not exists outcome text;

alter table public.expeditions
  add column if not exists outcome text;

comment on column public.workshops.note_title is 'Title of the note under the workshop title, for example "Who it is for".';
comment on column public.workshops.outcome is 'How it went, shown on the card of a finished workshop.';
comment on column public.expeditions.outcome is 'How it went, shown on the card of a finished expedition.';
