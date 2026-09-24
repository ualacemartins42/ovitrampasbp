import { Camera, MapPin, QrCode } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { NeighborhoodSelect } from '@/components/forms/NeighborhoodSelect'
import { neighborhoodLabelById } from '@/constants/bairros'
import { useLayoutMode } from '@/context/LayoutContext'
import { useAuth } from '@/features/auth/auth-context'
import { saveCollection } from '@/features/collections/repository'
import { COLLECTION_KIND_LABELS, TRAP_STATUS_LABELS } from '@/lib/constants'
import { db } from '@/lib/db'
import { captureCoordinates } from '@/lib/geo'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { cn, toDateTimeLocalValue } from '@/lib/utils'
import type { CollectionFormValues, TrapType } from '@/types/domain'

export function CollectionFormPage() {
  const { profile } = useAuth()
  const { isDesktop } = useLayoutMode()
  const navigate = useNavigate()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const neighborhoods = useNeighborhoods(true)
  const [trapTypes, setTrapTypes] = useState<TrapType[]>([])
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [gpsMessage, setGpsMessage] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch } = useForm<CollectionFormValues>({
    defaultValues: {
      kind: 'vistoria',
      trapCode: '',
      trapTypeId: '1',
      street: '',
      number: '',
      neighborhoodId: profile?.neighborhoodId ? String(profile.neighborhoodId) : '',
      complement: '',
      referencePoint: '',
      latitude: '',
      longitude: '',
      occurredAt: toDateTimeLocalValue(),
      trapStatus: 'instalada',
      paddleCode: '',
      estimatedEggs: '',
      observations: '',
    },
  })

  useEffect(() => {
    void db.trapTypes
      .toArray()
      .then((rows) => setTrapTypes([...rows].sort((a, b) => a.id - b.id)))
  }, [])

  useEffect(() => {
    if (profile?.neighborhoodId) {
      setValue('neighborhoodId', String(profile.neighborhoodId))
    }
  }, [profile, neighborhoods, setValue])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function onTrapCodeBlur(code: string) {
    const trap = await db.traps.where('code').equals(code.trim().toUpperCase()).first()
    if (!trap) return
    setValue('trapTypeId', String(trap.trapTypeId))
    setValue('trapStatus', trap.status)
    if (trap.propertyId) {
      const property = await db.properties.get(trap.propertyId)
      if (!property) return
      setValue('street', property.street)
      setValue('number', property.number ?? '')
      setValue('neighborhoodId', String(property.neighborhoodId))
      setValue('complement', property.complement ?? '')
      setValue('referencePoint', property.referencePoint ?? '')
      if (property.latitude) setValue('latitude', String(property.latitude))
      if (property.longitude) setValue('longitude', String(property.longitude))
    }
  }

  async function onCaptureGps() {
    setGpsMessage('Obtendo GPS...')
    try {
      const coords = await captureCoordinates()
      setValue('latitude', coords.latitude.toFixed(6))
      setValue('longitude', coords.longitude.toFixed(6))
      setGpsMessage(`Precisão aproximada: ${Math.round(coords.accuracy)} m`)
    } catch (error) {
      setGpsMessage(error instanceof Error ? error.message : 'Falha no GPS')
    }
  }

  async function onScanQr() {
    const Detector = window.BarcodeDetector
    if (!Detector) {
      toast.message('Leitura de QR não suportada neste navegador. Digite o código.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      const detector = new Detector({ formats: ['qr_code'] })
      const result = await detector.detect(video)
      stream.getTracks().forEach((track) => track.stop())
      const raw = result[0]?.rawValue
      if (raw) {
        setValue('trapCode', raw)
        await onTrapCodeBlur(raw)
        toast.success('QR Code lido.')
      } else {
        toast.error('Nenhum QR Code encontrado. Tente novamente.')
      }
    } catch {
      toast.error('Não foi possível abrir a câmera para o QR Code.')
    }
  }

  function onPhotoChange(file: File | undefined) {
    if (!file) return
    setPhoto(file)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
  }

  async function onSubmit(values: CollectionFormValues) {
    if (!profile) return
    if (!values.trapCode.trim()) {
      toast.error('Informe o código da armadilha.')
      return
    }
    setSaving(true)
    try {
      await saveCollection(profile, values, photo)
      toast.success('Coleta salva neste aparelho.')
      navigate('/coletas')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const latitude = watch('latitude')
  const longitude = watch('longitude')
  const actingAt = neighborhoodLabelById(neighborhoods, profile?.neighborhoodId, profile?.zone ?? 'Sem zona')

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <h1 className="text-xl font-semibold">Nova coleta / vistoria</h1>
        <p className="text-sm text-muted">
          Funciona sem internet. O envio acontece depois, na sincronização.
        </p>
      </div>

      <Card className="space-y-1 text-sm">
        <p className="font-semibold">{profile?.fullName}</p>
        <p className="text-muted">
          Matrícula {profile?.registrationNumber ?? '—'} · {actingAt}
        </p>
      </Card>

      <div className={cn(isDesktop ? 'grid grid-cols-2 gap-4 xl:grid-cols-3' : 'space-y-4')}>
        <Field label="Tipo de registro">
          <Select {...register('kind')}>
            {Object.entries(COLLECTION_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Código / QR da armadilha">
          <div className="flex gap-2">
            <Input
              {...register('trapCode')}
              placeholder="Ex: OVT-0142"
              onBlur={(event) => void onTrapCodeBlur(event.target.value)}
            />
            <Button type="button" variant="secondary" onClick={() => void onScanQr()} aria-label="Ler QR Code">
              <QrCode className="size-5" />
            </Button>
          </div>
        </Field>

        <Field label="Tipo de armadilha">
          <Select {...register('trapTypeId')}>
            {trapTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status da armadilha">
          <Select {...register('trapStatus')}>
            {Object.entries(TRAP_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Data e hora">
          <Input type="datetime-local" {...register('occurredAt')} />
        </Field>

        <div className={cn('grid grid-cols-3 gap-2', isDesktop && 'col-span-2 xl:col-span-1')}>
          <div className="col-span-2">
            <Field label="Rua">
              <Input {...register('street')} />
            </Field>
          </div>
          <Field label="Nº">
            <Input {...register('number')} />
          </Field>
        </div>

        <Field label="Bairro / distrito">
          <NeighborhoodSelect
            neighborhoods={neighborhoods}
            value={watch('neighborhoodId')}
            onChange={(next) => setValue('neighborhoodId', next, { shouldDirty: true, shouldValidate: true })}
          />
        </Field>

        <Field label="Complemento">
          <Input {...register('complement')} />
        </Field>
        <Field label="Ponto de referência">
          <Input {...register('referencePoint')} />
        </Field>

        <Field label="Código da palheta / amostra">
          <Input {...register('paddleCode')} placeholder="Etiqueta do laboratório" />
        </Field>

        <Field label="Quantidade estimada de ovos (opcional)">
          <Input type="number" min={0} inputMode="numeric" {...register('estimatedEggs')} />
        </Field>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Coordenadas GPS</p>
            <p className="text-xs text-muted">Usa o GPS do celular, mesmo sem internet.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void onCaptureGps()}>
            <MapPin className="size-4" />
            Capturar
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input {...register('latitude')} placeholder="Latitude" inputMode="decimal" />
          <Input {...register('longitude')} placeholder="Longitude" inputMode="decimal" />
        </div>
        {gpsMessage ? <p className="text-xs text-muted">{gpsMessage}</p> : null}
        {latitude && longitude ? (
          <p className="text-xs text-ok">
            {latitude}, {longitude}
          </p>
        ) : null}
      </Card>

      <Field label="Observações do agente">
        <Textarea
          {...register('observations')}
          placeholder="Larvas, água suja, teto coberto/descoberto, acesso ao imóvel..."
        />
      </Field>

      <div className={cn(isDesktop ? 'grid grid-cols-2 gap-4' : 'space-y-4')}>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Foto da armadilha / palheta</p>
            <Button type="button" variant="secondary" onClick={() => photoInputRef.current?.click()}>
              <Camera className="size-4" />
              Capturar
            </Button>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => onPhotoChange(event.target.files?.[0])}
          />
          {preview ? (
            <img src={preview} alt="Pré-visualização da coleta" className="h-40 w-full rounded-xl object-cover" />
          ) : (
            <p className="text-sm text-muted">A foto fica no aparelho e sobe no envio.</p>
          )}
        </Card>

        <Button type="submit" className={cn('w-full', isDesktop && 'self-end')} size="lg" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar coleta no aparelho'}
        </Button>
      </div>
    </form>
  )
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>
    }
  }
}
