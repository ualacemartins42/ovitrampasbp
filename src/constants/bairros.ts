import type { Neighborhood } from '@/types/domain'
import { foldSearchText } from '@/lib/utils'

export const BAIRROS_CATALOG_VERSION = 3

export interface DistritoBarraDoPirai {
  number: number
  name: string
  neighborhoods: readonly string[]
}

/** Lista oficial de bairros ativos (soft-disable: demais permanecem no banco com ativo=false). */
export const BAIRROS_ATIVOS_OFICIAIS = [
  '10 DE MARCO',
  'AREAL',
  'ARTHUR CATALDI',
  'ASA BRANCA',
  'BELVEDERE',
  'BOA SORTE',
  'BOCA DO MATO',
  'CAIEIRA SAO PEDRO',
  'CAIXA D AGUA VELHA',
  'CAMPO BOM',
  'CARBOCALCIO',
  'CARLOS DE QUEIROZ',
  'CARVAO',
  'CENTRO',
  'CHACARA FARANI',
  'CHALET',
  'CHAMINE',
  'DR MESQUITA',
  'GROTA FUNDA',
  'LAGO AZUL',
  'MARACANA',
  'MATADOURO',
  'METALURGICA',
  'MORRO DO GAMA',
  'MORRO DO PARAISO',
  'MUQUECA',
  'N S SANTANA',
  'NOVO MEXICO',
  'OFICINAS VELHAS',
  'PARQUE SANTANA',
  'PARQUE SAO JOAQUIM',
  'PONTE DO ANDRADE',
  'PONTE PRETA',
  'PONTE VERMELHA',
  'QUIMICA',
  'REPRESA',
  'ROSEIRA',
  'SANTA BARBARA',
  'SANTA CECILIA',
  'SANTANA DE BARRA',
  'SANTO ANTONIO',
  'SANTO CRISTO',
  'SAO JOAO',
  'SAO JOSE',
  'SAO LUIZ',
  'VALE DO IPIRANGA',
  'VARGEM GRANDE',
  'VILA HELENA',
  'VILA SUICA',
  'IPIABAS',
  'VARGEM ALEGRE',
  'DORANDIA',
  'CENTRO (CALIFORNIA)',
  'MORADA DO VALE (CALIFORNIA)',
  'RECANTO FELIZ (CALIFORNIA)',
  'SAO LUIS DA BARRA (CALIFORNIA)',
  'SÃO FRANCISCO (CALIFORNIA)',
  'BOA VISTA DA BARRA (CALIFORNIA)',
  'SANTA TEREZINHA (CALIFORNIA)',
  'CERAMICA UNIAO (CALIFORNIA)',
  'BAIRRO DE FATIMA (CALIFORNIA)',
  'SAO JOSE DO TURVO',
] as const

const DISTRITO_SEDE = '1º Distrito - Sede / Centro e Adjacências'
const DISTRITO_IPIABAS = '2º Distrito - Ipiabas'
const DISTRITO_VARGEM_ALEGRE = '3º Distrito - Vargem Alegre'
const DISTRITO_DORANDIA = '4º Distrito - Dorândia'
const DISTRITO_TURVO = '5º Distrito - São José do Turvo'
const DISTRITO_CALIFORNIA = '6º Distrito - Califórnia'

