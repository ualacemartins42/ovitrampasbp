import { liveQuery } from 'dexie'
import { Microscope, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { districtGroupLabel, neighborhoodLabelById } from '@/constants/bairros'
import { useAuth } from '@/features/auth/auth-context'
import { saveEducacaoSaude } from '@/features/educacao/repository'
import { cycleSituationLabel } from '@/lib/constants'
import { db } from '@/lib/db'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { cn, foldSearchText, formatDate, toDateInputValue } from '@/lib/utils'
import type { CycleRecord, Trap } from '@/types/domain'

export function ContagemOvosPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const neighborhoods = useNeighborhoods(true)

  const [traps, setTraps] = useState<Trap[]>([])
  const [cycles, setCycles] = useState<CycleRecord[]>([])
  const [query, setQuery] = useState('')
  const [selectedTrap, setSelectedTrap] = useState<Trap | null>(null)
  const [analysisDate, setAnalysisDate] = useState(() => toDateInputValue(new Date()))
  const [eggCount, setEggCount] = useState('')
  const [observation, setObservation] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const trapsSub = liveQuery(() => db.traps.orderBy('code').toArray()).subscribe(setTraps)
    const cyclesSub = liveQuery(() => db.cycles.orderBy('createdAt').reverse().toArray()).subscribe(setCycles)
    return () => {
      trapsSub.unsubscribe()
      cyclesSub.unsubscribe()
    }
  }, [])

  const neighborhoodName = (id: number | null) => neighborhoodLabelById(neighborhoods, id)

  const filtered = useMemo(() => {
    const term = foldSearchText(query)
    const visible = traps.filter((item) => !item.deletedAt)
    if (!term) return visible.slice(0, 20)
    return visible
      .filter((item) => {
        const haystack = foldSearchText(
          [
            item.code,
            item.street ?? '',
            item.number ?? '',
            item.district ?? '',
            neighborhoodName(item.neighborhoodId),
          ].join(' '),
        )
        return haystack.includes(term)
      })
      .slice(0, 30)
  }, [traps, query, neighborhoods])

  const relatedCycle = useMemo(() => {
    if (!selectedTrap) return null
    const forTrap = cycles.filter((item) => item.trapCode === selectedTrap.code)
    if (forTrap.length === 0) return null
    const withStages = forTrap.find((item) => item.swapAt || item.removeAt)
    return withStages ?? forTrap[0]
  }, [cycles, selectedTrap])

  const selectedNeighborhood = selectedTrap
    ? neighborhoods.find((item) => item.id === selectedTrap.neighborhoodId)
    : undefined
  const selectedBairro = selectedTrap ? neighborhoodName(selectedTrap.neighborhoodId) : ''
  const selectedDistrito = selectedTrap
    ? selectedTrap.district ||
      relatedCycle?.neighborhoodName ||
      (selectedNeighborhood ? districtGroupLabel(selectedNeighborhood.zone) : '')
    : ''

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!profile) return
    if (!selectedTrap) {
      toast.error('Selecione uma ovitrampa.')
      return
    }
    setSaving(true)
    try {
      await saveEducacaoSaude(
        profile,
        selectedTrap,
        relatedCycle,
        {
          trapCode: selectedTrap.code,
          analysisDate,
          eggCount,
          observation,
        },
        [],
        {
          street: selectedTrap.street,
          number: selectedTrap.number,
          neighborhoodName: selectedBairro || relatedCycle?.neighborhoodName || null,
          district: selectedDistrito || null,
        },
      )
      toast.success('Contagem salva neste aparelho.')
      navigate('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4 pb-8" onSubmit={(event) => void onSubmit(event)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Laboratório</p>
        <h1 className="text-xl font-semibold">Contagem de Ovos</h1>
        <p className="text-sm text-muted">
          Consulte a ovitrampa e o ciclo (troca/retirada) e registre a leitura da palheta.
        </p>
      </div>

      <Card className="space-y-3">
        <Field label="Pesquisar ovitrampa">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              value={query}
              placeholder="Buscar por número, rua ou bairro"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </Field>

        {selectedTrap ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-primary/20 bg-teal-50 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-primary">Ovitrampa {selectedTrap.code}</p>
                  <p className="mt-1 text-ink">
                    <span className="font-medium">Rua: </span>
                    {selectedTrap.street || '—'}
                  </p>
                  <p className="text-ink">
                    <span className="font-medium">Número: </span>
                    {selectedTrap.number || '—'}
                  </p>
                  <p className="text-ink">
                    <span className="font-medium">Bairro: </span>
                    {selectedBairro || '—'}
                  </p>
                  <p className="text-ink">
                    <span className="font-medium">Distrito: </span>
                    {selectedDistrito || '—'}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1 text-muted hover:bg-white"
                  aria-label="Limpar ovitrampa selecionada"
                  onClick={() => setSelectedTrap(null)}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {relatedCycle ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <section className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
                  <h2 className="font-semibold text-blue-900">Troca de palheta</h2>
                  {relatedCycle.swapAt ? (
                    <>
                      <p className="mt-1 text-ink">
                        <span className="font-medium">Data: </span>
                        {formatDate(relatedCycle.swapAt)}
                        {relatedCycle.swapEpiWeek != null ? ` · SE ${relatedCycle.swapEpiWeek}` : ''}
                      </p>
                      <p className="text-ink">
                        <span className="font-medium">Situação: </span>
                        {cycleSituationLabel(relatedCycle.swapSituation)}
                      </p>
                      {relatedCycle.swapObs ? (
                        <p className="mt-1 text-muted">{relatedCycle.swapObs}</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-1 text-muted">Troca ainda não registrada neste ciclo.</p>
                  )}
                </section>
                <section className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm">
                  <h2 className="font-semibold text-orange-900">Retirada</h2>
                  {relatedCycle.removeAt ? (
                    <>
                      <p className="mt-1 text-ink">
                        <span className="font-medium">Data: </span>
                        {formatDate(relatedCycle.removeAt)}
                        {relatedCycle.removeEpiWeek != null ? ` · SE ${relatedCycle.removeEpiWeek}` : ''}
                      </p>
                      <p className="text-ink">
                        <span className="font-medium">Situação: </span>
                        {cycleSituationLabel(relatedCycle.removeSituation)}
                      </p>
                      {relatedCycle.removeObs ? (
                        <p className="mt-1 text-muted">{relatedCycle.removeObs}</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-1 text-muted">Retirada ainda não registrada neste ciclo.</p>
                  )}
                </section>
              </div>
            ) : (
              <Card className="text-sm text-muted">
                Nenhum ciclo encontrado para esta ovitrampa neste aparelho.
              </Card>
            )}
          </div>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma ovitrampa encontrada.</p>
            ) : (
              filtered.map((trap) => (
                <button
                  key={trap.id}
                  type="button"
                  className="block w-full rounded-xl border border-line bg-white px-3 py-2 text-left hover:border-primary/40 hover:bg-teal-50"
                  onClick={() => {
                    setSelectedTrap(trap)
                    setQuery(trap.code)
                  }}
                >
                  <p className="font-semibold">Ovitrampa {trap.code}</p>
                  <p className="text-xs text-muted">
                    {neighborhoodName(trap.neighborhoodId)}
                    {trap.street ? ` · ${trap.street}` : ''}
                    {trap.number ? `, ${trap.number}` : ''}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Data da análise">
          <Input
            type="date"
            required
            value={analysisDate}
            onChange={(event) => setAnalysisDate(event.target.value)}
          />
        </Field>
        <Field label="Nº de ovos">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={eggCount}
            onChange={(event) => setEggCount(event.target.value)}
          />
        </Field>
      </div>

      <Field label="Observação">
        <Textarea value={observation} onChange={(event) => setObservation(event.target.value)} />
      </Field>

      <Button type="submit" className="w-full" size="lg" disabled={saving || !selectedTrap}>
        {saving ? 'Salvando...' : 'Salvar contagem'}
      </Button>

      <p className={cn('flex items-center gap-2 text-xs text-muted')}>
        <Microscope className="size-3.5" />
        O registro fica no aparelho e sobe na sincronização quando houver internet.
      </p>
    </form>
  )
}
