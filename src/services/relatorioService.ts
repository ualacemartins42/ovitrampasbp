import { cycleSituationLabel, normalizeCycleSituation } from '@/lib/constants'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { foldSearchText, formatDate, isoToDateInput, toDateInputValue } from '@/lib/utils'
import type { CycleRecord, CycleSituation, Profile, Trap } from '@/types/domain'

export interface CompletedCycleReport {
  cycle: CycleRecord
  trap: Trap | null
  agentName: string
  street: string
  neighborhood: string
  district: string
  latitude: number | null
  longitude: number | null
}

export interface ReportFilters {
  query: string
  neighborhood: string
  dateFrom: string
  dateTo: string
  weekFrom: string
  weekTo: string
}

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  query: '',
  neighborhood: '',
  dateFrom: '',
  dateTo: '',
  weekFrom: '',
  weekTo: '',
}

function isCompletedCycle(cycle: CycleRecord): boolean {
  return cycle.status === 'finalizada' && Boolean(cycle.installAt && cycle.swapAt && cycle.removeAt)
}

function situationLabel(value: CycleSituation | null): string {
  return cycleSituationLabel(value)
}

function weekLabel(week: number | null | undefined): string {
  return week == null ? '—' : String(week)
}

function addressLine(trap: Trap | null): string {
  if (!trap) return '—'
  const parts = [trap.street, trap.number, trap.complement, trap.locationDetail].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '—'
}

function isoDay(iso: string | null | undefined): string | null {
  if (!iso) return null
  return isoToDateInput(iso)
}

