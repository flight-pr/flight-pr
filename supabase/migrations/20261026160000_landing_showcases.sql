begin;
alter table public.landing_pages drop constraint landing_pages_template_check;
alter table public.landing_pages add constraint landing_pages_template_check check (template in ('location','attivita','editoriale','matrimonio','evento'));
alter table public.landing_pages
  add column location_address text not null default '',
  add column location_details text not null default '',
  add column gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery) = 'array' and jsonb_array_length(gallery) <= 20),
  add column contact_email text not null default '',
  add column contact_phone text not null default '',
  add column opening_hours text not null default '',
  add column offerings jsonb not null default '[]'::jsonb check (jsonb_typeof(offerings) = 'array' and jsonb_array_length(offerings) <= 12);
commit;
