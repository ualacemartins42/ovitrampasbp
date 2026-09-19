-- Catálogo administrável de bairros e distritos de Barra do Piraí.

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.profiles as p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
    or lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'ovitrampasbp@gmail.com'
$$;

grant execute on function private.is_admin() to authenticated;

create table if not exists public.bairros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  distrito text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint bairros_nome_not_blank check (length(trim(nome)) > 0),
  constraint bairros_distrito_not_blank check (length(trim(distrito)) > 0)
);

create unique index if not exists bairros_nome_distrito_key
  on public.bairros (lower(trim(nome)), lower(trim(distrito)));

create index if not exists bairros_distrito_idx on public.bairros (distrito);
create index if not exists bairros_ativo_idx on public.bairros (ativo);

alter table public.bairros enable row level security;
alter table public.bairros force row level security;

create policy bairros_select_authenticated
on public.bairros
for select
to authenticated
using (true);

create policy bairros_insert_admin
on public.bairros
for insert
to authenticated
with check ((select private.is_admin()));

create policy bairros_update_admin
on public.bairros
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy bairros_delete_admin
on public.bairros
for delete
to authenticated
using ((select private.is_admin()));

insert into public.bairros (nome, distrito)
select seed.nome, seed.distrito
from (
  values
    ('Centro', '1º Distrito - Sede / Centro e Adjacências'),
    ('Nossa Senhora de Santana', '1º Distrito - Sede / Centro e Adjacências'),
    ('Matadouro', '1º Distrito - Sede / Centro e Adjacências'),
    ('Muqueca', '1º Distrito - Sede / Centro e Adjacências'),
    ('Chácara Farani', '1º Distrito - Sede / Centro e Adjacências'),
    ('Maringá', '1º Distrito - Sede / Centro e Adjacências'),
    ('Oficinas Velhas', '1º Distrito - Sede / Centro e Adjacências'),
    ('Boca do Mato', '1º Distrito - Sede / Centro e Adjacências'),
    ('Santana de Barra', '1º Distrito - Sede / Centro e Adjacências'),
    ('São José do Golfinho', '1º Distrito - Sede / Centro e Adjacências'),
    ('Cantão', '1º Distrito - Sede / Centro e Adjacências'),
    ('Vila Helena', '1º Distrito - Sede / Centro e Adjacências'),
    ('Vila Nova', '1º Distrito - Sede / Centro e Adjacências'),
    ('Vila Suíça', '1º Distrito - Sede / Centro e Adjacências'),
    ('Vila Rica', '1º Distrito - Sede / Centro e Adjacências'),
    ('Caieira Velha', '1º Distrito - Sede / Centro e Adjacências'),
    ('Caieira Nova', '1º Distrito - Sede / Centro e Adjacências'),
    ('Química', '1º Distrito - Sede / Centro e Adjacências'),
    ('Lago Azul', '1º Distrito - Sede / Centro e Adjacências'),
    ('Carthago', '1º Distrito - Sede / Centro e Adjacências'),
    ('Ponte Branca', '1º Distrito - Sede / Centro e Adjacências'),
    ('Ponte Preta', '1º Distrito - Sede / Centro e Adjacências'),
    ('Parque Santana', '1º Distrito - Sede / Centro e Adjacências'),
    ('Parque São Joaquim', '1º Distrito - Sede / Centro e Adjacências'),
    ('Morro do Gama', '1º Distrito - Sede / Centro e Adjacências'),
    ('Morro do Gavião', '1º Distrito - Sede / Centro e Adjacências'),
    ('Areal', '1º Distrito - Sede / Centro e Adjacências'),
    ('Carvão', '1º Distrito - Sede / Centro e Adjacências'),
    ('Roseira', '1º Distrito - Sede / Centro e Adjacências'),
    ('São Luís da Barra', '1º Distrito - Sede / Centro e Adjacências'),
    ('Santo Antônio', '1º Distrito - Sede / Centro e Adjacências'),
    ('Vargem Grande', '1º Distrito - Sede / Centro e Adjacências'),
    ('Repouso', '1º Distrito - Sede / Centro e Adjacências'),
    ('Asa Branca', '1º Distrito - Sede / Centro e Adjacências'),
    ('Belvedere', '1º Distrito - Sede / Centro e Adjacências'),
    ('Caeiro', '1º Distrito - Sede / Centro e Adjacências'),
    ('Renascer', '1º Distrito - Sede / Centro e Adjacências'),
    ('Boa Sorte', '1º Distrito - Sede / Centro e Adjacências'),
    ('Arthur Cataldi', '1º Distrito - Sede / Centro e Adjacências'),
    ('Ipiabas (Centro)', '2º Distrito - Ipiabas'),
    ('Bairro Santo Antônio (Ipiabas)', '2º Distrito - Ipiabas'),
    ('Áreas Periféricas / Rurais (Ipiabas)', '2º Distrito - Ipiabas'),
    ('Vargem Alegre (Centro)', '3º Distrito - Vargem Alegre'),
    ('Fazendinha', '3º Distrito - Vargem Alegre'),
    ('Áreas Rurais (Vargem Alegre)', '3º Distrito - Vargem Alegre'),
    ('Dorândia (Centro)', '4º Distrito - Dorândia'),
    ('Venda de Cima', '4º Distrito - Dorândia'),
    ('Áreas Rurais (Dorândia)', '4º Distrito - Dorândia'),
    ('São José do Turvo (Centro)', '5º Distrito - São José do Turvo'),
    ('Áreas Rurais / Fazendas (São José do Turvo)', '5º Distrito - São José do Turvo'),
    ('Califórnia (Centro)', '6º Distrito - Califórnia'),
    ('Boa Vista da Califórnia', '6º Distrito - Califórnia'),
    ('Bairro de Fátima', '6º Distrito - Califórnia'),
    ('Morada do Vale', '6º Distrito - Califórnia'),
    ('Recanto Feliz', '6º Distrito - Califórnia'),
    ('Cerâmica União', '6º Distrito - Califórnia'),
    ('Santa Terezinha', '6º Distrito - Califórnia'),
    ('São Francisco', '6º Distrito - Califórnia')
) as seed(nome, distrito)
where not exists (
  select 1
  from public.bairros as existing
  where lower(trim(existing.nome)) = lower(trim(seed.nome))
    and lower(trim(existing.distrito)) = lower(trim(seed.distrito))
);
