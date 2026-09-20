import { liveQuery } from 'dexie'
import { Download, FileBarChart, Printer, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CicloDetalhesModal } from '@/components/relatorios/CicloDetalhesModal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { formatNeighborhoodLabel } from '@/constants/bairros'
import { useAuth } from '@/features/auth/auth-context'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { CYCLE_SITUATION_LABELS } from '@/lib/constants'
import { pullRemoteData } from '@/lib/sync'
import { formatDate } from '@/lib/utils'
import {
  downloadCompletedCyclesCsv,
  EMPTY_REPORT_FILTERS,
  filterCompletedCycleReports,
  listCompletedCycleReports,
  printCompletedCycles,
  refreshCompletedCyclesFromRemote,
  type CompletedCycleReport,
  type ReportFilters,
} from '@/services/relatorioService'

function situationLabel(value: CompletedCycleReport['cycle']['swapSituation']): string {
  return value ? CYCLE_SITUATION_LABELS[value] : '—'
}

function weekLabel(week: number | null | undefined): string {
  return week == null ? '—' : `SE ${week}`
}

export function RelatoriosPage() {
  const { profile } = useAuth()
  const neighborhoods = useNeighborhoods(true)
  const [rows, setRows] = useState<CompletedCycleReport[]>([])
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS)
  const [selected, setSelected] = useState<CompletedCycleReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sub = liveQuery(() => listCompletedCycleReports(profile)).subscribe({
      next: (items) => {
        setRows(items)
        setLoading(false)
      },
      error: () => {
        toast.error('Não foi possível carregar os ciclos concluídos.')
        setLoading(false)
      },
    })
    return () => sub.unsubscribe()
  }, [profile])

  useEffect(() => {
    if (!profile || !navigator.onLine) return
    void Promise.all([refreshCompletedCyclesFromRemote(), pullRemoteData(profile)]).catch(() => {
      /* offline-first: keep IndexedDB results */
    })
  }, [profile])

  const filtered = useMemo(() => filterCompletedCycleReports(rows, filters), [rows, filters])

  const neighborhoodOptions = useMemo(() => {
    const names = new Set(neighborhoods.map((item) => item.name))
    for (const row of rows) {
      const name = row.neighborhood.split(' - ')[0]?.trim()
      if (name) names.add(name)
    }
    return [...names].sort((left, right) => left.localeCompare(right, 'pt-BR'))
  }, [neighborhoods, rows])

  function updateFilter<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted">
          Ciclos concluídos (instalação, troca e retirada), disponíveis offline neste aparelho.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          className="pl-9"
          value={filters.query}
          placeholder="Buscar código, rua ou agente"
          onChange={(event) => updateFilter('query', event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Field label="Bairro / distrito">
          <Select value={filters.neighborhood} onChange={(event) => updateFilter('neighborhood', event.target.value)}>
            <option value="">Todos</option>
            {neighborhoods.map((item) => (
              <option key={item.id} value={item.name}>
                {formatNeighborhoodLabel(item)}
              </option>
            ))}
            {neighborhoodOptions
              .filter((name) => !neighborhoods.some((item) => item.name === name))
              .map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Retirada de">
            <Input type="date" value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} />
          </Field>
          <Field label="Retirada até">
            <Input type="date" value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="SE de">
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="ex. 38"
              value={filters.weekFrom}
              onChange={(event) => updateFilter('weekFrom', event.target.value)}
            />
          </Field>
          <Field label="SE até">
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="ex. 40"
              value={filters.weekTo}
              onChange={(event) => updateFilter('weekTo', event.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          variant="secondary"
          disabled={filtered.length === 0}
          onClick={() => downloadCompletedCyclesCsv(filtered)}
        >
          <Download className="size-4" />
          Exportar CSV
        </Button>
        <Button
          className="flex-1"
          variant="secondary"
          disabled={filtered.length === 0}
          onClick={() => printCompletedCycles(filtered)}
        >
          <Printer className="size-4" />
          Imprimir
        </Button>
      </div>

      <p className="text-xs text-muted">{filtered.length} ciclo(s) concluído(s) no filtro atual.</p>

      {loading ? (
        <Card className="text-sm text-muted">Carregando ciclos concluídos...</Card>
      ) : filtered.length === 0 ? (
        <Card className="text-sm text-muted">Nenhum ciclo com as três etapas concluídas foi encontrado.</Card>
      ) : (
        filtered.map((row) => (
          <button key={row.cycle.id} type="button" className="block w-full text-left" onClick={() => setSelected(row)}>
            <Card className="space-y-2 transition hover:border-primary/40">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">Ovitrampa {row.cycle.trapCode}</p>
                  <p className="text-xs text-muted">{row.neighborhood}</p>
                </div>
                <FileBarChart className="size-4 shrink-0 text-primary" />
              </div>
              <dl className="grid grid-cols-1 gap-1 text-xs text-muted">
                <div className="flex justify-between gap-3">
                  <dt>Instalação</dt>
                  <dd className="text-ink">
                    {formatDate(row.cycle.installAt)} · {weekLabel(row.cycle.installEpiWeek)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Troca</dt>
                  <dd className="text-right text-ink">
                    {formatDate(row.cycle.swapAt)} · {weekLabel(row.cycle.swapEpiWeek)}
                    <span className="block">{situationLabel(row.cycle.swapSituation)}</span>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Retirada</dt>
                  <dd className="text-right text-ink">
                    {formatDate(row.cycle.removeAt)} · {weekLabel(row.cycle.removeEpiWeek)}
                    <span className="block">{situationLabel(row.cycle.removeSituation)}</span>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Agente</dt>
                  <dd className="text-ink">{row.agentName}</dd>
                </div>
              </dl>
            </Card>
          </button>
        ))
      )}

      <CicloDetalhesModal report={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
