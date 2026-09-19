-- Ovitrampas: schema inicial, RLS, storage e dados de referência.
-- Funções security definer ficam no schema private (não exposto na Data API).

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, service_role, authenticated;

create extension if not exists "pgcrypto" with schema extensions;

create type public.app_role as enum ('ace', 'lab', 'supervisor', 'admin');
create type public.trap_status as enum (
  'instalada',
  'recolhida',
  'danificada',
  'perdida',
  'sem_alteracao'
);
create type public.collection_kind as enum ('instalacao', 'vistoria', 'recolhimento');
create type public.mosquito_species as enum (
  'aedes_aegypti',
  'aedes_albopictus',
  'culex',
  'outro',
  'nao_identificado'
);
create type public.local_sync_status as enum ('pending', 'synced', 'error');

create table public.neighborhoods (
  id bigint generated always as identity primary key,
  name text not null,
  zone text not null,
  created_at timestamptz not null default now()
);

create table public.trap_types (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  registration_number text,
  cpf text,
  role public.app_role not null default 'ace',
  neighborhood_id bigint references public.neighborhoods (id),
  zone text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_cpf_format check (
    cpf is null or cpf ~ '^[0-9]{11}$'
  )
);

create table public.properties (
  id bigint generated always as identity primary key,
  street text not null,
  number text,
  neighborhood_id bigint not null references public.neighborhoods (id),
  complement text,
  reference_point text,
  latitude double precision,
  longitude double precision,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.traps (
  id bigint generated always as identity primary key,
  code text not null unique,
  qr_code text,
  trap_type_id bigint not null references public.trap_types (id),
  property_id bigint references public.properties (id),
  status public.trap_status not null default 'instalada',
  installed_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique,
  trap_id bigint references public.traps (id),
  trap_code text not null,
  trap_type_id bigint references public.trap_types (id),
  agent_id uuid not null references public.profiles (id),
  kind public.collection_kind not null,
  occurred_at timestamptz not null,
  trap_status public.trap_status not null,
  paddle_code text,
  estimated_eggs integer,
  observations text,
  photo_path text,
  latitude double precision,
  longitude double precision,
  street text,
  number text,
  neighborhood_id bigint references public.neighborhoods (id),
  complement text,
  reference_point text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_estimated_eggs_nonnegative check (
    estimated_eggs is null or estimated_eggs >= 0
  )
);

create table public.lab_results (
  id bigint generated always as identity primary key,
  collection_id uuid not null unique references public.collections (id) on delete cascade,
  exact_egg_count integer,
  species public.mosquito_species,
  species_notes text,
  analyzed_at timestamptz not null default now(),
  analyst_id uuid not null references public.profiles (id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_results_egg_count_nonnegative check (
    exact_egg_count is null or exact_egg_count >= 0
  )
);

create index neighborhoods_zone_idx on public.neighborhoods (zone);
create index profiles_role_idx on public.profiles (role);
create index profiles_neighborhood_id_idx on public.profiles (neighborhood_id);
create index properties_neighborhood_id_idx on public.properties (neighborhood_id);
create index properties_created_by_idx on public.properties (created_by);
create index traps_property_id_idx on public.traps (property_id);
create index traps_trap_type_id_idx on public.traps (trap_type_id);
create index traps_created_by_idx on public.traps (created_by);
create index traps_status_idx on public.traps (status);
create index collections_agent_id_idx on public.collections (agent_id);
create index collections_trap_id_idx on public.collections (trap_id);
create index collections_neighborhood_id_idx on public.collections (neighborhood_id);
create index collections_occurred_at_idx on public.collections (occurred_at desc);
create index collections_paddle_code_idx on public.collections (paddle_code);
create index lab_results_analyst_id_idx on public.lab_results (analyst_id);
create index lab_results_species_idx on public.lab_results (species);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger properties_set_updated_at
before update on public.properties
for each row execute function private.set_updated_at();

create trigger traps_set_updated_at
before update on public.traps
for each row execute function private.set_updated_at();

create trigger collections_set_updated_at
before update on public.collections
for each row execute function private.set_updated_at();

create trigger lab_results_set_updated_at
before update on public.lab_results
for each row execute function private.set_updated_at();

create or replace function private.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.role in ('lab', 'supervisor', 'admin')
  )
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_role public.app_role;
begin
  new_role := coalesce(
    (new.raw_app_meta_data ->> 'role')::public.app_role,
    'ace'
  );

  insert into public.profiles (id, full_name, role, registration_number, cpf)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Agente de campo'),
    new_role,
    new.raw_user_meta_data ->> 'registration_number',
    new.raw_user_meta_data ->> 'cpf'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.is_staff() to authenticated;

alter table public.neighborhoods enable row level security;
alter table public.trap_types enable row level security;
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.traps enable row level security;
alter table public.collections enable row level security;
alter table public.lab_results enable row level security;

alter table public.neighborhoods force row level security;
alter table public.trap_types force row level security;
alter table public.profiles force row level security;
alter table public.properties force row level security;
alter table public.traps force row level security;
alter table public.collections force row level security;
alter table public.lab_results force row level security;

create policy neighborhoods_select_authenticated
on public.neighborhoods
for select
to authenticated
using (true);

create policy neighborhoods_write_staff
on public.neighborhoods
for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy trap_types_select_authenticated
on public.trap_types
for select
to authenticated
using (true);

create policy trap_types_write_staff
on public.trap_types
for all
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy profiles_select_own_or_staff
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_staff())
);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and role = (select private.current_profile_role())
);

