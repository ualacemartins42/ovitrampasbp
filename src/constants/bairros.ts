import type { Neighborhood } from '@/types/domain'

export const BAIRROS_CATALOG_VERSION = 2

export interface DistritoBarraDoPirai {
  number: number
  name: string
  neighborhoods: readonly string[]
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
    active: true,
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
