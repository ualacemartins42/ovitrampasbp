-- Contagem de ovos e vínculo opcional com o ciclo da ovitrampa.
alter table public.educacao_saude
  add column if not exists egg_count integer;

alter table public.educacao_saude
  add column if not exists cycle_id uuid;

alter table public.educacao_saude
  alter column action_taken drop not null;
