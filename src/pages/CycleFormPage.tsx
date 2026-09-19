import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { deleteCycle, saveCycleStage } from '@/features/cycles/repository'
import { useAuth } from '@/features/auth/auth-context'
import { CYCLE_SITUATION_LABELS } from '@/lib/constants'
import { formatNeighborhoodLabel } from '@/constants/bairros'
import { db } from '@/lib/db'
import { epidemiologicalWeekLabel } from '@/lib/epiWeek'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { addDays, isoToDateInput, parseDateInput, toDateInputValue } from '@/lib/utils'
import type { CycleRecord, CycleSituation, Trap } from '@/types/domain'

export function CycleFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [traps, setTraps] = useState<Trap[]>([])
  const neighborhoods = useNeighborhoods()
  const [cycle, setCycle] = useState<CycleRecord | null>(null)
  const [trapCode, setTrapCode] = useState(searchParams.get('armadilha') ?? '')
  const [neighborhoodName, setNeighborhoodName] = useState('')
  const [installObs, setInstallObs] = useState('')
  const [installDate, setInstallDate] = useState(() => toDateInputValue(new Date()))
  const [swapDate, setSwapDate] = useState(() => toDateInputValue(addDays(new Date(), 6)))
  const [swapSituation, setSwapSituation] = useState<CycleSituation | ''>('')
  const [swapObs, setSwapObs] = useState('')
  const [removeSituation, setRemoveSituation] = useState<CycleSituation | ''>('')
  const [removeObs, setRemoveObs] = useState('')
  const [saving, setSaving] = useState(false)

  const today = useMemo(() => new Date(), [])
  const todayLabel = toDateInputValue(today)
  const todayWeek = epidemiologicalWeekLabel(today)
  const installWeek = epidemiologicalWeekLabel(parseDateInput(installDate) ?? today)
  const swapWeek = epidemiologicalWeekLabel(parseDateInput(swapDate) ?? today)

  useEffect(() => {
    void db.traps.orderBy('code').toArray().then((rows) => setTraps(rows.filter((item) => !item.deletedAt)))
  }, [])

  useEffect(() => {
    if (!id || id === 'novo') return
    void db.cycles.get(id).then((row) => {
      if (!row) {
        toast.error('Ciclo não encontrado.')
        navigate('/ciclos')
        return
      }
      setCycle(row)
      setTrapCode(row.trapCode)
      setNeighborhoodName(row.neighborhoodName ?? '')
      setInstallDate(isoToDateInput(row.installAt))
      setInstallObs(row.installObs ?? '')
      setSwapDate(
        row.swapAt
          ? isoToDateInput(row.swapAt)
          : toDateInputValue(addDays(row.installAt ? new Date(row.installAt) : new Date(), 6)),
      )
      setSwapSituation(row.swapSituation ?? '')
      setSwapObs(row.swapObs ?? '')
      setRemoveSituation(row.removeSituation ?? '')
      setRemoveObs(row.removeObs ?? '')
    })
  }, [id, navigate])

  const selectedTrap = traps.find((item) => item.code === trapCode)

  useEffect(() => {
    if (cycle || !selectedTrap) return
    const neighborhood = neighborhoods.find((item) => item.id === selectedTrap.neighborhoodId)
    setNeighborhoodName(neighborhood ? formatNeighborhoodLabel(neighborhood) : selectedTrap.district ?? '')
  }, [selectedTrap, neighborhoods, cycle])

  const isNew = !cycle
  const registeringSwap = cycle?.status === 'instalada'
  const registeringRemove = cycle?.status === 'trocada'
  const title = isNew ? 'Nova instalação' : registeringSwap ? 'Registrar troca' : 'Registrar retirada'
  const canEditInstallDate = isNew || registeringSwap
  const canEditSwapDate = registeringSwap

  useEffect(() => {
    if (!canEditSwapDate) return
    const base = parseDateInput(installDate) ?? today
    setSwapDate(toDateInputValue(addDays(base, 6)))
  }, [installDate, canEditSwapDate, today])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!profile) return
    if (registeringSwap && !swapSituation) {
      toast.error('Informe a situação encontrada na troca.')
      return
    }
    if ((isNew || registeringSwap) && !parseDateInput(installDate)) {
      toast.error('Informe a data de instalação.')
      return
    }
    if (registeringSwap && !parseDateInput(swapDate)) {
      toast.error('Informe a data da troca.')
      return
    }
    if (registeringRemove && !removeSituation) {
      toast.error('Informe a situação encontrada na retirada.')
      return
    }
    setSaving(true)
    try {
      await saveCycleStage(profile, selectedTrap, cycle, {
        trapCode,
        neighborhoodName,
        installDate,
        installObs,
        swapDate,
        swapSituation,
        swapObs,
        removeSituation,
        removeObs,
      })
      toast.success('Etapa do ciclo salva.')
      navigate('/ciclos')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o ciclo.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!cycle) return
    if (!window.confirm('Apagar histórico de ciclo?')) return
    setSaving(true)
    try {
      await deleteCycle(cycle)
      toast.success('Ciclo excluído.')
      navigate('/ciclos')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4 pb-8" onSubmit={(event) => void onSubmit(event)}>
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted">Cada ciclo percorre instalação, troca de palheta e retirada.</p>
      </div>

      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Armadilha *">
            <Select
              required
              disabled={!isNew}
              value={trapCode}
              onChange={(event) => setTrapCode(event.target.value)}
            >
              <option value="">Selecione...</option>
              {traps.map((trap) => (
                <option key={trap.id} value={trap.code}>
                  {trap.code}
                  {trap.street ? ` · ${trap.street}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bairro *">
            <Input required readOnly className="bg-surface" value={neighborhoodName} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="border-b border-line pb-1 font-semibold">1. Instalação</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Data instalação">
            <Input
              type="date"
              readOnly={!canEditInstallDate}
              className={canEditInstallDate ? 'bg-white' : 'bg-surface'}
              value={installDate}
              onChange={(event) => setInstallDate(event.target.value)}
            />
          </Field>
          <Field label="Semana epi.">
            <Input
              readOnly
              className="bg-white font-semibold text-danger"
              value={installWeek}
            />
          </Field>
        </div>
        <Field label="Observações da instalação">
          <Input
            readOnly={!isNew}
            className={isNew ? undefined : 'bg-surface'}
            value={installObs}
            onChange={(event) => setInstallObs(event.target.value)}
          />
        </Field>
      </Card>

      {registeringSwap || registeringRemove || cycle?.swapAt ? (
        <Card className="space-y-3 border-blue-200 bg-blue-50">
          <h2 className="border-b border-blue-200 pb-1 font-semibold text-blue-900">2. Troca de palheta</h2>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data troca">
              <Input
                type="date"
                readOnly={!canEditSwapDate}
                className="bg-white"
                value={swapDate}
                onChange={(event) => setSwapDate(event.target.value)}
              />
            </Field>
            <Field label="Semana epi.">
              <Input
                readOnly
                className="bg-white font-semibold text-danger"
                value={swapWeek}
              />
            </Field>
          </div>
          <Field label="Situação encontrada">
            <Select
              disabled={registeringRemove}
              value={swapSituation}
              onChange={(event) => setSwapSituation(event.target.value as CycleSituation | '')}
            >
              <option value="">Selecione...</option>
              {Object.entries(CYCLE_SITUATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observações da troca">
            <Input
              readOnly={registeringRemove}
              className={registeringRemove ? 'bg-surface' : undefined}
              value={swapObs}
              onChange={(event) => setSwapObs(event.target.value)}
            />
          </Field>
        </Card>
      ) : null}

      {registeringRemove || cycle?.removeAt ? (
        <Card className="space-y-3 border-orange-200 bg-orange-50">
          <h2 className="border-b border-orange-200 pb-1 font-semibold text-orange-900">3. Retirada</h2>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data retirada">
              <Input type="date" readOnly className="bg-white" value={todayLabel} />
            </Field>
            <Field label="Semana epi.">
              <Input readOnly className="bg-white font-semibold text-danger" value={todayWeek} />
            </Field>
          </div>
          <Field label="Situação encontrada">
            <Select
              value={removeSituation}
              onChange={(event) => setRemoveSituation(event.target.value as CycleSituation | '')}
            >
              <option value="">Selecione...</option>
              {Object.entries(CYCLE_SITUATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Observações da retirada">
            <Input value={removeObs} onChange={(event) => setRemoveObs(event.target.value)} />
          </Field>
        </Card>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar etapa'}
        </Button>
        {cycle ? (
          <Button variant="danger" className="flex-1" disabled={saving} onClick={() => void onDelete()}>
            Excluir ciclo
          </Button>
        ) : null}
      </div>
    </form>
  )
}
