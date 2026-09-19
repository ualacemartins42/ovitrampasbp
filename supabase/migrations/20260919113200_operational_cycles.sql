create type public.trap_area_type as enum ('urbana', 'periurbana', 'rural');
create type public.cycle_status as enum ('instalada', 'trocada', 'finalizada');
create type public.cycle_situation as enum ('normal', 'seca', 'ausente', 'danificada');

alter table public.traps
  add column if not exists neighborhood_id bigint references public.neighborhoods (id),
  add column if not exists district text,
  add column if not exists street text,
  add column if not exists number text,
  add column if not exists complement text,
  add column if not exists location_detail text,
  add column if not exists responsible text,
  add column if not exists block text,
  add column if not exists area_type public.trap_area_type,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  trap_code text not null,
  trap_id bigint references public.traps (id) on delete set null,
  neighborhood_name text,
  status public.cycle_status not null default 'instalada',
  install_at timestamptz,
  install_epi_week integer,
  install_obs text,
  swap_at timestamptz,
  swap_epi_week integer,
  swap_situation public.cycle_situation,
  swap_obs text,
  remove_at timestamptz,
  remove_epi_week integer,
  remove_situation public.cycle_situation,
  remove_obs text,
  agent_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cycles_trap_code_idx on public.cycles (trap_code);
create index if not exists cycles_status_idx on public.cycles (status);
create index if not exists cycles_agent_id_idx on public.cycles (agent_id);
create index if not exists traps_neighborhood_id_idx on public.traps (neighborhood_id);

create trigger cycles_set_updated_at
before update on public.cycles
for each row execute function private.set_updated_at();

alter table public.cycles enable row level security;
alter table public.cycles force row level security;

drop policy if exists traps_update_own_or_staff on public.traps;

create policy traps_update_authenticated
on public.traps
for update
to authenticated
using (true)
with check (true);

create policy traps_delete_authenticated
on public.traps
for delete
to authenticated
using (true);

create policy cycles_select_authenticated
on public.cycles
for select
to authenticated
using (true);

create policy cycles_insert_own
on public.cycles
for insert
to authenticated
with check (agent_id = (select auth.uid()));

create policy cycles_update_authenticated
on public.cycles
for update
to authenticated
using (true)
with check (true);

create policy cycles_delete_authenticated
on public.cycles
for delete
to authenticated
using (true);

grant select, insert, update, delete on table public.cycles to authenticated;
grant select, insert, update, delete on table public.traps to authenticated;
