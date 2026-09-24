-- Estrato LIRAa informado na instalação do ciclo.
alter table public.cycles
  add column if not exists estrato_liraa text;