create policy profiles_update_staff
on public.profiles
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create policy properties_select_authenticated
on public.properties
for select
to authenticated
using (true);

create policy properties_insert_authenticated
on public.properties
for insert
to authenticated
with check (created_by = (select auth.uid()) or created_by is null);

create policy properties_update_own_or_staff
on public.properties
for update
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_staff())
)
with check (
  created_by = (select auth.uid())
  or (select private.is_staff())
);

create policy traps_select_authenticated
on public.traps
for select
to authenticated
using (true);

create policy traps_insert_authenticated
on public.traps
for insert
to authenticated
with check (created_by = (select auth.uid()) or created_by is null);

create policy traps_update_own_or_staff
on public.traps
for update
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_staff())
)
with check (
  created_by = (select auth.uid())
  or (select private.is_staff())
);

create policy collections_select_own_or_staff
on public.collections
for select
to authenticated
using (
  agent_id = (select auth.uid())
  or (select private.is_staff())
);

create policy collections_insert_own
on public.collections
for insert
to authenticated
with check (agent_id = (select auth.uid()));

create policy collections_update_own_or_staff
on public.collections
for update
to authenticated
using (
  agent_id = (select auth.uid())
  or (select private.is_staff())
)
with check (
  agent_id = (select auth.uid())
  or (select private.is_staff())
);

create policy lab_results_select_staff_or_owner
on public.lab_results
for select
to authenticated
using (
  (select private.is_staff())
  or exists (
    select 1
    from public.collections as c
    where c.id = lab_results.collection_id
      and c.agent_id = (select auth.uid())
  )
);

create policy lab_results_write_staff
on public.lab_results
for insert
to authenticated
with check ((select private.is_staff()));

create policy lab_results_update_staff
on public.lab_results
for update
to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

create view public.collections_with_lab
with (security_invoker = true) as
select
  c.id,
  c.client_id,
  c.trap_code,
  c.kind,
  c.occurred_at,
  c.trap_status,
  c.paddle_code,
  c.estimated_eggs,
  c.observations,
  c.photo_path,
  c.latitude,
  c.longitude,
  c.street,
  c.number,
  c.neighborhood_id,
  n.name as neighborhood_name,
  n.zone as neighborhood_zone,
  c.agent_id,
  p.full_name as agent_name,
  p.registration_number as agent_registration,
  lr.exact_egg_count,
  lr.species,
  lr.analyzed_at,
  lr.notes as lab_notes
from public.collections as c
left join public.neighborhoods as n on n.id = c.neighborhood_id
left join public.profiles as p on p.id = c.agent_id
left join public.lab_results as lr on lr.collection_id = c.id;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'collection-photos',
  'collection-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy collection_photos_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'collection-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy collection_photos_select_own_or_staff
on storage.objects
for select
to authenticated
using (
  bucket_id = 'collection-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or (select private.is_staff())
  )
);

create policy collection_photos_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'collection-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'collection-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

insert into public.neighborhoods (name, zone)
values
  ('Centro', 'Zona Central'),
  ('Caimbé', 'Zona Oeste'),
  ('13 de Setembro', 'Zona Sul'),
  ('Liberdade', 'Zona Norte'),
  ('Asa Branca', 'Zona Leste'),
  ('São Vicente', 'Zona Oeste'),
  ('Mecejana', 'Zona Oeste'),
  ('Pricumã', 'Zona Norte');

insert into public.trap_types (code, name, description)
values
  ('OVITRAMPA', 'Ovitrampa padrão', 'Armadilha de ovos com palheta para Aedes spp.'),
  ('OVITRAMPA_MOD', 'Ovitrampa modificada', 'Variação com cobertura e palheta identificada.');
