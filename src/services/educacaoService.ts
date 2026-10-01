import { educacaoPhotoRefs } from '@/features/educacao/repository'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { foldSearchText, parseDateInput, toDateInputValue } from '@/lib/utils'
import type { Profile, Trap } from '@/types/domain'
import type { EducacaoPhotoRef, EducacaoSaudeRecord } from '@/types/educacao'

export interface EducacaoReportRow {
  record: EducacaoSaudeRecord
  trap: Trap | null
  agentName: string
  address: string
  neighborhood: string
  photos: EducacaoPhotoRef[]
}

export interface EducacaoFilters {
  query: string
  neighborhood: string
  agentId: string
  dateFrom: string
  dateTo: string
}

export const EMPTY_EDUCACAO_FILTERS: EducacaoFilters = {
  query: '',
  neighborhood: '',
  agentId: '',
  dateFrom: '',
  dateTo: '',
}

/** `action_date` é uma data sem fuso; `new Date('AAAA-MM-DD')` mostraria o dia anterior no Brasil. */
export function formatActionDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = parseDateInput(value.slice(0, 10))
  return date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date) : value
}

function addressOf(record: EducacaoSaudeRecord, trap: Trap | null): string {
  const street = record.street ?? trap?.street
  const number = record.number ?? trap?.number
  const parts = [street, number].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Endereço não informado'
}

export async function listEducacaoReports(viewer: Profile | null): Promise<EducacaoReportRow[]> {
  const [records, traps, profiles] = await Promise.all([
    db.educacaoSaude.where('kind').equals('educacao').toArray(),
    db.traps.toArray(),
    db.profiles.toArray(),
  ])

  const trapsById = new Map(traps.map((item) => [item.id, item]))
  const trapsByCode = new Map(traps.map((item) => [item.code, item]))
  const profilesById = new Map(profiles.map((item) => [item.id, item]))
  const ownOnly = viewer?.role === 'ace'

  return records
    .filter((record) => !ownOnly || record.agentId === viewer?.id)
    .sort(
      (left, right) =>
        right.analysisDate.localeCompare(left.analysisDate) || right.createdAt.localeCompare(left.createdAt),
    )
    .map((record) => {
      const trap =
        (record.trapId != null ? trapsById.get(record.trapId) : undefined) ?? trapsByCode.get(record.trapCode) ?? null
      const agent = profilesById.get(record.agentId) ?? (viewer?.id === record.agentId ? viewer : undefined)
      return {
        record,
        trap,
        agentName: agent?.fullName?.trim() || 'Agente não identificado',
        address: addressOf(record, trap),
        neighborhood: record.neighborhoodName?.trim() || record.district?.trim() || 'Sem bairro',
        photos: educacaoPhotoRefs(record),
      }
    })
}

export function filterEducacaoReports(rows: EducacaoReportRow[], filters: EducacaoFilters): EducacaoReportRow[] {
  const term = foldSearchText(filters.query)
  const neighborhood = foldSearchText(filters.neighborhood)

  return rows.filter((row) => {
    if (term) {
      const haystack = foldSearchText(
        `${row.record.trapCode} ${row.address} ${row.neighborhood} ${row.agentName} ${row.record.observation ?? ''}`,
      )
      if (!haystack.includes(term)) return false
    }
    if (neighborhood) {
      const place = foldSearchText(`${row.neighborhood} ${row.record.district ?? ''}`)
      if (!place.includes(neighborhood)) return false
    }
    if (filters.agentId && row.record.agentId !== filters.agentId) return false
    const day = row.record.analysisDate.slice(0, 10)
    if (filters.dateFrom && day < filters.dateFrom) return false
    if (filters.dateTo && day > filters.dateTo) return false
    return true
  })
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function downloadEducacaoCsv(rows: EducacaoReportRow[]): void {
  const header = ['Data', 'Ovitrampa', 'Bairro', 'Ação Tomada', 'Quantidade de Fotos']
  const body = rows.map((row) => [
    formatActionDate(row.record.analysisDate),
    row.record.trapCode,
    row.neighborhood,
    row.record.observation ?? '',
    row.photos.length,
  ])

  const csv = `\uFEFF${[header, ...body].map((line) => line.map(csvCell).join(';')).join('\r\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `educacao-em-saude-${toDateInputValue(new Date())}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export interface ResolvedPhoto {
  key: string
  url: string | null
  /** Blob URL criada localmente; precisa de `URL.revokeObjectURL`. */
  local: boolean
}

/** Prefere a cópia local (funciona offline); senão gera URL assinada do Storage. */
export async function resolveEducacaoPhotos(refs: EducacaoPhotoRef[]): Promise<ResolvedPhoto[]> {
  const resolved: ResolvedPhoto[] = []
  const remoteNeeded: EducacaoPhotoRef[] = []

  for (const ref of refs) {
    const photo = ref.localId ? await db.photos.get(ref.localId) : undefined
    if (photo) {
      resolved.push({ key: ref.key, url: URL.createObjectURL(photo.blob), local: true })
    } else {
      remoteNeeded.push(ref)
    }
  }

  const paths = remoteNeeded.map((ref) => ref.remotePath).filter((path): path is string => Boolean(path))
  const signed = new Map<string, string>()
  if (paths.length && supabase && navigator.onLine) {
    const { data } = await supabase.storage.from('educacao_fotos').createSignedUrls(paths, 60 * 60)
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl)
    }
  }

  for (const ref of remoteNeeded) {
    resolved.push({ key: ref.key, url: ref.remotePath ? signed.get(ref.remotePath) ?? null : null, local: false })
  }

  const order = new Map(refs.map((ref, index) => [ref.key, index]))
  return resolved.sort((left, right) => (order.get(left.key) ?? 0) - (order.get(right.key) ?? 0))
}
