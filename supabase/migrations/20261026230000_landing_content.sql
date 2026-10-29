begin;
alter table public.landing_pages
  add column heading_font text not null default 'cormorant' check (heading_font in ('manrope','cormorant','montserrat','georgia')),
  add column hero_subtitle text not null default '',
  add column intro_title text not null default '',
  add column intro_image_url text not null default '',
  add column services_title text not null default '',
  add column gallery_title text not null default '',
  add column feature_title text not null default '',
  add column feature_text text not null default '',
  add column feature_image_url text not null default '',
  add column contact_title text not null default '',
  add column contact_description text not null default '',
  add column footer_info text not null default '',
  add column faq jsonb not null default '[]'::jsonb check (jsonb_typeof(faq) = 'array' and jsonb_array_length(faq) <= 8);
commit;
