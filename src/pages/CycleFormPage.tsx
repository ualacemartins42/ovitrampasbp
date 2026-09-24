import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { deleteCycle, saveCycleStage } from '@/features/cycles/repository'
import { useAuth } from '@/features/auth/auth-context'
import { useLayoutMode } from '@/context/LayoutContext'
import { CYCLE_SITUATION_OPTIONS, normalizeCycleSituation } from '@/lib/constants'
import { formatNeighborhoodLabel } from '@/constants/bairros'
import { db } from '@/lib/db'
import { epidemiologicalWeekLabel } from '@/lib/epiWeek'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { addDaysToDateInput, cn, isDateInputBefore, isoToDateInput, parseDateInput, toDateInputValue } from '@/lib/utils'
import type { CycleRecord, CycleSituation, Trap } from '@/types/domain'

function OutraObservacaoToggle({
  label,
  value,
  onChange,
  open,
  onOpenChange,
  readOnly = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  readOnly?: boolean
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={open}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'inline-flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition',
          open
            ? 'border-primary bg-teal-50 text-primary'
            : 'border-line bg-white text-ink hover:bg-teal-50',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded border text-xs',
            open ? 'border-primary bg-primary text-primary-foreground' : 'border-line bg-white text-transparent',
          )}
        >
          ✓
        </span>
        Outra observação
      </button>
      {open ? (
        <Field label={label}>
          <Input
            readOnly={readOnly}
            className={readOnly ? 'bg-surface' : undefined}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </Field>
      ) : null}
    </div>
  )
}