/** Nomes canônicos + distrito sugerido ao inserir bairros oficiais ausentes. */
export const BAIRROS_ATIVOS_SEED: ReadonlyArray<{ nome: string; distrito: string; matchKeys: readonly string[] }> = [
  { nome: '10 de Março', distrito: DISTRITO_SEDE, matchKeys: ['10 de marco', '10 de marco'] },
  { nome: 'Areal', distrito: DISTRITO_SEDE, matchKeys: ['areal'] },
  { nome: 'Arthur Cataldi', distrito: DISTRITO_SEDE, matchKeys: ['arthur cataldi'] },
  { nome: 'Asa Branca', distrito: DISTRITO_SEDE, matchKeys: ['asa branca'] },
  { nome: 'Belvedere', distrito: DISTRITO_SEDE, matchKeys: ['belvedere'] },
  { nome: 'Boa Sorte', distrito: DISTRITO_SEDE, matchKeys: ['boa sorte'] },
  { nome: 'Boca do Mato', distrito: DISTRITO_SEDE, matchKeys: ['boca do mato'] },
  { nome: 'Caieira São Pedro', distrito: DISTRITO_SEDE, matchKeys: ['caieira sao pedro'] },
  { nome: 'Caixa d Água Velha', distrito: DISTRITO_SEDE, matchKeys: ['caixa d agua velha', 'caixa dagua velha'] },
  { nome: 'Campo Bom', distrito: DISTRITO_SEDE, matchKeys: ['campo bom'] },
  { nome: 'Carbocálcio', distrito: DISTRITO_SEDE, matchKeys: ['carbocalcio'] },
  { nome: 'Carlos de Queiroz', distrito: DISTRITO_SEDE, matchKeys: ['carlos de queiroz'] },
  { nome: 'Carvão', distrito: DISTRITO_SEDE, matchKeys: ['carvao'] },
  { nome: 'Centro', distrito: DISTRITO_SEDE, matchKeys: ['centro'] },
  { nome: 'Chácara Farani', distrito: DISTRITO_SEDE, matchKeys: ['chacara farani'] },
  { nome: 'Chalet', distrito: DISTRITO_SEDE, matchKeys: ['chalet'] },
  { nome: 'Chaminé', distrito: DISTRITO_SEDE, matchKeys: ['chamine'] },
  { nome: 'Dr Mesquita', distrito: DISTRITO_SEDE, matchKeys: ['dr mesquita', 'doutor mesquita'] },
  { nome: 'Grota Funda', distrito: DISTRITO_SEDE, matchKeys: ['grota funda'] },
  { nome: 'Lago Azul', distrito: DISTRITO_SEDE, matchKeys: ['lago azul'] },
  { nome: 'Maracanã', distrito: DISTRITO_SEDE, matchKeys: ['maracana'] },
  { nome: 'Matadouro', distrito: DISTRITO_SEDE, matchKeys: ['matadouro'] },
  { nome: 'Metalúrgica', distrito: DISTRITO_SEDE, matchKeys: ['metalurgica'] },
  { nome: 'Morro do Gama', distrito: DISTRITO_SEDE, matchKeys: ['morro do gama'] },
  { nome: 'Morro do Paraíso', distrito: DISTRITO_SEDE, matchKeys: ['morro do paraiso'] },
  { nome: 'Muqueca', distrito: DISTRITO_SEDE, matchKeys: ['muqueca'] },
  {
    nome: 'N S Santana',
    distrito: DISTRITO_SEDE,
    matchKeys: ['n s santana', 'ns santana', 'nossa senhora de santana', 'nossa senhora santana'],
  },
  { nome: 'Novo México', distrito: DISTRITO_SEDE, matchKeys: ['novo mexico'] },
  { nome: 'Oficinas Velhas', distrito: DISTRITO_SEDE, matchKeys: ['oficinas velhas'] },
  { nome: 'Parque Santana', distrito: DISTRITO_SEDE, matchKeys: ['parque santana'] },
  { nome: 'Parque São Joaquim', distrito: DISTRITO_SEDE, matchKeys: ['parque sao joaquim'] },
  { nome: 'Ponte do Andrade', distrito: DISTRITO_SEDE, matchKeys: ['ponte do andrade'] },
  { nome: 'Ponte Preta', distrito: DISTRITO_SEDE, matchKeys: ['ponte preta'] },
  { nome: 'Ponte Vermelha', distrito: DISTRITO_SEDE, matchKeys: ['ponte vermelha'] },
  { nome: 'Química', distrito: DISTRITO_SEDE, matchKeys: ['quimica'] },
  { nome: 'Represa', distrito: DISTRITO_SEDE, matchKeys: ['represa'] },
  { nome: 'Roseira', distrito: DISTRITO_SEDE, matchKeys: ['roseira'] },
  { nome: 'Santa Bárbara', distrito: DISTRITO_SEDE, matchKeys: ['santa barbara'] },
  { nome: 'Santa Cecília', distrito: DISTRITO_SEDE, matchKeys: ['santa cecilia'] },
  { nome: 'Santana de Barra', distrito: DISTRITO_SEDE, matchKeys: ['santana de barra'] },
  { nome: 'Santo Antônio', distrito: DISTRITO_SEDE, matchKeys: ['santo antonio'] },
  { nome: 'Santo Cristo', distrito: DISTRITO_SEDE, matchKeys: ['santo cristo'] },
  { nome: 'São João', distrito: DISTRITO_SEDE, matchKeys: ['sao joao'] },
  { nome: 'São José', distrito: DISTRITO_SEDE, matchKeys: ['sao jose'] },
  { nome: 'São Luiz', distrito: DISTRITO_SEDE, matchKeys: ['sao luiz', 'sao luis'] },
  { nome: 'Vale do Ipiranga', distrito: DISTRITO_SEDE, matchKeys: ['vale do ipiranga'] },
  { nome: 'Vargem Grande', distrito: DISTRITO_SEDE, matchKeys: ['vargem grande'] },
  { nome: 'Vila Helena', distrito: DISTRITO_SEDE, matchKeys: ['vila helena'] },
  { nome: 'Vila Suíça', distrito: DISTRITO_SEDE, matchKeys: ['vila suica'] },
  { nome: 'Ipiabas', distrito: DISTRITO_IPIABAS, matchKeys: ['ipiabas', 'ipiabas centro'] },
  { nome: 'Vargem Alegre', distrito: DISTRITO_VARGEM_ALEGRE, matchKeys: ['vargem alegre', 'vargem alegre centro'] },
  { nome: 'Dorândia', distrito: DISTRITO_DORANDIA, matchKeys: ['dorandia', 'dorandia centro'] },
  {
    nome: 'Centro (Califórnia)',
    distrito: DISTRITO_CALIFORNIA,
    matchKeys: ['centro california', 'california centro'],
  },
  {
    nome: 'Morada do Vale (Califórnia)',
    distrito: DISTRITO_CALIFORNIA,
    matchKeys: ['morada do vale california', 'morada do vale'],
  },
  {
    nome: 'Recanto Feliz (Califórnia)',
    distrito: DISTRITO_CALIFORNIA,
    matchKeys: ['recanto feliz california', 'recanto feliz'],
  },
  {
    nome: 'São Luís da Barra (Califórnia)',
    distrito: DISTRITO_CALIFORNIA,
    matchKeys: ['sao luis da barra california', 'sao luis da barra', 'sao luiz da barra'],
  },
  {
    nome: 'São Francisco (Califórnia)',
    distrito: DISTRITO_CALIFORNIA,
    matchKeys: ['sao francisco california', 'sao francisco'],
  },
  {
    nome: 'Boa Vista da Barra (Califórnia)',
    distrito: DISTRITO_CALIFORNIA,
    matchKeys: ['boa vista da barra california', 'boa vista da california', 'boa vista da barra'],
  },
  {
    nome: 'Santa Terezinha (Califórnia)',
    distrito: DISTRITO_CALIFORNIA,
    matchKeys: ['santa terezinha california', 'santa terezinha'],
  },
  {
    nome: 'Cerâmica União (Califórnia)',
    distrito: DISTRITO_CALIFORNIA,
    matchKeys: ['ceramica uniao california', 'ceramica uniao'],
  },
  {
    nome: 'Bairro de Fátima (Califórnia)',
    distrito: DISTRITO_CALIFORNIA,
    matchKeys: ['bairro de fatima california', 'bairro de fatima'],
  },
  {
    nome: 'São José do Turvo',
    distrito: DISTRITO_TURVO,
    matchKeys: ['sao jose do turvo', 'sao jose do turvo centro'],
  },
]

