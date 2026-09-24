import { liveQuery } from 'dexie'
import { Camera, ImagePlus, Megaphone, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { districtGroupLabel, neighborhoodLabelById } from '@/constants/bairros'
import { useAuth } from '@/features/auth/auth-context'
import { saveEducacaoSaude } from '@/features/educacao/repository'
import { compressImageFile } from '@/lib/imageCompression'
import { db } from '@/lib/db'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { cn, foldSearchText, toDateInputValue } from '@/lib/utils'
import type { Trap } from '@/types/domain'

const MAX_PHOTOS = 5

interface PhotoDraft {
  id: string
  blob: Blob
  previewUrl: string
}

export function EducacaoSaudePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const neighborhoods = useNeighborhoods(true)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [traps, setTraps] = useState<Trap[]>([])
  const [query, setQuery] = useState('')
  const [selectedTrap, setSelectedTrap] = useState<Trap | null>(null)
  const [actionDate, setActionDate] = useState(() => toDateInputValue(new Date()))
  const [actionTaken, setActionTaken] = useState('')
  const [photos, setPhotos] = useState<PhotoDraft[]>([])
  const photosRef = useRef(photos)
  photosRef.current = photos
  const [saving, setSaving] = useState(false)
  const [compressing, setCompressing] = useState(false)

  useEffect(() => {
    const sub = liveQuery(() => db.traps.orderBy('code').toArray()).subscribe(setTraps)
    return () => sub.unsubscribe()
  }, [])

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl)
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

  const selectedNeighborhood = selectedTrap
    ? neighborhoods.find((item) => item.id === selectedTrap.neighborhoodId)
    : undefined
  const selectedBairro = selectedTrap ? neighborhoodName(selectedTrap.neighborhoodId) : ''
  const selectedDistrito = selectedTrap
    ? selectedTrap.district || (selectedNeighborhood ? districtGroupLabel(selectedNeighborhood.zone) : '')
    : ''

  async function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      toast.message('Limite de 5 fotos atingido.')
      return
    }

    const files = Array.from(fileList).slice(0, remaining)
    setCompressing(true)
    try {
      const next: PhotoDraft[] = []
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`Arquivo ignorado: ${file.name}`)
          continue
        }
        const blob = await compressImageFile(file)
        next.push({
          id: crypto.randomUUID(),
          blob,
          previewUrl: URL.createObjectURL(blob),
        })
      }
      if (next.length) setPhotos((current) => [...current, ...next])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível processar a foto.')
    } finally {
      setCompressing(false)
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((item) => item.id !== id)
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!profile) return
    if (!selectedTrap) {
      toast.error('Selecione uma ovitrampa.')
      return
    }
    if (!actionTaken.trim()) {
      toast.error('Informe a ação tomada.')
      return
    }
    setSaving(true)
    try {
      await saveEducacaoSaude(
        profile,
        selectedTrap,
        null,
        {
          trapCode: selectedTrap.code,
          analysisDate: actionDate,
          eggCount: '',
          observation: actionTaken,
        },
        photos.map((item) => item.blob),
        {
          street: selectedTrap.street,
          number: selectedTrap.number,
          neighborhoodName: selectedBairro || null,
          district: selectedDistrito || null,
        },
      )
      toast.success('Ação educativa salva neste aparelho.')
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
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Campo</p>
        <h1 className="text-xl font-semibold">Educação em Saúde</h1>
        <p className="text-sm text-muted">Registrar ações educativas e conscientização junto às ovitrampas.</p>
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
          <div className="rounded-xl border border-primary/20 bg-teal-50 p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-primary">Ovitrampa {selectedTrap.code}</p>
                <p className="mt-1 text-ink">
                  {[selectedTrap.street, selectedTrap.number].filter(Boolean).join(', ') || 'Endereço não informado'}
                </p>
                <p className="text-muted">
                  Bairro: {selectedBairro || '—'}
                  {selectedDistrito ? ` · Distrito: ${selectedDistrito}` : ''}
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

      <Field label="Data da Ação">
        <Input type="date" required value={actionDate} onChange={(event) => setActionDate(event.target.value)} />
      </Field>

      <Field label="Ação Tomada">
        <Textarea
          required
          value={actionTaken}
          placeholder="Ex: Palestra na escola, Panfletagem, Orientação domiciliar"
          onChange={(event) => setActionTaken(event.target.value)}
        />
      </Field>

      <Card className="space-y-3">
        <div>
          <p className="font-semibold">Fotos da ação</p>
          <p className="text-xs text-muted">Opcional · até {MAX_PHOTOS} fotos · compactadas automaticamente</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={compressing || photos.length >= MAX_PHOTOS}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="size-4" />
            Tirar Foto (Câmera)
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={compressing || photos.length >= MAX_PHOTOS}
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            Escolher da Galeria
          </Button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void addFiles(event.target.files)}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => void addFiles(event.target.files)}
        />
        {compressing ? <p className="text-xs text-muted">Compactando foto...</p> : null}
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                <img src={photo.previewUrl} alt="Pré-visualização" className="size-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-ink/70 p-1 text-white"
                  aria-label="Remover foto"
                  onClick={() => removePhoto(photo.id)}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Nenhuma foto anexada.</p>
        )}
      </Card>

      <Button type="submit" className="w-full" size="lg" disabled={saving || compressing || !selectedTrap}>
        {saving ? 'Salvando...' : 'Salvar ação educativa'}
      </Button>

      <p className={cn('flex items-center gap-2 text-xs text-muted')}>
        <Megaphone className="size-3.5" />
        O registro fica no aparelho e sobe na sincronização quando houver internet.
      </p>
    </form>
  )
}