export function CycleFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { isDesktop } = useLayoutMode()
  const [traps, setTraps] = useState<Trap[]>([])
  const neighborhoods = useNeighborhoods(true)
  const [cycle, setCycle] = useState<CycleRecord | null>(null)
  const [trapCode, setTrapCode] = useState(searchParams.get('armadilha') ?? '')
  const [neighborhoodName, setNeighborhoodName] = useState('')
  const [installObs, setInstallObs] = useState('')
  const [showInstallObs, setShowInstallObs] = useState(false)
  const [estratoLiraa, setEstratoLiraa] = useState('')
  const [installDate, setInstallDate] = useState(() => toDateInputValue(new Date()))
  const [swapDate, setSwapDate] = useState(() => addDaysToDateInput(toDateInputValue(new Date()), 6))
  const [swapSituation, setSwapSituation] = useState<CycleSituation | ''>('')
  const [swapObs, setSwapObs] = useState('')
  const [showSwapObs, setShowSwapObs] = useState(false)
  const [removeDate, setRemoveDate] = useState(() => addDaysToDateInput(toDateInputValue(new Date()), 12))
  const [removeSituation, setRemoveSituation] = useState<CycleSituation | ''>('')
  const [removeObs, setRemoveObs] = useState('')
  const [showRemoveObs, setShowRemoveObs] = useState(false)
  const [saving, setSaving] = useState(false)

  const today = useMemo(() => new Date(), [])
  const installWeek = epidemiologicalWeekLabel(parseDateInput(installDate) ?? today)
  const swapWeek = epidemiologicalWeekLabel(parseDateInput(swapDate) ?? today)
  const removeWeek = epidemiologicalWeekLabel(parseDateInput(removeDate) ?? today)
  const removeDateBeforeSwap = Boolean(swapDate && removeDate && isDateInputBefore(removeDate, swapDate))

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
      setShowInstallObs(Boolean(row.installObs?.trim()))
      setEstratoLiraa(row.estratoLiraa ?? '')
      const nextSwapDate = row.swapAt
        ? isoToDateInput(row.swapAt)
        : addDaysToDateInput(isoToDateInput(row.installAt), 6)
      setSwapDate(nextSwapDate)
      const nextSwapSituation = normalizeCycleSituation(row.swapSituation) ?? ''
      setSwapSituation(nextSwapSituation)
      setSwapObs(row.swapObs ?? '')
      setShowSwapObs(Boolean(row.swapObs?.trim()) || nextSwapSituation === '9')
      setRemoveDate(row.removeAt ? isoToDateInput(row.removeAt) : addDaysToDateInput(nextSwapDate, 6))
      const nextRemoveSituation = normalizeCycleSituation(row.removeSituation) ?? ''
      setRemoveSituation(nextRemoveSituation)
      setRemoveObs(row.removeObs ?? '')
      setShowRemoveObs(Boolean(row.removeObs?.trim()) || nextRemoveSituation === '9')
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
  const canEditRemoveDate = registeringRemove

  useEffect(() => {
    if (!canEditSwapDate) return
    setSwapDate(addDaysToDateInput(installDate, 6, today))
  }, [installDate, canEditSwapDate, today])

  useEffect(() => {
    if (!canEditRemoveDate) return
    setRemoveDate(addDaysToDateInput(swapDate, 6, today))
  }, [swapDate, canEditRemoveDate, today])

  useEffect(() => {
    if (swapSituation === '9') setShowSwapObs(true)
  }, [swapSituation])

  useEffect(() => {
    if (removeSituation === '9') setShowRemoveObs(true)
  }, [removeSituation])

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
    if (registeringRemove && !parseDateInput(removeDate)) {
      toast.error('Informe a data da retirada.')
      return
    }
    if (registeringRemove && isDateInputBefore(removeDate, swapDate)) {
      toast.error('A data de retirada não pode ser anterior à data da troca.')
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
        installObs: showInstallObs ? installObs : '',
        estratoLiraa,
        swapDate,
        swapSituation,
        swapObs: showSwapObs ? swapObs : '',
        removeDate,
        removeSituation,
        removeObs: showRemoveObs ? removeObs : '',
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
        <div className={cn('grid gap-2', isDesktop ? 'grid-cols-3' : 'grid-cols-2')}>
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

      <div className={cn(isDesktop ? 'grid grid-cols-1 gap-4 xl:grid-cols-3' : 'space-y-4')}>
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
        <OutraObservacaoToggle
          label="Observações da instalação"
          value={installObs}
          onChange={setInstallObs}
          open={showInstallObs}
          onOpenChange={setShowInstallObs}
          readOnly={!isNew}
        />
        <Field label="Estrato LIRAa">
          <Input
            readOnly={!isNew}
            className={isNew ? undefined : 'bg-surface'}
            value={estratoLiraa}
            inputMode="numeric"
            onChange={(event) => setEstratoLiraa(event.target.value)}
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
                className={canEditSwapDate ? 'bg-white' : 'bg-surface'}
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
              onChange={(event) => {
                const next = event.target.value as CycleSituation | ''
                setSwapSituation(next)
                if (next === '9') setShowSwapObs(true)
              }}
            >
              <option value="">Selecione...</option>
              {CYCLE_SITUATION_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <OutraObservacaoToggle
            label="Observações da troca"
            value={swapObs}
            onChange={setSwapObs}
            open={showSwapObs}
            onOpenChange={setShowSwapObs}
            readOnly={registeringRemove}
          />
        </Card>
      ) : null}

      {registeringRemove || cycle?.removeAt ? (
        <Card className="space-y-3 border-orange-200 bg-orange-50">
          <h2 className="border-b border-orange-200 pb-1 font-semibold text-orange-900">3. Retirada</h2>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data retirada">
              <Input
                type="date"
                required={canEditRemoveDate}
                readOnly={!canEditRemoveDate}
                min={swapDate || undefined}
                className={canEditRemoveDate ? 'bg-white' : 'bg-surface'}
                value={removeDate}
                onChange={(event) => setRemoveDate(event.target.value)}
                aria-invalid={removeDateBeforeSwap}
              />
              {removeDateBeforeSwap ? (
                <p className="mt-1 text-xs text-danger">A retirada não pode ser anterior à data da troca.</p>
              ) : null}
            </Field>
            <Field label="Semana epi.">
              <Input readOnly className="bg-white font-semibold text-danger" value={removeWeek} />
            </Field>
          </div>
          <Field label="Situação encontrada">
            <Select
              value={removeSituation}
              onChange={(event) => {
                const next = event.target.value as CycleSituation | ''
                setRemoveSituation(next)
                if (next === '9') setShowRemoveObs(true)
              }}
            >
              <option value="">Selecione...</option>
              {CYCLE_SITUATION_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <OutraObservacaoToggle
            label="Observações da retirada"
            value={removeObs}
            onChange={setRemoveObs}
            open={showRemoveObs}
            onOpenChange={setShowRemoveObs}
          />
        </Card>
      ) : null}
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={saving || (registeringRemove && removeDateBeforeSwap)}>
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
