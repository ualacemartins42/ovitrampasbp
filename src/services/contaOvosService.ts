import { db } from '@/lib/db'
import { foldSearchText, toDateInputValue } from '@/lib/utils'
import { neighborhoodLabelById } from '@/constants/bairros'

const DEFAULT_BASE_URL = 'https://contaovos.com/pt-br/api'
const DEFAULT_MUNICIPALITY = 'Barra do Piraí'
const DEFAULT_STATE = 'RJ'
/** Poucas páginas por consulta para reduzir risco de 429. */
const MAX_PAGES = 3
const PAGE_DELAY_MS = 350
const CACHE_TTL_MS = 8 * 60 * 1000
const CACHE_PREFIX = 'contaovos-heat-v1:'

export interface ContaOvosHeatPoint {
  id: string
  trapCode: string
  latitude: number
  longitude: number
  eggs: number
  date: string | null
  dateCollect: string | null
  district: string | null
  street: string | null
  number: string | null
  neighborhoodName: string | null
  source: 'contaovos' | 'local'
}

export interface ContaOvosHeatQuery {
  dateStart?: string
  dateEnd?: string
  district?: string
  neighborhood?: string
}

export interface ContaOvosHeatResult {
  points: ContaOvosHeatPoint[]
  offline: boolean
  sourceLabel: string
  fromCache?: boolean
  error?: string
}

interface ContaOvosCountingRow {
  counting_id?: number
  ovitrap_id?: string | number
  eggs?: number
  latitude?: number
  longitude?: number
  date?: string
  date_collect?: string
  district?: string
  street?: string
  number?: string
  sector?: string
}

interface CacheEntry {
  savedAt: number
  points: ContaOvosHeatPoint[]
}

export class ContaOvosHttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ContaOvosHttpError'
    this.status = status
  }
}

function baseUrl(): string {
  const configured = import.meta.env.VITE_CONTAOVOS_BASE_URL?.trim()
  return (configured || DEFAULT_BASE_URL).replace(/\/$/, '')
}

function apiKey(): string | undefined {
  const key = import.meta.env.VITE_CONTAOVOS_API_KEY?.trim()
  return key || undefined
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function mapCountingRow(row: ContaOvosCountingRow): ContaOvosHeatPoint | null {
  const latitude = toNumber(row.latitude)
  const longitude = toNumber(row.longitude)
  if (latitude == null || longitude == null) return null
  const trapCode = String(row.ovitrap_id ?? '').trim()
  const eggs = Math.max(0, toNumber(row.eggs) ?? 0)
  return {
    id: String(row.counting_id ?? `${trapCode}-${row.date ?? ''}-${latitude}-${longitude}`),
    trapCode: trapCode || '—',
    latitude,
    longitude,
    eggs,
    date: row.date ?? null,
    dateCollect: row.date_collect ?? null,
    district: row.district?.trim() || row.sector?.trim() || null,
    street: row.street?.trim() || null,
    number: row.number != null ? String(row.number) : null,
    neighborhoodName: row.district?.trim() || null,
    source: 'contaovos',
  }
}

function apiCacheKey(query: Pick<ContaOvosHeatQuery, 'dateStart' | 'dateEnd'>): string {
  const key = apiKey() ? 'private' : 'public'
  return `${CACHE_PREFIX}${key}|${query.dateStart ?? ''}|${query.dateEnd ?? ''}`
}

function readCache(cacheKey: string, allowExpired = false): ContaOvosHeatPoint[] | null {
  try {
    const raw = sessionStorage.getItem(cacheKey)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (!entry?.points || !Array.isArray(entry.points)) return null
    const age = Date.now() - (entry.savedAt ?? 0)
    if (!allowExpired && age > CACHE_TTL_MS) return null
    return entry.points
  } catch {
    return null
  }
}

function writeCache(cacheKey: string, points: ContaOvosHeatPoint[]): void {
  try {
    const entry: CacheEntry = { savedAt: Date.now(), points }
    sessionStorage.setItem(cacheKey, JSON.stringify(entry))
  } catch {
    /* quota / private mode */
  }
}

async function fetchJsonArray(url: string, headers?: HeadersInit): Promise<unknown[]> {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new ContaOvosHttpError(
      response.status,
      `ContaOvos ${response.status}: ${body.slice(0, 180) || response.statusText}`,
    )
  }
  const data = (await response.json()) as unknown
  if (!Array.isArray(data)) {
    throw new Error('Resposta inesperada da API ContaOvos.')
  }
  return data
}

