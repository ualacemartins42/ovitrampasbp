import { MapPin } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { NeighborhoodSelect } from '@/components/forms/NeighborhoodSelect'
import { districtGroupLabel } from '@/constants/bairros'
import { deleteTrap, saveTrap, type TrapFormValues } from '@/features/traps/repository'
import { TRAP_AREA_LABELS } from '@/lib/constants'
import { db } from '@/lib/db'
import { captureCoordinates } from '@/lib/geo'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import type { Trap, TrapAreaType } from '@/types/domain'

const emptyForm: TrapFormValues = {
  code: '',
  neighborhoodId: '',
  district: '',
  street: '',
  number: '',
  complement: '',
  locationDetail: '',
  responsible: '',
  block: '',
  areaType: 'urbana',
  latitude: '',
  longitude: '',
}

export function TrapFormPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(code)
  const [existing, setExisting] = useState<Trap | null>(null)
  const [values, setValues] = useState<TrapFormValues>(emptyForm)
  const [gpsMessage, setGpsMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const neighborhoods = useNeighborhoods()

  useEffect(() => {
    if (!code) {
      setExisting(null)
      setValues(emptyForm)
      return
    }
    void db.traps
      .where('code')
      .equals(decodeURIComponent(code))
      .first()
      .then((trap) => {
        if (!trap || trap.deletedAt) {
          toast.error('Ovitrampa não encontrada.')
          navigate('/ovitrampas')
          return
        }
        setExisting(trap)
        setValues({
          code: trap.code,
          neighborhoodId: trap.neighborhoodId ? String(trap.neighborhoodId) : '',
          district: trap.district ?? '',
          street: trap.street ?? '',
          number: trap.number ?? '',
          complement: trap.complement ?? '',
          locationDetail: trap.locationDetail ?? '',
          responsible: trap.responsible ?? '',
          block: trap.block ?? '',
          areaType: trap.areaType ?? 'urbana',
          latitude: trap.latitude != null ? String(trap.latitude) : '',
          longitude: trap.longitude != null ? String(trap.longitude) : '',
        })
      })
  }, [code, navigate])

  function patch<K extends keyof TrapFormValues>(key: K, value: TrapFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function onCaptureGps() {
    setGpsMessage('Obtendo GPS...')
    try {
      const coords = await captureCoordinates()
      patch('latitude', coords.latitude.toFixed(6))
      patch('longitude', coords.longitude.toFixed(6))
      setGpsMessage(`Precisão aproximada: ${Math.round(coords.accuracy)} m`)
    } catch (error) {
      setGpsMessage(error instanceof Error ? error.message : 'Falha no GPS')
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await saveTrap(values, existing)
      toast.success('Ovitrampa salva neste aparelho.')
      navigate('/ovitrampas')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!existing) return
    if (!window.confirm('Apagar ovitrampa?')) return
    setSaving(true)
    try {
      await deleteTrap(existing)
      toast.success('Ovitrampa excluída.')
      navigate('/ovitrampas')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
      <div>
        <h1 className="text-xl font-semibold">{editing ? 'Editar ovitrampa' : 'Cadastrar ovitrampa'}</h1>
        <p className="text-sm text-muted">O número de identificação é a chave única da armadilha.</p>
      </div>

      <Field label="Número de identificação *">
        <Input
          inputMode="numeric"
          required
          readOnly={editing}
          className={editing ? 'bg-surface' : undefined}
          value={values.code}
          onChange={(event) => patch('code', event.target.value)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-2">
        <Field label="Bairro / distrito">
          <NeighborhoodSelect
            neighborhoods={neighborhoods}
            value={values.neighborhoodId}
            onChange={(nextId) => {
              const selected = neighborhoods.find((item) => String(item.id) === nextId)
              setValues((current) => ({
                ...current,
                neighborhoodId: nextId,
                district: selected ? districtGroupLabel(selected.zone) : '',
              }))
            }}
          />
        </Field>
        <Field label="Setor/Distrito">
          <Input value={values.district} onChange={(event) => patch('district', event.target.value)} />
        </Field>
      </div>

      <Field label="Rua onde está localizada">
        <Input value={values.street} onChange={(event) => patch('street', event.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Número">
          <Input value={values.number} onChange={(event) => patch('number', event.target.value)} />
        </Field>
        <Field label="Complemento">
          <Input value={values.complement} onChange={(event) => patch('complement', event.target.value)} />
        </Field>
      </div>

      <Field label="Localização (ex: muro)">
        <Input value={values.locationDetail} onChange={(event) => patch('locationDetail', event.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Responsável">
          <Input value={values.responsible} onChange={(event) => patch('responsible', event.target.value)} />
        </Field>
        <Field label="Quarteirão">
          <Input value={values.block} onChange={(event) => patch('block', event.target.value)} />
        </Field>
      </div>

      <Field label="Tipo da ovitrampa">
        <Select
          value={values.areaType}
          onChange={(event) => patch('areaType', event.target.value as TrapAreaType)}
        >
          {Object.entries(TRAP_AREA_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Card className="space-y-3">
        <Button variant="secondary" className="w-full" onClick={() => void onCaptureGps()}>
          <MapPin className="size-4" />
          Capturar GPS
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Latitude">
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="-22.523456"
              value={values.latitude}
              onChange={(event) => patch('latitude', event.target.value)}
            />
          </Field>
          <Field label="Longitude">
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="-43.826100"
              value={values.longitude}
              onChange={(event) => patch('longitude', event.target.value)}
            />
          </Field>
        </div>
        <p className="text-xs text-muted">Use Capturar GPS ou digite as coordenadas manualmente.</p>
        {gpsMessage ? <p className="text-xs text-muted">{gpsMessage}</p> : null}
      </Card>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
        {editing ? (
          <Button variant="danger" className="flex-1" disabled={saving} onClick={() => void onDelete()}>
            Excluir
          </Button>
        ) : null}
      </div>
    </form>
  )
}
