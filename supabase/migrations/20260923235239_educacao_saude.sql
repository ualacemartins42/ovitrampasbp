-- Registros de educação em saúde em campo + bucket de fotos.

create table if not exists public.educacao_saude (
  id uuid primary key default gen_random_uuid(),
  trap_code text not null,
  trap_id bigint,
  street text,
  number text,
  neighborhood_name text,
  district text,
  action_date date not null,
  action_taken text,
  egg_count integer,
  cycle_id uuid,
  photo_paths text[] not null default '{}'::text[],
  agent_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists educacao_saude_agent_id_idx on public.educacao_saude (agent_id);
create index if not exists educacao_saude_action_date_idx on public.educacao_saude (action_date desc);
create index if not exists educacao_saude_trap_code_idx on public.educacao_saude (trap_code);

alter table public.educacao_saude enable row level security;

drop policy if exists educacao_saude_select_own_or_staff on public.educacao_saude;
create policy educacao_saude_select_own_or_staff
on public.educacao_saude
for select
to authenticated
using (
  agent_id = (select auth.uid())
  or (select private.is_staff())
);

drop policy if exists educacao_saude_insert_own on public.educacao_saude;
create policy educacao_saude_insert_own
on public.educacao_saude
for insert
to authenticated
with check (agent_id = (select auth.uid()));

drop policy if exists educacao_saude_update_own_or_staff on public.educacao_saude;
create policy educacao_saude_update_own_or_staff
on public.educacao_saude
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

drop policy if exists educacao_saude_delete_own_or_staff on public.educacao_saude;
create policy educacao_saude_delete_own_or_staff
on public.educacao_saude
for delete
to authenticated
using (
  agent_id = (select auth.uid())
  or (select private.is_staff())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'educacao_fotos',
  'educacao_fotos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

drop policy if exists educacao_fotos_insert_own on storage.objects;
create policy educacao_fotos_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'educacao_fotos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists educacao_fotos_select_own_or_staff on storage.objects;
create policy educacao_fotos_select_own_or_staff
on storage.objects
for select
to authenticated
using (
  bucket_id = 'educacao_fotos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or (select private.is_staff())
  )
);

drop policy if exists educacao_fotos_update_own on storage.objects;
create policy educacao_fotos_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'educacao_fotos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'educacao_fotos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists educacao_fotos_delete_own on storage.objects;
create policy educacao_fotos_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'educacao_fotos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
