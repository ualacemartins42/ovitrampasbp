import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const AGENT_ID = '6158a3b4-8363-4b31-9821-476953f091ad'
const XLSX_PATH = path.resolve('tmp-ovitrampas-export.xlsx')
const SQL_PATH = path.resolve('tmp-import-ovitrampas.sql')
const WEEK_ONE_START = Date.UTC(2026, 0, 4)

const EXISTING_NEIGHBORHOODS = [
  { id: 62, name: 'Areal', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 9, name: 'Áreas Periféricas / Rurais (Ipiabas)', zone: '2º Distrito (Ipiabas)' },
  { id: 41, name: 'Áreas Rurais (Dorândia)', zone: '4º Distrito (Dorândia)' },
  { id: 23, name: 'Áreas Rurais (Vargem Alegre)', zone: '3º Distrito (Vargem Alegre)' },
  { id: 56, name: 'Áreas Rurais / Fazendas (São José do Turvo)', zone: '5º Distrito (São José do Turvo)' },
  { id: 51, name: 'Arthur Cataldi', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 5, name: 'Asa Branca', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 11, name: 'Bairro de Fátima', zone: '6º Distrito (Califórnia)' },
  { id: 37, name: 'Bairro Santo Antônio (Ipiabas)', zone: '2º Distrito (Ipiabas)' },
  { id: 27, name: 'Belvedere', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 22, name: 'Boa Sorte', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 58, name: 'Boa Vista da Califórnia', zone: '6º Distrito (Califórnia)' },
  { id: 63, name: 'Boca do Mato', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 12, name: 'Caeiro', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 59, name: 'Caieira Nova', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 64, name: 'Caieira Velha', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 28, name: 'Califórnia (Centro)', zone: '6º Distrito (Califórnia)' },
  { id: 50, name: 'Cantão', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 18, name: 'Carthago', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 30, name: 'Carvão', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 1, name: 'Centro', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 33, name: 'Cerâmica União', zone: '6º Distrito (Califórnia)' },
  { id: 15, name: 'Chácara Farani', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 21, name: 'Dorândia (Centro)', zone: '4º Distrito (Dorândia)' },
  { id: 55, name: 'Fazendinha', zone: '3º Distrito (Vargem Alegre)' },
  { id: 46, name: 'Ipiabas (Centro)', zone: '2º Distrito (Ipiabas)' },
  { id: 25, name: 'Lago Azul', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 10, name: 'Maringá', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 43, name: 'Matadouro', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 29, name: 'Morada do Vale', zone: '6º Distrito (Califórnia)' },
  { id: 24, name: 'Morro do Gama', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 20, name: 'Morro do Gavião', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 60, name: 'Muqueca', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 44, name: 'Nossa Senhora de Santana', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 47, name: 'Oficinas Velhas', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 14, name: 'Parque Santana', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 32, name: 'Parque São Joaquim', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 57, name: 'Ponte Branca', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 45, name: 'Ponte Preta', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 16, name: 'Química', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 13, name: 'Recanto Feliz', zone: '6º Distrito (Califórnia)' },
  { id: 39, name: 'Renascer', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 17, name: 'Repouso', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 40, name: 'Roseira', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 54, name: 'Santa Terezinha', zone: '6º Distrito (Califórnia)' },
  { id: 52, name: 'Santana de Barra', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 42, name: 'Santo Antônio', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 35, name: 'São Francisco', zone: '6º Distrito (Califórnia)' },
  { id: 19, name: 'São José do Golfinho', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 61, name: 'São José do Turvo (Centro)', zone: '5º Distrito (São José do Turvo)' },
  { id: 36, name: 'São Luís da Barra', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 26, name: 'Vargem Alegre (Centro)', zone: '3º Distrito (Vargem Alegre)' },
  { id: 31, name: 'Vargem Grande', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 48, name: 'Venda de Cima', zone: '4º Distrito (Dorândia)' },
  { id: 38, name: 'Vila Helena', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 34, name: 'Vila Nova', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 49, name: 'Vila Rica', zone: '1º Distrito (Sede / Centro e Adjacências)' },
  { id: 53, name: 'Vila Suíça', zone: '1º Distrito (Sede / Centro e Adjacências)' },
]

