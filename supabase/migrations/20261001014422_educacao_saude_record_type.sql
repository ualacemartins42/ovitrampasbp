-- Separa ações de Educação em Saúde das contagens de ovos que compartilham a tabela.
alter table public.educacao_saude
  add column if not exists record_type text not null default 'educacao';

update public.educacao_saude
set record_type = 'contagem'
where egg_count is not null
  and record_type = 'educacao';

alter table public.educacao_saude
  drop constraint if exists educacao_saude_record_type_check;

alter table public.educacao_saude
  add constraint educacao_saude_record_type_check
  check (record_type in ('educacao', 'contagem'));

create index if not exists educacao_saude_record_type_idx
  on public.educacao_saude (record_type, action_date desc);