async function fetchCountingsPaginated(
  endpoint: 'lastcounting' | 'lastcountingpublic',
  query: ContaOvosHeatQuery,
  useKey: boolean,
): Promise<ContaOvosHeatPoint[]> {
  const key = apiKey()
  const points: ContaOvosHeatPoint[] = []
  const headers: HeadersInit | undefined = useKey && key ? { Authorization: `Bearer ${key}` } : undefined

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    if (page > 1) await sleep(PAGE_DELAY_MS)

    const params = new URLSearchParams()
    params.set('page', String(page))
    if (query.dateStart) params.set('date_start', query.dateStart)
    if (query.dateEnd) params.set('date_end', query.dateEnd)

    if (endpoint === 'lastcountingpublic') {
      params.set('municipality', DEFAULT_MUNICIPALITY)
      params.set('state', DEFAULT_STATE)
      params.set('country', 'Brasil')
    } else if (key) {
      params.set('key', key)
    }

    const url = `${baseUrl()}/${endpoint}?${params.toString()}`
    const rows = await fetchJsonArray(url, headers)
    if (rows.length === 0) break

    for (const row of rows) {
      const mapped = mapCountingRow(row as ContaOvosCountingRow)
      if (mapped) points.push(mapped)
    }

    if (rows.length < 50) break
  }

  return points
}

async function enrichWithLocalTraps(points: ContaOvosHeatPoint[]): Promise<ContaOvosHeatPoint[]> {
  const [traps, neighborhoods] = await Promise.all([db.traps.toArray(), db.neighborhoods.toArray()])
  const byCode = new Map(traps.filter((item) => !item.deletedAt).map((item) => [foldSearchText(item.code), item]))

  return points.map((point) => {
    const trap = byCode.get(foldSearchText(point.trapCode))
    if (!trap) return point
    const neighborhoodName = neighborhoodLabelById(neighborhoods, trap.neighborhoodId, '')
    return {
      ...point,
      street: point.street || trap.street || null,
      number: point.number || trap.number || null,
      district: point.district || trap.district || null,
      neighborhoodName: point.neighborhoodName || neighborhoodName || trap.district || null,
      latitude: point.latitude || trap.latitude || point.latitude,
      longitude: point.longitude || trap.longitude || point.longitude,
    }
  })
}

export function matchesHeatFilters(point: ContaOvosHeatPoint, query: ContaOvosHeatQuery): boolean {
  if (query.dateStart) {
    const ref = point.dateCollect || point.date
    if (ref && ref < query.dateStart) return false
  }
  if (query.dateEnd) {
    const ref = point.dateCollect || point.date
    if (ref && ref > query.dateEnd) return false
  }
  if (query.district) {
    const term = foldSearchText(query.district)
    const haystack = foldSearchText(`${point.district ?? ''} ${point.neighborhoodName ?? ''}`)
    if (!haystack.includes(term)) return false
  }
  if (query.neighborhood) {
    const term = foldSearchText(query.neighborhood)
    const haystack = foldSearchText(`${point.neighborhoodName ?? ''} ${point.district ?? ''}`)
    if (!haystack.includes(term)) return false
  }
  return true
}

/** Contagens locais (IndexedDB) georreferenciadas pelas ovitrampas. */
export async function loadLocalEggCountHeatPoints(query: ContaOvosHeatQuery = {}): Promise<ContaOvosHeatPoint[]> {
  const [records, traps, neighborhoods] = await Promise.all([
    db.educacaoSaude.toArray(),
    db.traps.toArray(),
    db.neighborhoods.toArray(),
  ])
  const trapsByCode = new Map(traps.filter((item) => !item.deletedAt).map((item) => [foldSearchText(item.code), item]))

  const points: ContaOvosHeatPoint[] = []
  for (const record of records) {
    if (record.eggCount == null) continue
    const trap = trapsByCode.get(foldSearchText(record.trapCode))
    const latitude = trap?.latitude
    const longitude = trap?.longitude
    if (latitude == null || longitude == null) continue

    const point: ContaOvosHeatPoint = {
      id: `local-${record.id}`,
      trapCode: record.trapCode,
      latitude,
      longitude,
      eggs: record.eggCount,
      date: record.analysisDate,
      dateCollect: record.analysisDate,
      district: record.district,
      street: record.street ?? trap.street,
      number: record.number ?? trap.number,
      neighborhoodName: record.neighborhoodName || neighborhoodLabelById(neighborhoods, trap.neighborhoodId, '') || null,
      source: 'local',
    }
    if (matchesHeatFilters(point, query)) points.push(point)
  }
  return points
}

