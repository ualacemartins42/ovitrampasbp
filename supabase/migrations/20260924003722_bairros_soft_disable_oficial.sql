-- Soft-disable da lista oficial de bairros.
-- Não apaga registros: apenas ajusta o flag `ativo` e insere oficiais ausentes.

create extension if not exists unaccent with schema extensions;

create or replace function private.fold_bairro_nome(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(
    both ' '
    from regexp_replace(
      lower(extensions.unaccent(coalesce(value, ''))),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

-- Desativa todos; em seguida reativa apenas os que batem com a lista oficial.
update public.bairros set ativo = false;

with oficial(nome_canonico, distrito, match_key, requires_california) as (
  values
    ('10 de Março', '1º Distrito - Sede / Centro e Adjacências', '10 de marco', false),
    ('Areal', '1º Distrito - Sede / Centro e Adjacências', 'areal', false),
    ('Arthur Cataldi', '1º Distrito - Sede / Centro e Adjacências', 'arthur cataldi', false),
    ('Asa Branca', '1º Distrito - Sede / Centro e Adjacências', 'asa branca', false),
    ('Belvedere', '1º Distrito - Sede / Centro e Adjacências', 'belvedere', false),
    ('Boa Sorte', '1º Distrito - Sede / Centro e Adjacências', 'boa sorte', false),
    ('Boca do Mato', '1º Distrito - Sede / Centro e Adjacências', 'boca do mato', false),
    ('Caieira São Pedro', '1º Distrito - Sede / Centro e Adjacências', 'caieira sao pedro', false),
    ('Caixa d Água Velha', '1º Distrito - Sede / Centro e Adjacências', 'caixa d agua velha', false),
    ('Caixa d Água Velha', '1º Distrito - Sede / Centro e Adjacências', 'caixa dagua velha', false),
    ('Campo Bom', '1º Distrito - Sede / Centro e Adjacências', 'campo bom', false),
    ('Carbocálcio', '1º Distrito - Sede / Centro e Adjacências', 'carbocalcio', false),
    ('Carlos de Queiroz', '1º Distrito - Sede / Centro e Adjacências', 'carlos de queiroz', false),
    ('Carvão', '1º Distrito - Sede / Centro e Adjacências', 'carvao', false),
    ('Centro', '1º Distrito - Sede / Centro e Adjacências', 'centro', false),
    ('Chácara Farani', '1º Distrito - Sede / Centro e Adjacências', 'chacara farani', false),
    ('Chalet', '1º Distrito - Sede / Centro e Adjacências', 'chalet', false),
    ('Chaminé', '1º Distrito - Sede / Centro e Adjacências', 'chamine', false),
    ('Dr Mesquita', '1º Distrito - Sede / Centro e Adjacências', 'dr mesquita', false),
    ('Dr Mesquita', '1º Distrito - Sede / Centro e Adjacências', 'doutor mesquita', false),
    ('Grota Funda', '1º Distrito - Sede / Centro e Adjacências', 'grota funda', false),
    ('Lago Azul', '1º Distrito - Sede / Centro e Adjacências', 'lago azul', false),
    ('Maracanã', '1º Distrito - Sede / Centro e Adjacências', 'maracana', false),
    ('Matadouro', '1º Distrito - Sede / Centro e Adjacências', 'matadouro', false),
    ('Metalúrgica', '1º Distrito - Sede / Centro e Adjacências', 'metalurgica', false),
    ('Morro do Gama', '1º Distrito - Sede / Centro e Adjacências', 'morro do gama', false),
    ('Morro do Paraíso', '1º Distrito - Sede / Centro e Adjacências', 'morro do paraiso', false),
    ('Muqueca', '1º Distrito - Sede / Centro e Adjacências', 'muqueca', false),
    ('N S Santana', '1º Distrito - Sede / Centro e Adjacências', 'n s santana', false),
    ('N S Santana', '1º Distrito - Sede / Centro e Adjacências', 'ns santana', false),
    ('N S Santana', '1º Distrito - Sede / Centro e Adjacências', 'nossa senhora de santana', false),
    ('N S Santana', '1º Distrito - Sede / Centro e Adjacências', 'nossa senhora santana', false),
    ('Novo México', '1º Distrito - Sede / Centro e Adjacências', 'novo mexico', false),
    ('Oficinas Velhas', '1º Distrito - Sede / Centro e Adjacências', 'oficinas velhas', false),
    ('Parque Santana', '1º Distrito - Sede / Centro e Adjacências', 'parque santana', false),
    ('Parque São Joaquim', '1º Distrito - Sede / Centro e Adjacências', 'parque sao joaquim', false),
    ('Ponte do Andrade', '1º Distrito - Sede / Centro e Adjacências', 'ponte do andrade', false),
    ('Ponte Preta', '1º Distrito - Sede / Centro e Adjacências', 'ponte preta', false),
    ('Ponte Vermelha', '1º Distrito - Sede / Centro e Adjacências', 'ponte vermelha', false),
    ('Química', '1º Distrito - Sede / Centro e Adjacências', 'quimica', false),
    ('Represa', '1º Distrito - Sede / Centro e Adjacências', 'represa', false),
    ('Roseira', '1º Distrito - Sede / Centro e Adjacências', 'roseira', false),
    ('Santa Bárbara', '1º Distrito - Sede / Centro e Adjacências', 'santa barbara', false),
    ('Santa Cecília', '1º Distrito - Sede / Centro e Adjacências', 'santa cecilia', false),
    ('Santana de Barra', '1º Distrito - Sede / Centro e Adjacências', 'santana de barra', false),
    ('Santo Antônio', '1º Distrito - Sede / Centro e Adjacências', 'santo antonio', false),
    ('Santo Cristo', '1º Distrito - Sede / Centro e Adjacências', 'santo cristo', false),
    ('São João', '1º Distrito - Sede / Centro e Adjacências', 'sao joao', false),
    ('São José', '1º Distrito - Sede / Centro e Adjacências', 'sao jose', false),
    ('São Luiz', '1º Distrito - Sede / Centro e Adjacências', 'sao luiz', false),
    ('São Luiz', '1º Distrito - Sede / Centro e Adjacências', 'sao luis', false),
    ('Vale do Ipiranga', '1º Distrito - Sede / Centro e Adjacências', 'vale do ipiranga', false),
    ('Vargem Grande', '1º Distrito - Sede / Centro e Adjacências', 'vargem grande', false),
    ('Vila Helena', '1º Distrito - Sede / Centro e Adjacências', 'vila helena', false),
    ('Vila Suíça', '1º Distrito - Sede / Centro e Adjacências', 'vila suica', false),
    ('Ipiabas', '2º Distrito - Ipiabas', 'ipiabas', false),
    ('Ipiabas', '2º Distrito - Ipiabas', 'ipiabas centro', false),
    ('Vargem Alegre', '3º Distrito - Vargem Alegre', 'vargem alegre', false),
    ('Vargem Alegre', '3º Distrito - Vargem Alegre', 'vargem alegre centro', false),
    ('Dorândia', '4º Distrito - Dorândia', 'dorandia', false),
    ('Dorândia', '4º Distrito - Dorândia', 'dorandia centro', false),
    ('Centro (Califórnia)', '6º Distrito - Califórnia', 'centro california', true),
    ('Centro (Califórnia)', '6º Distrito - Califórnia', 'california centro', true),
    ('Morada do Vale (Califórnia)', '6º Distrito - Califórnia', 'morada do vale california', true),
    ('Morada do Vale (Califórnia)', '6º Distrito - Califórnia', 'morada do vale', true),
    ('Recanto Feliz (Califórnia)', '6º Distrito - Califórnia', 'recanto feliz california', true),
    ('Recanto Feliz (Califórnia)', '6º Distrito - Califórnia', 'recanto feliz', true),
    ('São Luís da Barra (Califórnia)', '6º Distrito - Califórnia', 'sao luis da barra california', true),
    ('São Luís da Barra (Califórnia)', '6º Distrito - Califórnia', 'sao luis da barra', true),
    ('São Luís da Barra (Califórnia)', '6º Distrito - Califórnia', 'sao luiz da barra', true),
    ('São Francisco (Califórnia)', '6º Distrito - Califórnia', 'sao francisco california', true),
    ('São Francisco (Califórnia)', '6º Distrito - Califórnia', 'sao francisco', true),
    ('Boa Vista da Barra (Califórnia)', '6º Distrito - Califórnia', 'boa vista da barra california', true),
    ('Boa Vista da Barra (Califórnia)', '6º Distrito - Califórnia', 'boa vista da california', true),
    ('Boa Vista da Barra (Califórnia)', '6º Distrito - Califórnia', 'boa vista da barra', true),
    ('Santa Terezinha (Califórnia)', '6º Distrito - Califórnia', 'santa terezinha california', true),
    ('Santa Terezinha (Califórnia)', '6º Distrito - Califórnia', 'santa terezinha', true),
    ('Cerâmica União (Califórnia)', '6º Distrito - Califórnia', 'ceramica uniao california', true),
    ('Cerâmica União (Califórnia)', '6º Distrito - Califórnia', 'ceramica uniao', true),
    ('Bairro de Fátima (Califórnia)', '6º Distrito - Califórnia', 'bairro de fatima california', true),
    ('Bairro de Fátima (Califórnia)', '6º Distrito - Califórnia', 'bairro de fatima', true),
    ('São José do Turvo', '5º Distrito - São José do Turvo', 'sao jose do turvo', false),
    ('São José do Turvo', '5º Distrito - São José do Turvo', 'sao jose do turvo centro', false)
),
matched as (
  select distinct on (b.id) b.id
  from public.bairros as b
  join oficial as o
    on private.fold_bairro_nome(b.nome) = o.match_key
  where
    case
      when o.requires_california then
        private.fold_bairro_nome(b.nome || ' ' || b.distrito) like '%california%'
        or o.match_key like '%california%'
      else
        private.fold_bairro_nome(b.nome || ' ' || b.distrito) not like '%california%'
    end
  order by b.id, length(o.match_key) desc
)
update public.bairros as b
set ativo = true
from matched as m
where b.id = m.id;

-- Insere oficiais ausentes (sem apagar históricos).
with oficial_nomes(nome, distrito, match_key) as (
  values
    ('10 de Março', '1º Distrito - Sede / Centro e Adjacências', '10 de marco'),
    ('Areal', '1º Distrito - Sede / Centro e Adjacências', 'areal'),
    ('Arthur Cataldi', '1º Distrito - Sede / Centro e Adjacências', 'arthur cataldi'),
    ('Asa Branca', '1º Distrito - Sede / Centro e Adjacências', 'asa branca'),
    ('Belvedere', '1º Distrito - Sede / Centro e Adjacências', 'belvedere'),
    ('Boa Sorte', '1º Distrito - Sede / Centro e Adjacências', 'boa sorte'),
    ('Boca do Mato', '1º Distrito - Sede / Centro e Adjacências', 'boca do mato'),
    ('Caieira São Pedro', '1º Distrito - Sede / Centro e Adjacências', 'caieira sao pedro'),
    ('Caixa d Água Velha', '1º Distrito - Sede / Centro e Adjacências', 'caixa d agua velha'),
    ('Caixa d Água Velha', '1º Distrito - Sede / Centro e Adjacências', 'caixa dagua velha'),
    ('Campo Bom', '1º Distrito - Sede / Centro e Adjacências', 'campo bom'),
    ('Carbocálcio', '1º Distrito - Sede / Centro e Adjacências', 'carbocalcio'),
    ('Carlos de Queiroz', '1º Distrito - Sede / Centro e Adjacências', 'carlos de queiroz'),
    ('Carvão', '1º Distrito - Sede / Centro e Adjacências', 'carvao'),
    ('Centro', '1º Distrito - Sede / Centro e Adjacências', 'centro'),
    ('Chácara Farani', '1º Distrito - Sede / Centro e Adjacências', 'chacara farani'),
    ('Chalet', '1º Distrito - Sede / Centro e Adjacências', 'chalet'),
    ('Chaminé', '1º Distrito - Sede / Centro e Adjacências', 'chamine'),
    ('Dr Mesquita', '1º Distrito - Sede / Centro e Adjacências', 'dr mesquita'),
    ('Dr Mesquita', '1º Distrito - Sede / Centro e Adjacências', 'doutor mesquita'),
    ('Grota Funda', '1º Distrito - Sede / Centro e Adjacências', 'grota funda'),
    ('Lago Azul', '1º Distrito - Sede / Centro e Adjacências', 'lago azul'),
    ('Maracanã', '1º Distrito - Sede / Centro e Adjacências', 'maracana'),
    ('Matadouro', '1º Distrito - Sede / Centro e Adjacências', 'matadouro'),
    ('Metalúrgica', '1º Distrito - Sede / Centro e Adjacências', 'metalurgica'),
    ('Morro do Gama', '1º Distrito - Sede / Centro e Adjacências', 'morro do gama'),
    ('Morro do Paraíso', '1º Distrito - Sede / Centro e Adjacências', 'morro do paraiso'),
    ('Muqueca', '1º Distrito - Sede / Centro e Adjacências', 'muqueca'),
    ('N S Santana', '1º Distrito - Sede / Centro e Adjacências', 'n s santana'),
    ('N S Santana', '1º Distrito - Sede / Centro e Adjacências', 'ns santana'),
    ('N S Santana', '1º Distrito - Sede / Centro e Adjacências', 'nossa senhora de santana'),
    ('N S Santana', '1º Distrito - Sede / Centro e Adjacências', 'nossa senhora santana'),
    ('Novo México', '1º Distrito - Sede / Centro e Adjacências', 'novo mexico'),
    ('Oficinas Velhas', '1º Distrito - Sede / Centro e Adjacências', 'oficinas velhas'),
    ('Parque Santana', '1º Distrito - Sede / Centro e Adjacências', 'parque santana'),
    ('Parque São Joaquim', '1º Distrito - Sede / Centro e Adjacências', 'parque sao joaquim'),
    ('Ponte do Andrade', '1º Distrito - Sede / Centro e Adjacências', 'ponte do andrade'),
    ('Ponte Preta', '1º Distrito - Sede / Centro e Adjacências', 'ponte preta'),
    ('Ponte Vermelha', '1º Distrito - Sede / Centro e Adjacências', 'ponte vermelha'),
    ('Química', '1º Distrito - Sede / Centro e Adjacências', 'quimica'),
    ('Represa', '1º Distrito - Sede / Centro e Adjacências', 'represa'),
    ('Roseira', '1º Distrito - Sede / Centro e Adjacências', 'roseira'),
    ('Santa Bárbara', '1º Distrito - Sede / Centro e Adjacências', 'santa barbara'),
    ('Santa Cecília', '1º Distrito - Sede / Centro e Adjacências', 'santa cecilia'),
    ('Santana de Barra', '1º Distrito - Sede / Centro e Adjacências', 'santana de barra'),
    ('Santo Antônio', '1º Distrito - Sede / Centro e Adjacências', 'santo antonio'),
    ('Santo Cristo', '1º Distrito - Sede / Centro e Adjacências', 'santo cristo'),
    ('São João', '1º Distrito - Sede / Centro e Adjacências', 'sao joao'),
    ('São José', '1º Distrito - Sede / Centro e Adjacências', 'sao jose'),
    ('São Luiz', '1º Distrito - Sede / Centro e Adjacências', 'sao luiz'),
    ('São Luiz', '1º Distrito - Sede / Centro e Adjacências', 'sao luis'),
    ('Vale do Ipiranga', '1º Distrito - Sede / Centro e Adjacências', 'vale do ipiranga'),
    ('Vargem Grande', '1º Distrito - Sede / Centro e Adjacências', 'vargem grande'),
    ('Vila Helena', '1º Distrito - Sede / Centro e Adjacências', 'vila helena'),
    ('Vila Suíça', '1º Distrito - Sede / Centro e Adjacências', 'vila suica'),
    ('Ipiabas', '2º Distrito - Ipiabas', 'ipiabas'),
    ('Ipiabas', '2º Distrito - Ipiabas', 'ipiabas centro'),
    ('Vargem Alegre', '3º Distrito - Vargem Alegre', 'vargem alegre'),
    ('Vargem Alegre', '3º Distrito - Vargem Alegre', 'vargem alegre centro'),
    ('Dorândia', '4º Distrito - Dorândia', 'dorandia'),
    ('Dorândia', '4º Distrito - Dorândia', 'dorandia centro'),
    ('Centro (Califórnia)', '6º Distrito - Califórnia', 'centro california'),
    ('Centro (Califórnia)', '6º Distrito - Califórnia', 'california centro'),
    ('Morada do Vale (Califórnia)', '6º Distrito - Califórnia', 'morada do vale california'),
    ('Morada do Vale (Califórnia)', '6º Distrito - Califórnia', 'morada do vale'),
    ('Recanto Feliz (Califórnia)', '6º Distrito - Califórnia', 'recanto feliz california'),
    ('Recanto Feliz (Califórnia)', '6º Distrito - Califórnia', 'recanto feliz'),
    ('São Luís da Barra (Califórnia)', '6º Distrito - Califórnia', 'sao luis da barra california'),
    ('São Luís da Barra (Califórnia)', '6º Distrito - Califórnia', 'sao luis da barra'),
    ('São Luís da Barra (Califórnia)', '6º Distrito - Califórnia', 'sao luiz da barra'),
    ('São Francisco (Califórnia)', '6º Distrito - Califórnia', 'sao francisco california'),
    ('São Francisco (Califórnia)', '6º Distrito - Califórnia', 'sao francisco'),
    ('Boa Vista da Barra (Califórnia)', '6º Distrito - Califórnia', 'boa vista da barra california'),
    ('Boa Vista da Barra (Califórnia)', '6º Distrito - Califórnia', 'boa vista da california'),
    ('Boa Vista da Barra (Califórnia)', '6º Distrito - Califórnia', 'boa vista da barra'),
    ('Santa Terezinha (Califórnia)', '6º Distrito - Califórnia', 'santa terezinha california'),
    ('Santa Terezinha (Califórnia)', '6º Distrito - Califórnia', 'santa terezinha'),
    ('Cerâmica União (Califórnia)', '6º Distrito - Califórnia', 'ceramica uniao california'),
    ('Cerâmica União (Califórnia)', '6º Distrito - Califórnia', 'ceramica uniao'),
    ('Bairro de Fátima (Califórnia)', '6º Distrito - Califórnia', 'bairro de fatima california'),
    ('Bairro de Fátima (Califórnia)', '6º Distrito - Califórnia', 'bairro de fatima'),
    ('São José do Turvo', '5º Distrito - São José do Turvo', 'sao jose do turvo'),
    ('São José do Turvo', '5º Distrito - São José do Turvo', 'sao jose do turvo centro')
),
seed_unique as (
  select distinct nome, distrito from oficial_nomes
)
insert into public.bairros (nome, distrito, ativo)
select s.nome, s.distrito, true
from seed_unique as s
where not exists (
  select 1
  from public.bairros as existing
  join oficial_nomes as o on o.nome = s.nome
  where existing.ativo = true
    and private.fold_bairro_nome(existing.nome) = o.match_key
);
