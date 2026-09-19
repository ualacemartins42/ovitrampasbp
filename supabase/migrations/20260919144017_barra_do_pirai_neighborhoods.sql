-- Catálogo oficial de bairros e distritos de Barra do Piraí.
-- Substitui os bairros fictícios do seed inicial.

create temporary table official_neighborhoods (
  name text primary key,
  zone text not null
);

insert into official_neighborhoods (name, zone)
values
  ('Centro', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Nossa Senhora de Santana', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Matadouro', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Muqueca', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Chácara Farani', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Maringá', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Oficinas Velhas', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Boca do Mato', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Santana de Barra', '1º Distrito (Sede / Centro e Adjacências)'),
  ('São José do Golfinho', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Cantão', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Vila Helena', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Vila Nova', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Vila Suíça', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Vila Rica', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Caieira Velha', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Caieira Nova', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Química', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Lago Azul', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Carthago', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Ponte Branca', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Ponte Preta', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Parque Santana', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Parque São Joaquim', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Morro do Gama', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Morro do Gavião', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Areal', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Carvão', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Roseira', '1º Distrito (Sede / Centro e Adjacências)'),
  ('São Luís da Barra', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Santo Antônio', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Vargem Grande', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Repouso', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Asa Branca', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Belvedere', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Caeiro', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Renascer', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Boa Sorte', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Arthur Cataldi', '1º Distrito (Sede / Centro e Adjacências)'),
  ('Ipiabas (Centro)', '2º Distrito (Ipiabas)'),
  ('Bairro Santo Antônio (Ipiabas)', '2º Distrito (Ipiabas)'),
  ('Áreas Periféricas / Rurais (Ipiabas)', '2º Distrito (Ipiabas)'),
  ('Vargem Alegre (Centro)', '3º Distrito (Vargem Alegre)'),
  ('Fazendinha', '3º Distrito (Vargem Alegre)'),
  ('Áreas Rurais (Vargem Alegre)', '3º Distrito (Vargem Alegre)'),
  ('Dorândia (Centro)', '4º Distrito (Dorândia)'),
  ('Venda de Cima', '4º Distrito (Dorândia)'),
  ('Áreas Rurais (Dorândia)', '4º Distrito (Dorândia)'),
  ('São José do Turvo (Centro)', '5º Distrito (São José do Turvo)'),
  ('Áreas Rurais / Fazendas (São José do Turvo)', '5º Distrito (São José do Turvo)'),
  ('Califórnia (Centro)', '6º Distrito (Califórnia)'),
  ('Boa Vista da Califórnia', '6º Distrito (Califórnia)'),
  ('Bairro de Fátima', '6º Distrito (Califórnia)'),
  ('Morada do Vale', '6º Distrito (Califórnia)'),
  ('Recanto Feliz', '6º Distrito (Califórnia)'),
  ('Cerâmica União', '6º Distrito (Califórnia)'),
  ('Santa Terezinha', '6º Distrito (Califórnia)'),
  ('São Francisco', '6º Distrito (Califórnia)');

insert into public.neighborhoods (name, zone)
select official.name, official.zone
from official_neighborhoods as official
where not exists (
  select 1
  from public.neighborhoods as existing
  where existing.name = official.name
);

update public.neighborhoods as existing
set zone = official.zone
from official_neighborhoods as official
where existing.name = official.name;

do $$
declare
  centro_id bigint;
begin
  select id into centro_id
  from public.neighborhoods
  where name = 'Centro'
  order by id
  limit 1;

  if centro_id is null then
    raise exception 'Bairro Centro não encontrado após o seed oficial.';
  end if;

  update public.properties
  set neighborhood_id = centro_id
  where neighborhood_id in (
    select id from public.neighborhoods
    where name not in (select name from official_neighborhoods)
  );

  update public.profiles
  set neighborhood_id = null
  where neighborhood_id in (
    select id from public.neighborhoods
    where name not in (select name from official_neighborhoods)
  );

  update public.traps
  set neighborhood_id = null
  where neighborhood_id in (
    select id from public.neighborhoods
    where name not in (select name from official_neighborhoods)
  );

  update public.collections
  set neighborhood_id = null
  where neighborhood_id in (
    select id from public.neighborhoods
    where name not in (select name from official_neighborhoods)
  );
end
$$;

delete from public.neighborhoods
where name not in (select name from official_neighborhoods);

drop table official_neighborhoods;