const DISTRICT_ZONES = {
  1: '1º Distrito (Sede / Centro e Adjacências)',
  2: '2º Distrito (Ipiabas)',
  3: '3º Distrito (Vargem Alegre)',
  4: '4º Distrito (Dorândia)',
  5: '5º Distrito (São José do Turvo)',
  6: '6º Distrito (Califórnia)',
}

const ALIASES = {
  'n s santana': 'nossa senhora de santana',
  'ns santana': 'nossa senhora de santana',
  'california boa vista da barra': 'boa vista da california',
  'boa vista da barra': 'boa vista da california',
  'sao luis': 'sao luis da barra',
  'sao luiz': 'sao luis da barra',
  'santo antonio': 'santo antonio',
  'sao jose': 'sao jose do golfinho',
  'ipiabas': 'ipiabas (centro)',
  'california centro': 'california (centro)',
  'vargem alegre': 'vargem alegre (centro)',
  'dorandia': 'dorandia (centro)',
  'caieira': 'caieira velha',
  'caixa dagua velha': 'caixa d\'agua velha',
  'caixa d agua velha': 'caixa d\'agua velha',
}

const WIN1252_EXTRA = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
}

function fold(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksMojibake(str) {
  return /Ã.|Â.|â€.|�/.test(str) || /[\u0080-\u009F]/.test(str)
}

function bytesFromPossiblyLatin1(str) {
  const bytes = []
  for (const ch of str) {
    const cp = ch.codePointAt(0)
    if (cp <= 0xff) bytes.push(cp)
    else if (WIN1252_EXTRA[cp] != null) bytes.push(WIN1252_EXTRA[cp])
    else return null
  }
  return Buffer.from(bytes)
}

function repairText(value) {
  if (value == null) return null
  let s = String(value).replace(/\u00a0/g, ' ').trim()
  if (!s) return null
  for (let i = 0; i < 3 && looksMojibake(s); i += 1) {
    const buf = bytesFromPossiblyLatin1(s)
    if (!buf) break
    const next = buf.toString('utf8')
    if (!next || next.includes('\uFFFD') || next === s) break
    s = next
  }
  s = s
    .replace(/[\u0080-\u009F]/g, '')
    .replace(/\bParaiso\b/gi, 'Paraíso')
    .replace(/\bBarbara\b/gi, 'Bárbara')
    .replace(/\bGirassois\b/gi, 'Girassóis')
    .replace(/\s+/g, ' ')
    .trim()
  return s
}

function titleCasePt(value) {
  const small = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
  return value
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && small.has(lower)) return lower
      if (lower.startsWith("d'")) {
        return `D'${lower.charAt(2).toUpperCase()}${lower.slice(3)}`
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function sqlStr(value) {
  if (value == null || value === '') return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlNum(value) {
  if (value == null || Number.isNaN(Number(value))) return 'NULL'
  return String(value)
}

function sqlInt(value) {
  if (value == null || !Number.isFinite(Number(value))) return 'NULL'
  return String(Math.trunc(Number(value)))
}

function uuidFromSeed(seed) {
  const hex = createHash('sha1').update(String(seed)).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

function trapCode(value) {
  const n = Number(value)
  if (Number.isFinite(n) && Math.trunc(n) === n) return String(n)
  return String(value ?? '').trim()
}

function parseCoord(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(String(value).trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function parseDistrictNumber(value) {
  const repaired = repairText(value)
  if (!repaired) return null
  const match = repaired.match(/(\d)/)
  if (!match) return null
  const n = Number(match[1])
  return DISTRICT_ZONES[n] ? n : null
}

function toIsoNoon(value) {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}T12:00:00.000Z`
  }
  const asDate = new Date(value)
  if (!Number.isNaN(asDate.getTime()) && typeof value !== 'string') {
    return toIsoNoon(asDate)
  }
  const text = String(value).trim()
  const mdy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (mdy) {
    const month = Number(mdy[1])
    const day = Number(mdy[2])
    let year = Number(mdy[3])
    if (year < 100) year += 2000
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`
  }
  return null
}

function epiWeekFromIso(iso) {
  if (!iso) return null
  const date = new Date(iso)
  const focal = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const diffDays = Math.floor((focal - WEEK_ONE_START) / 86_400_000)
  if (diffDays < 0) return null
  return Math.floor(diffDays / 7) + 1
}

function parseEpiWeek(value, iso) {
  const n = Number(value)
  if (Number.isFinite(n) && n > 0) return Math.trunc(n)
  return epiWeekFromIso(iso)
}

function mapArea(value) {
  const f = fold(repairText(value) ?? '')
  if (f.includes('peri')) return 'periurbana'
  if (f.includes('rural')) return 'rural'
  return 'urbana'
}

function mapStatus(value) {
  const f = fold(repairText(value) ?? '')
  if (f.includes('final')) return 'finalizada'
  if (f.includes('troc')) return 'trocada'
  return 'instalada'
}

function mapSituation(value) {
  const f = fold(repairText(value) ?? '')
  if (!f) return null
  if (f.includes('danific')) return 'danificada'
  if (f.includes('ausente') || f.includes('perdid')) return 'ausente'
  if (f.includes('seca')) return 'seca'
  if (f.includes('normal')) return 'normal'
  return null
}

function trapStatusFromCycle(cycle) {
  if (cycle.status === 'instalada' || cycle.status === 'trocada') return 'instalada'
  if (cycle.removeSituation === 'ausente') return 'perdida'
  if (cycle.removeSituation === 'danificada') return 'danificada'
  if (cycle.removeSituation === 'seca') return 'sem_alteracao'
  return 'recolhida'
}

function zoneToBairroDistrito(zone) {
  const paren = zone.match(/^(\d+º Distrito) \((.+)\)$/)
  if (paren) return `${paren[1]} - ${paren[2]}`
  return zone
}

function candidateKeys(folded) {
  const keys = new Set([folded])
  if (ALIASES[folded]) keys.add(ALIASES[folded])
  const california = folded.match(/^california\s+(.+)$/)
  if (california) {
    keys.add(california[1])
    keys.add(`california (${california[1]})`)
  }
  return [...keys]
}

function matchNeighborhood(rawName, catalog) {
  const name = repairText(rawName)
  if (!name) return { name: null, row: null, created: false }
  const folded = fold(name)
  const keys = candidateKeys(folded)

  const exact = catalog.find((row) => keys.includes(fold(row.name)))
  if (exact) return { name: exact.name, row: exact, created: false }

  const contained = catalog.filter((row) => {
    const target = fold(row.name)
    return keys.some((key) => target === key || target.includes(key) || key.includes(target))
  })
  if (contained.length === 1) return { name: contained[0].name, row: contained[0], created: false }

  return { name: titleCasePt(name), row: null, created: true }
}

const workbook = XLSX.read(readFileSync(XLSX_PATH), { cellDates: true, raw: true })
const trapRows = XLSX.utils.sheet_to_json(workbook.Sheets.OVITRAMPAS, { raw: true, defval: null })
const cycleRows = XLSX.utils.sheet_to_json(workbook.Sheets.CONTAGENS, { raw: true, defval: null })

const catalog = [...EXISTING_NEIGHBORHOODS]
let nextNeighborhoodId = Math.max(...catalog.map((row) => row.id)) + 1
const newNeighborhoods = []
const unmatched = new Map()

function resolveNeighborhood(rawName, districtNumber) {
  const matched = matchNeighborhood(rawName, catalog)
  if (matched.row) return matched.row
  const zone = DISTRICT_ZONES[districtNumber] ?? DISTRICT_ZONES[1]
  const existingNew = newNeighborhoods.find((row) => fold(row.name) === fold(matched.name))
  if (existingNew) return existingNew
  const row = { id: nextNeighborhoodId, name: matched.name, zone }
  nextNeighborhoodId += 1
  newNeighborhoods.push(row)
  catalog.push(row)
  unmatched.set(row.name, (unmatched.get(row.name) ?? 0) + 1)
  return row
}

const traps = trapRows.map((row) => {
  const code = trapCode(row['Número de identificação da ovitrampa'])
  const districtNumber = parseDistrictNumber(row['Setor/Distrito da ovitrampa'])
  const neighborhood = resolveNeighborhood(row['Bairro onde está localizada'], districtNumber)
  return {
    code,
    neighborhoodId: neighborhood.id,
    neighborhoodName: neighborhood.name,
    district: neighborhood.zone,
    street: repairText(row['Rua onde está localizada']),
    number: repairText(row['Número do logradouro']),
    complement: repairText(row['Complemento do endereço']),
    locationDetail: repairText(row['Localização da ovitrampa']),
    responsible: repairText(row['Responsável']),
    block: repairText(row['Quarteirão']),
    areaType: mapArea(row['Tipo da ovitrampa']),
    latitude: parseCoord(row['Latitude da localização']),
    longitude: parseCoord(row['Longitude da localização']),
  }
})

const cycles = cycleRows.map((row) => {
  const installAt = toIsoNoon(row.Data_Instalacao)
  const swapAt = toIsoNoon(row.Data_Troca)
  const removeAt = toIsoNoon(row.Data_Retirada)
  const districtNumber = null
  const neighborhood = resolveNeighborhood(row.Bairro, districtNumber)
  return {
    id: uuidFromSeed(`ovitrampas-cycle-${row.ID_Ciclo}`),
    sourceId: row.ID_Ciclo,
    trapCode: trapCode(row.Armadilha),
    neighborhoodName: neighborhood.name,
    status: mapStatus(row.Status),
    installAt,
    installEpiWeek: parseEpiWeek(row.Semana_Instalacao, installAt),
    installObs: repairText(row.Obs_Instalacao),
    swapAt,
    swapEpiWeek: parseEpiWeek(row.Semana_Troca, swapAt),
    swapSituation: mapSituation(row.Situacao_Troca),
    swapObs: repairText(row.Obs_Troca),
    removeAt,
    removeEpiWeek: parseEpiWeek(row.Semana_Retirada, removeAt),
    removeSituation: mapSituation(row.Situacao_Retirada),
    removeObs: repairText(row.Obs_Retirada),
  }
})

const latestCycleByTrap = new Map()
for (const cycle of cycles) {
  const current = latestCycleByTrap.get(cycle.trapCode)
  if (!current || Number(cycle.sourceId) > Number(current.sourceId)) {
    latestCycleByTrap.set(cycle.trapCode, cycle)
  }
}

for (const trap of traps) {
  const cycle = latestCycleByTrap.get(trap.code)
  trap.status = cycle ? trapStatusFromCycle(cycle) : 'instalada'
  trap.installedAt = cycle?.installAt ?? null
}

const sql = []
sql.push('begin;')

if (newNeighborhoods.length) {
  sql.push('insert into public.neighborhoods (id, name, zone) overriding system value values')
  sql.push(
    newNeighborhoods
      .map((row) => `  (${row.id}, ${sqlStr(row.name)}, ${sqlStr(row.zone)})`)
      .join(',\n') + '\n  on conflict (id) do update set name = excluded.name, zone = excluded.zone;',
  )
  sql.push('insert into public.bairros (id, nome, distrito, ativo)')
  sql.push(
    newNeighborhoods
      .map((row) => {
        const id = uuidFromSeed(`bairro:${row.name}`)
        return `select ${sqlStr(id)}::uuid, ${sqlStr(row.name)}, ${sqlStr(zoneToBairroDistrito(row.zone))}, true
where not exists (select 1 from public.bairros b where lower(b.nome) = lower(${sqlStr(row.name)}))`
      })
      .join('\nunion all\n') + ';',
  )
}

sql.push(`insert into public.traps (
  code, qr_code, trap_type_id, status, installed_at, neighborhood_id, district,
  street, number, complement, location_detail, responsible, block, area_type,
  latitude, longitude, created_by
) values`)
sql.push(
  traps
    .map((trap) => `  (
    ${sqlStr(trap.code)}, ${sqlStr(trap.code)}, 1, ${sqlStr(trap.status)}, ${sqlStr(trap.installedAt)}::timestamptz,
    ${sqlInt(trap.neighborhoodId)}, ${sqlStr(trap.district)}, ${sqlStr(trap.street)}, ${sqlStr(trap.number)},
    ${sqlStr(trap.complement)}, ${sqlStr(trap.locationDetail)}, ${sqlStr(trap.responsible)}, ${sqlStr(trap.block)},
    ${sqlStr(trap.areaType)}, ${sqlNum(trap.latitude)}, ${sqlNum(trap.longitude)}, ${sqlStr(AGENT_ID)}
  )`)
    .join(',\n') + `
on conflict (code) do update set
  qr_code = excluded.qr_code,
  trap_type_id = excluded.trap_type_id,
  status = excluded.status,
  installed_at = excluded.installed_at,
  neighborhood_id = excluded.neighborhood_id,
  district = excluded.district,
  street = excluded.street,
  number = excluded.number,
  complement = excluded.complement,
  location_detail = excluded.location_detail,
  responsible = excluded.responsible,
  block = excluded.block,
  area_type = excluded.area_type,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  updated_at = now();`,
)

sql.push(`insert into public.cycles (
  id, trap_code, trap_id, neighborhood_name, status,
  install_at, install_epi_week, install_obs,
  swap_at, swap_epi_week, swap_situation, swap_obs,
  remove_at, remove_epi_week, remove_situation, remove_obs,
  agent_id
) values`)
sql.push(
  cycles
    .map((cycle) => `  (
    ${sqlStr(cycle.id)}, ${sqlStr(cycle.trapCode)},
    (select id from public.traps where code = ${sqlStr(cycle.trapCode)}),
    ${sqlStr(cycle.neighborhoodName)}, ${sqlStr(cycle.status)},
    ${sqlStr(cycle.installAt)}::timestamptz, ${sqlInt(cycle.installEpiWeek)}, ${sqlStr(cycle.installObs)},
    ${sqlStr(cycle.swapAt)}::timestamptz, ${sqlInt(cycle.swapEpiWeek)}, ${sqlStr(cycle.swapSituation)}, ${sqlStr(cycle.swapObs)},
    ${sqlStr(cycle.removeAt)}::timestamptz, ${sqlInt(cycle.removeEpiWeek)}, ${sqlStr(cycle.removeSituation)}, ${sqlStr(cycle.removeObs)},
    ${sqlStr(AGENT_ID)}
  )`)
    .join(',\n') + `
on conflict (id) do update set
  trap_code = excluded.trap_code,
  trap_id = excluded.trap_id,
  neighborhood_name = excluded.neighborhood_name,
  status = excluded.status,
  install_at = excluded.install_at,
  install_epi_week = excluded.install_epi_week,
  install_obs = excluded.install_obs,
  swap_at = excluded.swap_at,
  swap_epi_week = excluded.swap_epi_week,
  swap_situation = excluded.swap_situation,
  swap_obs = excluded.swap_obs,
  remove_at = excluded.remove_at,
  remove_epi_week = excluded.remove_epi_week,
  remove_situation = excluded.remove_situation,
  remove_obs = excluded.remove_obs,
  updated_at = now();`,
)

sql.push("select setval(pg_get_serial_sequence('public.neighborhoods', 'id'), coalesce((select max(id) from public.neighborhoods), 1));")
sql.push("select setval(pg_get_serial_sequence('public.traps', 'id'), coalesce((select max(id) from public.traps), 1));")
sql.push('commit;')
sql.push('select (select count(*)::int from public.traps) as traps, (select count(*)::int from public.cycles) as cycles, (select count(*)::int from public.neighborhoods) as neighborhoods;')

writeFileSync(SQL_PATH, `${sql.join('\n\n')}\n`, 'utf8')

const sampleStreets = [...new Set(traps.map((trap) => trap.street).filter(Boolean))].slice(0, 12)
console.log(JSON.stringify({
  traps: traps.length,
  uniqueTrapCodes: new Set(traps.map((trap) => trap.code)).size,
  cycles: cycles.length,
  uniqueCycleIds: new Set(cycles.map((cycle) => cycle.id)).size,
  newNeighborhoods: newNeighborhoods.map((row) => `${row.id} ${row.name} | ${row.zone}`),
  sampleStreets,
  sampleTrap: traps[0],
  sampleCycle: cycles[0],
  finalized: cycles.filter((cycle) => cycle.status === 'finalizada').length,
  sqlPath: SQL_PATH,
}, null, 2))