function foldBairroKey(value: string): string {
  return foldSearchText(value)
    .replace(/['’`]/g, '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasCaliforniaContext(nome: string, distrito = ''): boolean {
  const blob = foldBairroKey(`${nome} ${distrito}`)
  return blob.includes('california')
}

/**
 * Resolve se um nome cadastrado corresponde a um bairro da lista oficial ativa.
 * Prefere chaves mais longas (ex.: "São José do Turvo" antes de "São José").
 */
export function matchOfficialActiveBairro(
  nome: string,
  distrito = '',
): (typeof BAIRROS_ATIVOS_SEED)[number] | null {
  const key = foldBairroKey(nome)
  const inCalifornia = hasCaliforniaContext(nome, distrito)

  const ranked = [...BAIRROS_ATIVOS_SEED].sort(
    (left, right) =>
      Math.max(...right.matchKeys.map((item) => item.length)) -
      Math.max(...left.matchKeys.map((item) => item.length)),
  )

  for (const seed of ranked) {
    const seedIsCalifornia = seed.distrito === DISTRITO_CALIFORNIA
    if (!seed.matchKeys.includes(key)) continue

    // Bairros do 6º distrito (Califórnia): exige contexto Califórnia no nome ou distrito,
    // exceto quando a chave de match já inclui "california".
    if (seedIsCalifornia) {
      const keyImpliesCalifornia = key.includes('california')
      if (!inCalifornia && !keyImpliesCalifornia) continue
    } else if (inCalifornia) {
      continue
    }

    return seed
  }

  return null
}

export function isOfficialActiveBairroName(nome: string, distrito = ''): boolean {
  return matchOfficialActiveBairro(nome, distrito) != null
}

export const BARRA_DO_PIRAI_DISTRITOS: readonly DistritoBarraDoPirai[] = [
  {
    number: 1,
    name: 'Sede / Centro e Adjacências',
    neighborhoods: [
      'Centro',
      'Nossa Senhora de Santana',
      'Matadouro',
      'Muqueca',
      'Chácara Farani',
      'Maringá',
      'Oficinas Velhas',
      'Boca do Mato',
      'Santana de Barra',
      'São José do Golfinho',
      'Cantão',
      'Vila Helena',
      'Vila Nova',
      'Vila Suíça',
      'Vila Rica',
      'Caieira Velha',
      'Caieira Nova',
      'Química',
      'Lago Azul',
      'Carthago',
      'Ponte Branca',
      'Ponte Preta',
      'Parque Santana',
      'Parque São Joaquim',
      'Morro do Gama',
      'Morro do Gavião',
      'Areal',
      'Carvão',
      'Roseira',
      'São Luís da Barra',
      'Santo Antônio',
      'Vargem Grande',
      'Repouso',
      'Asa Branca',
      'Belvedere',
      'Caeiro',
      'Renascer',
      'Boa Sorte',
      'Arthur Cataldi',
    ],
  },
  {
    number: 2,
    name: 'Ipiabas',
    neighborhoods: ['Ipiabas (Centro)', 'Bairro Santo Antônio (Ipiabas)', 'Áreas Periféricas / Rurais (Ipiabas)'],
  },
  {
    number: 3,
    name: 'Vargem Alegre',
    neighborhoods: ['Vargem Alegre (Centro)', 'Fazendinha', 'Áreas Rurais (Vargem Alegre)'],
  },
  {
    number: 4,
    name: 'Dorândia',
    neighborhoods: ['Dorândia (Centro)', 'Venda de Cima', 'Áreas Rurais (Dorândia)'],
  },
  {
    number: 5,
    name: 'São José do Turvo',
    neighborhoods: ['São José do Turvo (Centro)', 'Áreas Rurais / Fazendas (São José do Turvo)'],
  },
  {
    number: 6,
    name: 'Califórnia',
    neighborhoods: [
      'Califórnia (Centro)',
      'Boa Vista da Califórnia',
      'Bairro de Fátima',
      'Morada do Vale',
      'Recanto Feliz',
      'Cerâmica União',
      'Santa Terezinha',
      'São Francisco',
    ],
  },
]

export function districtZone(district: Pick<DistritoBarraDoPirai, 'number' | 'name'>): string {
  return `${district.number}º Distrito - ${district.name}`
}

export const BARRA_DO_PIRAI_DISTRITO_OPTIONS = BARRA_DO_PIRAI_DISTRITOS.map((district) => districtZone(district))

export function districtGroupLabel(zone: string): string {
  const paren = zone.match(/^(\d+º Distrito) \((.+)\)$/)
  if (paren) return `${paren[1]} – ${paren[2]}`
  const dash = zone.match(/^(\d+º Distrito) - (.+)$/)
  if (dash) return `${dash[1]} – ${dash[2]}`
  return zone
}

export function formatNeighborhoodLabel(neighborhood: Pick<Neighborhood, 'name' | 'zone'>): string {
  return `${neighborhood.name} - ${neighborhood.zone}`
}

export function neighborhoodLabelById(
  neighborhoods: Neighborhood[],
  id: number | null | undefined,
  fallback = 'Sem bairro',
): string {
  if (id == null) return fallback
  const match = neighborhoods.find((item) => item.id === id)
  return match ? formatNeighborhoodLabel(match) : fallback
}

export const BARRA_DO_PIRAI_BAIRROS: Neighborhood[] = BARRA_DO_PIRAI_DISTRITOS.flatMap((district, districtIndex) => {
  const previousCount = BARRA_DO_PIRAI_DISTRITOS.slice(0, districtIndex).reduce(
    (total, item) => total + item.neighborhoods.length,
    0,
  )
  const zone = districtZone(district)
  return district.neighborhoods.map((name, index) => ({
    id: previousCount + index + 1,
    name,
    zone,
    active: isOfficialActiveBairroName(name, zone),
  }))
})

export function groupNeighborhoodsByDistrict(rows: Neighborhood[]): Array<{ label: string; items: Neighborhood[] }> {
  const source = rows.length > 0 ? rows : BARRA_DO_PIRAI_BAIRROS
  const groups = new Map<string, Neighborhood[]>()
  const order: string[] = []

  const sorted = [...source].sort((left, right) => {
    const byDistrict = districtNumber(left.zone) - districtNumber(right.zone)
    if (byDistrict !== 0) return byDistrict
    return left.name.localeCompare(right.name, 'pt-BR')
  })

  for (const item of sorted) {
    const label = districtGroupLabel(item.zone)
    if (!groups.has(label)) {
      groups.set(label, [])
      order.push(label)
    }
    groups.get(label)?.push(item)
  }

  return order.map((label) => ({ label, items: groups.get(label) ?? [] }))
}

function districtNumber(zone: string): number {
  const match = zone.match(/^(\d+)/)
  return match ? Number(match[1]) : 99
}