async function fetchFromNetwork(query: ContaOvosHeatQuery): Promise<ContaOvosHeatPoint[]> {
  const key = apiKey()
  let points: ContaOvosHeatPoint[] = []

  if (key) {
    try {
      points = await fetchCountingsPaginated('lastcounting', query, true)
    } catch (error) {
      if (error instanceof ContaOvosHttpError && error.status === 429) throw error
      points = await fetchCountingsPaginated('lastcountingpublic', query, false)
    }
  } else {
    points = await fetchCountingsPaginated('lastcountingpublic', query, false)
  }

  return enrichWithLocalTraps(points)
}

const RATE_LIMIT_MESSAGE =
  'Limite de consultas temporariamente atingido. Exibindo dados locais do aparelho.'

/** Evita duas requisições idênticas em paralelo (ex.: React Strict Mode). */
const inflight = new Map<string, Promise<ContaOvosHeatPoint[]>>()

async function fetchFromNetworkDeduped(query: ContaOvosHeatQuery): Promise<ContaOvosHeatPoint[]> {
  const key = apiCacheKey(query)
  const existing = inflight.get(key)
  if (existing) return existing
  const promise = fetchFromNetwork(query).finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}

/**
 * Carrega pontos do mapa de calor: ContaOvos online (com cache), ou contagens locais.
 * @param forceRefresh — se true, ignora cache válido e tenta a API novamente.
 */
export async function loadHeatmapPoints(
  query: ContaOvosHeatQuery = {},
  options: { forceRefresh?: boolean } = {},
): Promise<ContaOvosHeatResult> {
  const cacheKey = apiCacheKey(query)
  const applyFilters = (points: ContaOvosHeatPoint[]) => points.filter((point) => matchesHeatFilters(point, query))

  if (!navigator.onLine) {
    const local = await loadLocalEggCountHeatPoints(query)
    return {
      points: local,
      offline: true,
      sourceLabel: 'Dados locais (offline)',
      error: local.length === 0 ? 'Sem contagens locais georreferenciadas neste aparelho.' : undefined,
    }
  }

  if (!options.forceRefresh) {
    const cached = readCache(cacheKey)
    if (cached) {
      return {
        points: applyFilters(cached),
        offline: false,
        fromCache: true,
        sourceLabel: 'ContaOvos (cache)',
      }
    }
  }

  try {
    const points = await fetchFromNetworkDeduped({
      dateStart: query.dateStart,
      dateEnd: query.dateEnd,
    })
    writeCache(cacheKey, points)
    const filtered = applyFilters(points)
    if (filtered.length > 0) {
      return {
        points: filtered,
        offline: false,
        sourceLabel: apiKey() ? 'ContaOvos (API)' : 'ContaOvos (público)',
      }
    }
    const local = await loadLocalEggCountHeatPoints(query)
    return {
      points: local,
      offline: false,
      sourceLabel: local.length > 0 ? 'Contagens locais (sem dados ContaOvos no período)' : 'ContaOvos',
      error: local.length === 0 ? 'Nenhuma contagem encontrada para os filtros selecionados.' : undefined,
    }
  } catch (error) {
    const is429 = error instanceof ContaOvosHttpError && error.status === 429
    const stale = readCache(cacheKey, true)
    if (stale && stale.length > 0) {
      return {
        points: applyFilters(stale),
        offline: false,
        fromCache: true,
        sourceLabel: 'ContaOvos (cache)',
        error: is429
          ? 'Limite de consultas atingido. Exibindo dados em cache.'
          : 'API indisponível; exibindo cache anterior.',
      }
    }

    const local = await loadLocalEggCountHeatPoints(query)
    return {
      points: local,
      offline: !navigator.onLine || is429,
      sourceLabel: 'Dados locais (fallback)',
      error: is429
        ? RATE_LIMIT_MESSAGE
        : local.length > 0
          ? `API ContaOvos indisponível; exibindo ${local.length} contagem(ns) local(is).`
          : error instanceof Error
            ? error.message
            : 'Falha ao consultar ContaOvos.',
    }
  }
}

export function defaultHeatDateRange(): { dateStart: string; dateEnd: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 90)
  return {
    dateStart: toDateInputValue(start),
    dateEnd: toDateInputValue(end),
  }
}
