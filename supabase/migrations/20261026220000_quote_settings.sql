begin;
create table public.quote_settings (
  id text primary key default 'default' check (id = 'default'),
  values jsonb not null default '{}'::jsonb check (jsonb_typeof(values) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.staff_profiles(id) on delete set null
);
alter table public.quote_settings enable row level security;
create policy quote_settings_read on public.quote_settings for select to authenticated using (public.is_staff());
revoke all on public.quote_settings from anon, authenticated;
grant select on public.quote_settings to authenticated;
grant all on public.quote_settings to service_role;
insert into public.quote_settings(id) values ('default');
commit;