function inDateRange(iso: string | null | undefined, from: string, to: string): boolean {
  const day = isoDay(iso)
  if (!day) return !from && !to
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

function weeksOf(cycle: CycleRecord): number[] {
  return [cycle.installEpiWeek, cycle.swapEpiWeek, cycle.removeEpiWeek].filter(
    (week): week is number => week != null,
  )
}

function inWeekRange(cycle: CycleRecord, from: string, to: string): boolean {
  if (!from && !to) return true
  const min = from ? Number(from) : null
  const max = to ? Number(to) : null
  if ((min != null && !Number.isFinite(min)) || (max != null && !Number.isFinite(max))) return true
  const weeks = weeksOf(cycle)
  if (weeks.length === 0) return false
  return weeks.some((week) => {
    if (min != null && week < min) return false
    if (max != null && week > max) return false
    return true
  })
}

export function buildCompletedCycleReport(
  cycle: CycleRecord,
  trap: Trap | null,
  agent: Profile | undefined,
): CompletedCycleReport {
  return {
    cycle,
    trap,
    agentName: agent?.fullName?.trim() || 'Agente não identificado',
    street: addressLine(trap),
    neighborhood: cycle.neighborhoodName?.trim() || 'Sem bairro',
    district: trap?.district?.trim() || '—',
    latitude: trap?.latitude ?? null,
    longitude: trap?.longitude ?? null,
  }
}

export async function listCompletedCycleReports(viewer: Profile | null): Promise<CompletedCycleReport[]> {
  const [cycles, traps, profiles] = await Promise.all([
    db.cycles.toArray(),
    db.traps.toArray(),
    db.profiles.toArray(),
  ])

  const trapsById = new Map(traps.map((item) => [item.id, item]))
  const trapsByCode = new Map(traps.map((item) => [item.code, item]))
  const profilesById = new Map(profiles.map((item) => [item.id, item]))

  const ownOnly = viewer?.role === 'ace'
  const completed = cycles
    .filter(isCompletedCycle)
    .filter((cycle) => !ownOnly || cycle.agentId === viewer?.id)
    .sort((left, right) => (right.removeAt ?? '').localeCompare(left.removeAt ?? ''))

  return completed.map((cycle) => {
    const trap =
      (cycle.trapId != null ? trapsById.get(cycle.trapId) : undefined) ?? trapsByCode.get(cycle.trapCode) ?? null
    return buildCompletedCycleReport(
      cycle,
      trap,
      profilesById.get(cycle.agentId) ?? (viewer?.id === cycle.agentId ? viewer : undefined),
    )
  })
}

export async function refreshCompletedCyclesFromRemote(): Promise<void> {
  if (!navigator.onLine || !supabase) return
  const { data, error } = await supabase
    .from('cycles')
    .select('*')
    .eq('status', 'finalizada')
    .order('remove_at', { ascending: false })
  if (error) throw error

  const local = await db.cycles.toArray()
  const pending = new Set(local.filter((item) => item.syncStatus !== 'synced').map((item) => item.id))
  for (const row of data ?? []) {
    if (pending.has(row.id)) continue
    await db.cycles.put({
      id: row.id,
      trapCode: row.trap_code,
      trapId: row.trap_id,
      neighborhoodName: row.neighborhood_name,
      status: row.status,
      installAt: row.install_at,
      installEpiWeek: row.install_epi_week,
      installObs: row.install_obs,
      swapAt: row.swap_at,
      swapEpiWeek: row.swap_epi_week,
      swapSituation: normalizeCycleSituation(row.swap_situation),
      swapObs: row.swap_obs,
      removeAt: row.remove_at,
      removeEpiWeek: row.remove_epi_week,
      removeSituation: normalizeCycleSituation(row.remove_situation),
      removeObs: row.remove_obs,
      agentId: row.agent_id,
      syncStatus: 'synced',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  }
}

export function filterCompletedCycleReports(
  rows: CompletedCycleReport[],
  filters: ReportFilters,
): CompletedCycleReport[] {
  const term = foldSearchText(filters.query)
  const neighborhood = foldSearchText(filters.neighborhood)

  return rows.filter((row) => {
    if (term) {
      const haystack = foldSearchText(
        `${row.cycle.trapCode} ${row.street} ${row.agentName} ${row.neighborhood}`,
      )
      if (!haystack.includes(term)) return false
    }
    if (neighborhood) {
      const place = foldSearchText(`${row.neighborhood} ${row.district}`)
      if (!place.includes(neighborhood)) return false
    }
    if (!inDateRange(row.cycle.removeAt, filters.dateFrom, filters.dateTo)) return false
    if (!inWeekRange(row.cycle, filters.weekFrom, filters.weekTo)) return false
    return true
  })
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export function downloadCompletedCyclesCsv(rows: CompletedCycleReport[]): void {
  const header = [
    'Ovitrampa',
    'Bairro',
    'Distrito',
    'Rua / Endereço',
    'Data Instalação',
    'SE Instalação',
    'Estrato LIRAa',
    'Data Troca',
    'SE Troca',
    'Situação Troca',
    'Data Retirada',
    'SE Retirada',
    'Situação Retirada',
    'Agente Responsável',
  ]

  const body = rows.map((row) => [
    row.cycle.trapCode,
    row.neighborhood,
    row.district,
    row.street === '—' ? '' : row.street,
    formatDate(row.cycle.installAt),
    weekLabel(row.cycle.installEpiWeek).replace('—', ''),
    row.trap?.estratoLiraa ?? '',
    formatDate(row.cycle.swapAt),
    weekLabel(row.cycle.swapEpiWeek).replace('—', ''),
    situationLabel(row.cycle.swapSituation).replace('—', ''),
    formatDate(row.cycle.removeAt),
    weekLabel(row.cycle.removeEpiWeek).replace('—', ''),
    situationLabel(row.cycle.removeSituation).replace('—', ''),
    row.agentName,
  ])

  const csv = `\uFEFF${[header, ...body].map((line) => line.map(csvCell).join(';')).join('\r\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ciclos-concluidos-${toDateInputValue(new Date())}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function printCompletedCycles(rows: CompletedCycleReport[]): void {
  const tableRows = rows
    .map(
      (row) => `
      <tr>
        <td>${row.cycle.trapCode}</td>
        <td>${row.neighborhood}</td>
        <td>${formatDate(row.cycle.installAt)} (SE ${weekLabel(row.cycle.installEpiWeek)})${row.trap?.estratoLiraa ? ` · Estrato ${row.trap.estratoLiraa}` : ''}</td>
        <td>${formatDate(row.cycle.swapAt)} (SE ${weekLabel(row.cycle.swapEpiWeek)}) · ${situationLabel(row.cycle.swapSituation)}</td>
        <td>${formatDate(row.cycle.removeAt)} (SE ${weekLabel(row.cycle.removeEpiWeek)}) · ${situationLabel(row.cycle.removeSituation)}</td>
        <td>${row.agentName}</td>
      </tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Ciclos concluídos</title>
    <style>
      body { font-family: Segoe UI, sans-serif; color: #134e4a; margin: 24px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      p { margin: 0 0 16px; color: #5b6b68; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #d7e3df; padding: 6px 8px; text-align: left; vertical-align: top; }
      th { background: #f4f7f6; }
    </style>
  </head>
  <body>
    <h1>Relatório de ciclos concluídos</h1>
    <p>${rows.length} ciclo(s) · gerado em ${new Date().toLocaleString('pt-BR')}</p>
    <table>
      <thead>
        <tr>
          <th>Ovitrampa</th>
          <th>Bairro / distrito</th>
          <th>Instalação</th>
          <th>Troca</th>
          <th>Retirada</th>
          <th>Agente</th>
        </tr>
      </thead>
      <tbody>${tableRows || '<tr><td colspan="6">Nenhum ciclo no filtro atual.</td></tr>'}</tbody>
    </table>
  </body>
</html>`

  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.append(frame)
  const doc = frame.contentDocument
  if (!doc) {
    frame.remove()
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  frame.contentWindow?.focus()
  frame.contentWindow?.print()
  window.setTimeout(() => frame.remove(), 1000)
}
