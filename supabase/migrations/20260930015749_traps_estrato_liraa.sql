-- Estrato LIRAa passa a ser propriedade fixa da ovitrampa.
alter table public.traps
  add column if not exists estrato_liraa text;

-- Copia o valor mais recente informado nos ciclos para a armadilha correspondente.
update public.traps as t
set estrato_liraa = latest.estrato_liraa
from (
  select distinct on (c.trap_code) c.trap_code, c.estrato_liraa
  from public.cycles as c
  where nullif(trim(c.estrato_liraa), '') is not null
  order by c.trap_code, c.created_at desc
) as latest
where t.code = latest.trap_code
  and nullif(trim(t.estrato_liraa), '') is null;

-- A coluna cycles.estrato_liraa é mantida apenas como histórico; o app não grava mais nela.
comment on column public.cycles.estrato_liraa is 'Legado: use traps.estrato_liraa.';
