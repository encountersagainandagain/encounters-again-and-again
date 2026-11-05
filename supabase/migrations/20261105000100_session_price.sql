-- Each workshop session can say what it costs per person, in the currency of its workshop.
alter table public.workshop_sessions add column price numeric check(price>=0);
comment on column public.workshop_sessions.price is 'Price per person of this session, in the currency of the workshop. 0 shows "Free"; empty shows nothing.';
