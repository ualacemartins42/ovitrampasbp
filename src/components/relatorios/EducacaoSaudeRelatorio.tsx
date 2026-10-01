import { liveQuery } from 'dexie'
import { Download, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EducacaoRegistroCard } from '@/components/educacao/EducacaoRegistroCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { formatNeighborhoodLabel } from '@/constants/bairros'
import { useLayoutMode } from '@/context/LayoutContext'
import { useAuth } from '@/features/auth/auth-context'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { cn } from '@/lib/utils'
import {
  downloadEducacaoCsv,
  EMPTY_EDUCACAO_FILTERS,
  filterEducacaoReports,
  listEducacaoReports,
  type EducacaoFilters,
  type EducacaoReportRow,
} from '@/services/educacaoService'

export function EducacaoSaudeRelatorio() {
  const { profile } = useAuth()
  const { isDesktop } = useLayoutMode()
  const neighborhoods = useNeighborhoods(true)
  const [rows, setRows] = useState<EducacaoReportRow[]>([])
  const [filters, setFilters] = useState<EducacaoFilters>(EMPTY_EDUCACAO_FILTERS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sub = liveQuery(() => listEducacaoReports(profile)).subscribe({
      next: (items) => {
        setRows(items)
        setLoading(false)
      },
      error: () => {
        toast.error('Não foi possível carregar as ações de Educação em Saúde.')
        setLoading(false)
      },
    })
    return () => sub.unsubscribe()
  }, [profile])

  const filtered = useMemo(() => filterEducacaoReports(rows, filters), [rows, filters])

  const agentOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const row of rows) byId.set(row.record.agentId, row.agentName)
    return [...byId.entries()].sort((left, right) => left[1].localeCompare(right[1], 'pt-BR'))
  }, [rows])

  const extraNeighborhoods = useMemo(() => {
    const known = new Set(neighborhoods.map((item) => item.name))
    const names = new Set<string>()
    for (const row of rows) {
      const name = row.neighborhood.split(' - ')[0]?.trim()
      if (name && name !== 'Sem bairro' && !known.has(name)) names.add(name)
    }
    return [...names].sort((left, right) => left.localeCompare(right, 'pt-BR'))
  }, [neighborhoods, rows])

  function updateFilter<K extends keyof EducacaoFilters>(key: K, value: EducacaoFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          className="pl-9"
          value={filters.query}
          placeholder="Buscar ovitrampa, rua ou ação"
          onChange={(event) => updateFilter('query', event.target.value)}
        />
      </div>

      <div className={cn('grid gap-2', isDesktop ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-1')}>
        <Field label="Bairro / distrito">
          <Select value={filters.neighborhood} onChange={(event) => updateFilter('neighborhood', event.target.value)}>
            <option value="">Todos</option>
            {neighborhoods.map((item) => (
              <option key={item.id} value={item.name}>
                {formatNeighborhoodLabel(item)}
              </option>
            ))}
            {extraNeighborhoods.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Agente">
          <Select value={filters.agentId} onChange={(event) => updateFilter('agentId', event.target.value)}>
            <option value="">Todos</option>
            {agentOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2 xl:col-span-2">
          <Field label="Ação de">
            <Input type="date" value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} />
          </Field>
          <Field label="Ação até">
            <Input type="date" value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} />
          </Field>
        </div>
      </div>

      <Button
        className="w-full"
        variant="secondary"
        disabled={filtered.length === 0}
        onClick={() => downloadEducacaoCsv(filtered)}
      >
        <Download className="size-4" />
        Exportar CSV
      </Button>

      <p className="text-xs text-muted">{filtered.length} ação(ões) no filtro atual.</p>

      {loading ? (
        <Card className="text-sm text-muted">Carregando ações...</Card>
      ) : filtered.length === 0 ? (
        <Card className="text-sm text-muted">Nenhuma ação de Educação em Saúde encontrada.</Card>
      ) : (
        <div className={cn(isDesktop ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3')}>
          {filtered.map((row) => (
            <EducacaoRegistroCard key={row.record.id} row={row} />
          ))}
        </div>
      )}
    </div>
  )
}
