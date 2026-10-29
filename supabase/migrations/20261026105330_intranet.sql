begin;
create table public.staff_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  name text not null check (length(name) between 1 and 160),
  email text not null unique,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create function public.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_profiles where id = (select auth.uid()) and active);
$$;
create function public.is_staff_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_profiles where id = (select auth.uid()) and active and role = 'admin');
$$;
revoke all on function public.is_staff(), public.is_staff_admin() from public;
grant execute on function public.is_staff(), public.is_staff_admin() to authenticated;
alter table public.staff_profiles enable row level security;
create policy staff_read on public.staff_profiles for select to authenticated using (public.is_staff());
-- Membership changes are server-only: service-role APIs check the administrator first.

create function public.protect_last_admin() returns trigger language plpgsql set search_path = '' as $$
begin
  -- Serialize membership changes, including concurrent demotions.
  perform pg_advisory_xact_lock(17621001);
  if old.role = 'admin' and old.active and (new.role <> 'admin' or not new.active)
    and not exists(select 1 from public.staff_profiles where id <> old.id and role = 'admin' and active) then
    raise exception 'At least one active administrator is required';
  end if;
  return new;
end;
$$;
create trigger staff_last_admin before update on public.staff_profiles for each row execute function public.protect_last_admin();

create table public.contacts (
  id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 160),
  email text not null default '', phone text not null default '', company text not null default '',
  status text not null default 'Nuovo' check(status in ('Nuovo','Contattato','Preventivo','Confermato','Completato','Perso')),
  services text[] not null default '{}' check(services <@ array['Fotografia','Video','Drone','Eventi']::text[]),
  value numeric(12,2) not null default 0 check(value >= 0), event_date date, follow_up date,
  owner_id uuid references public.staff_profiles(id) on delete set null, notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.contact_activities (
  id uuid primary key default gen_random_uuid(), contact_id uuid not null references public.contacts(id) on delete cascade,
  author_id uuid references public.staff_profiles(id), body text not null check(length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create table public.landing_pages (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  template text not null check(template in ('editoriale','matrimonio','evento')),
  eyebrow text not null default '', heading text not null, description text not null default '', image_url text not null default '',
  cta_label text not null default 'Parliamone', cta_url text not null default '/contatti',
  accent text not null default '#f36a21' check(accent ~ '^#[a-fA-F0-9]{6}$'),
  status text not null default 'draft' check(status in ('draft','published')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.transfers (
  id uuid primary key default gen_random_uuid(), title text not null, recipient text not null default '', message text not null default '',
  token_hash text not null unique, contact_id uuid references public.contacts(id) on delete set null,
  expires_at timestamptz not null, status text not null default 'uploading' check(status in ('uploading','ready','revoked','expired')),
  created_by uuid not null references public.staff_profiles(id), created_at timestamptz not null default now(),
  revoked_at timestamptz, purged_at timestamptz
);
create table public.transfer_files (
  id uuid primary key default gen_random_uuid(), transfer_id uuid not null references public.transfers(id) on delete cascade,
  name text not null, size bigint not null check(size > 0 and size <= 107374182400), type text not null default '',
  key text not null unique, upload_id text, completed boolean not null default false
);
create index contacts_follow_up_idx on public.contacts(follow_up);
create index activities_contact_idx on public.contact_activities(contact_id, created_at desc);
create index transfer_expiry_idx on public.transfers(expires_at) where purged_at is null;
create index transfer_files_transfer_idx on public.transfer_files(transfer_id);

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger contacts_updated before update on public.contacts for each row execute function public.touch_updated_at();
create trigger landings_updated before update on public.landing_pages for each row execute function public.touch_updated_at();
create function public.contact_status_history() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.contact_activities(contact_id, author_id, body) values(new.id, auth.uid(), 'Contatto creato · ' || new.status);
  elsif old.status is distinct from new.status then
    insert into public.contact_activities(contact_id, author_id, body) values(new.id, auth.uid(), 'Stato: ' || old.status || ' → ' || new.status);
  end if;
  return new;
end;
$$;
create trigger contacts_history after insert or update on public.contacts for each row execute function public.contact_status_history();

alter table public.contacts enable row level security;
alter table public.contact_activities enable row level security;
alter table public.landing_pages enable row level security;
alter table public.transfers enable row level security;
alter table public.transfer_files enable row level security;
create policy contacts_staff on public.contacts for all to authenticated using (public.is_staff()) with check(public.is_staff());
create policy activities_read on public.contact_activities for select to authenticated using(public.is_staff());
create policy activities_insert on public.contact_activities for insert to authenticated with check(public.is_staff() and author_id = (select auth.uid()));
create policy landings_staff on public.landing_pages for all to authenticated using(public.is_staff()) with check(public.is_staff());
create policy transfers_read on public.transfers for select to authenticated using(public.is_staff());
create policy files_read on public.transfer_files for select to authenticated using(public.is_staff());
revoke all on public.staff_profiles, public.contacts, public.contact_activities, public.landing_pages, public.transfers, public.transfer_files from anon;
grant select on public.staff_profiles, public.transfers, public.transfer_files to authenticated;
grant select, insert, update, delete on public.contacts, public.landing_pages to authenticated;
grant select, insert on public.contact_activities to authenticated;
grant all on public.staff_profiles, public.contacts, public.contact_activities, public.landing_pages, public.transfers, public.transfer_files to service_role;
commit;
