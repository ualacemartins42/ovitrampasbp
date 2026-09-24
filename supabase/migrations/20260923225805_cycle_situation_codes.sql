-- Padroniza situações de troca/retirada para códigos 0–9 (texto).
-- Mapeia o enum legado: normal→0, seca→5, ausente→2, danificada→3.

alter table public.cycles
  alter column swap_situation type text
  using (
    case swap_situation::text
      when 'normal' then '0'
      when 'seca' then '5'
      when 'ausente' then '2'
      when 'danificada' then '3'
      else swap_situation::text
    end
  );

alter table public.cycles
  alter column remove_situation type text
  using (
    case remove_situation::text
      when 'normal' then '0'
      when 'seca' then '5'
      when 'ausente' then '2'
      when 'danificada' then '3'
      else remove_situation::text
    end
  );

drop type if exists public.cycle_situation;
