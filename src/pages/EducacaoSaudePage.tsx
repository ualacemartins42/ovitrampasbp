import { liveQuery } from 'dexie'
import { Camera, ImageOff, ImagePlus, Megaphone, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { EducacaoRegistroCard } from '@/components/educacao/EducacaoRegistroCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { districtGroupLabel, neighborhoodLabelById } from '@/constants/bairros'
import { useLayoutMode } from '@/context/LayoutContext'
import { useAuth } from '@/features/auth/auth-context'
import {
  canAddEducacaoPhotos,
  canManageEducacao,
  deleteEducacaoSaude,
  educacaoPhotoRefs,
  MAX_EDUCACAO_PHOTOS,
  saveEducacaoSaude,
  updateEducacaoSaude,
} from '@/features/educacao/repository'
import { compressImageFile } from '@/lib/imageCompression'
import { db } from '@/lib/db'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { cn, foldSearchText, toDateInputValue } from '@/lib/utils'
import {
  listEducacaoReports,
  resolveEducacaoPhotos,
  type EducacaoReportRow,
} from '@/services/educacaoService'
import type { Trap } from '@/types/domain'
import type { EducacaoPhotoRef, EducacaoSaudeRecord } from '@/types/educacao'

interface PhotoDraft {
  id: string
  blob: Blob
  previewUrl: string
}

export function EducacaoSaudePage() {
  const { profile } = useAuth()
  const { isDesktop } = useLayoutMode()
  const neighborhoods = useNeighborhoods(true)
  const formTopRef = useRef<HTMLDivElement>(null)
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

  const [editing, setEditing] = useState<EducacaoSaudeRecord | null>(null)
  const [keptPhotos, setKeptPhotos] = useState<EducacaoPhotoRef[]>([])
  const [keptUrls, setKeptUrls] = useState<Map<string, string | null>>(new Map())

  const [records, setRecords] = useState<EducacaoReportRow[]>([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [historyQuery, setHistoryQuery] = useState('')

  useEffect(() => {
    const sub = liveQuery(() => db.traps.orderBy('code').toArray()).subscribe(setTraps)
    return () => sub.unsubscribe()
  }, [])

  useEffect(() => {
    const sub = liveQuery(() => listEducacaoReports(profile)).subscribe({
      next: (items) => {
        setRecords(items)
        setLoadingRecords(false)
      },
      error: () => {
        toast.error('Não foi possível carregar as ações registradas.')
        setLoadingRecords(false)
      },
    })
    return () => sub.unsubscribe()
  }, [profile])

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl)
    }
  }, [])

  useEffect(() => {
    if (!editing) {
      setKeptUrls(new Map())
      return
    }
    let cancelled = false
    let created: string[] = []
    void resolveEducacaoPhotos(educacaoPhotoRefs(editing)).then((items) => {
      created = items.filter((item) => item.local && item.url).map((item) => item.url!)
      if (cancelled) {
        for (const url of created) URL.revokeObjectURL(url)
        return
      }
      setKeptUrls(new Map(items.map((item) => [item.key, item.url])))
    })
    return () => {
      cancelled = true
      for (const url of created) URL.revokeObjectURL(url)
    }
  }, [editing])

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

  const visibleRecords = useMemo(() => {
    const term = foldSearchText(historyQuery)
    if (!term) return records
    return records.filter((row) =>
      foldSearchText(
        `${row.record.trapCode} ${row.address} ${row.neighborhood} ${row.agentName} ${row.record.observation ?? ''}`,
      ).includes(term),
    )
  }, [records, historyQuery])

  const selectedNeighborhood = selectedTrap
    ? neighborhoods.find((item) => item.id === selectedTrap.neighborhoodId)
    : undefined
  const selectedBairro = selectedTrap ? neighborhoodName(selectedTrap.neighborhoodId) : ''
  const selectedDistrito = selectedTrap
    ? selectedTrap.district || (selectedNeighborhood ? districtGroupLabel(selectedNeighborhood.zone) : '')
    : ''

  const photoSlotsLeft = MAX_EDUCACAO_PHOTOS - keptPhotos.length - photos.length
  const canAddPhotos = canAddEducacaoPhotos(profile, editing)

  function clearDraftPhotos() {
    for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl)
    setPhotos([])
  }

  function resetForm() {
    setEditing(null)
    setKeptPhotos([])
    setSelectedTrap(null)
    setQuery('')
    setActionDate(toDateInputValue(new Date()))
    setActionTaken('')
    clearDraftPhotos()
  }

  function startEdit(row: EducacaoReportRow) {
    const trap = row.trap && !row.trap.deletedAt ? row.trap : null
    if (!trap) {
      toast.error('A ovitrampa deste registro não está disponível neste aparelho.')
      return
    }
    clearDraftPhotos()
    setEditing(row.record)
    setKeptPhotos(row.photos)
    setSelectedTrap(trap)
    setQuery(trap.code)
    setActionDate(row.record.analysisDate.slice(0, 10))
    setActionTaken(row.record.observation ?? '')
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function onDelete(row: EducacaoReportRow) {
    if (!profile) return
    if (!window.confirm(`Excluir a ação da ovitrampa ${row.record.trapCode}?`)) return
    try {
      await deleteEducacaoSaude(profile, row.record)
      if (editing?.id === row.record.id) resetForm()
      toast.success('Ação excluída.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir.')
    }
  }

  async function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    if (photoSlotsLeft <= 0) {
      toast.message(`Limite de ${MAX_EDUCACAO_PHOTOS} fotos atingido.`)
      return
    }

    const files = Array.from(fileList).slice(0, photoSlotsLeft)
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
    const address = {
      street: selectedTrap.street,
      number: selectedTrap.number,
      neighborhoodName: selectedBairro || null,
      district: selectedDistrito || null,
    }
    setSaving(true)
    try {
      if (editing) {
        await updateEducacaoSaude(profile, editing, {
          trap: selectedTrap,
          actionDate,
          actionTaken,
          address,
          keptPhotos,
          newPhotos: photos.map((item) => item.blob),
        })
        toast.success('Ação atualizada neste aparelho.')
      } else {
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
          address,
        )
        toast.success('Ação educativa salva neste aparelho.')
      }
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <div ref={formTopRef} className="scroll-mt-20">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Campo</p>
          <h1 className="text-xl font-semibold">Educação em Saúde</h1>
          <p className="text-sm text-muted">Registrar ações educativas e conscientização junto às ovitrampas.</p>
        </div>

        {editing ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span>Editando ação da ovitrampa {editing.trapCode}</span>
            <Button size="sm" variant="ghost" onClick={resetForm}>
              Cancelar edição
            </Button>
          </div>
        ) : null}

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
            <p className="text-xs text-muted">
              Opcional · até {MAX_EDUCACAO_PHOTOS} fotos · compactadas automaticamente
            </p>
          </div>
          {canAddPhotos ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={compressing || photoSlotsLeft <= 0}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="size-4" />
                Tirar Foto (Câmera)
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={compressing || photoSlotsLeft <= 0}
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImagePlus className="size-4" />
                Escolher da Galeria
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Só o agente que registrou a ação pode anexar novas fotos. Você ainda pode remover as existentes.
            </p>
          )}
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
          {keptPhotos.length + photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {keptPhotos.map((ref) => {
                const url = keptUrls.get(ref.key)
                return (
                  <div key={ref.key} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                    {url ? (
                      <img src={url} alt="Foto já registrada" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-surface text-muted">
                        <ImageOff className="size-5" />
                      </div>
                    )}
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-ink/70 p-1 text-white"
                      aria-label="Remover foto"
                      onClick={() => setKeptPhotos((current) => current.filter((item) => item.key !== ref.key))}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )
              })}
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

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" size="lg" disabled={saving || compressing || !selectedTrap}>
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar ação educativa'}
          </Button>
          {editing ? (
            <Button size="lg" variant="secondary" disabled={saving} onClick={resetForm}>
              Cancelar
            </Button>
          ) : null}
        </div>

        <p className={cn('flex items-center gap-2 text-xs text-muted')}>
          <Megaphone className="size-3.5" />
          O registro fica no aparelho e sobe na sincronização quando houver internet.
        </p>
      </form>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2 border-t border-line pt-4">
          <div>
            <h2 className="text-lg font-semibold">Ações Registradas</h2>
            <p className="text-xs text-muted">{records.length} ação(ões) neste aparelho</p>
          </div>
        </div>

        {records.length > 0 ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              value={historyQuery}
              placeholder="Filtrar por ovitrampa, rua, bairro ou ação"
              onChange={(event) => setHistoryQuery(event.target.value)}
            />
          </div>
        ) : null}

        {loadingRecords ? (
          <Card className="text-sm text-muted">Carregando ações...</Card>
        ) : visibleRecords.length === 0 ? (
          <Card className="text-sm text-muted">
            {records.length === 0 ? 'Nenhuma ação educativa registrada ainda.' : 'Nenhuma ação encontrada no filtro.'}
          </Card>
        ) : (
          <div className={cn(isDesktop ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3')}>
            {visibleRecords.map((row) => (
              <EducacaoRegistroCard
                key={row.record.id}
                row={row}
                canManage={canManageEducacao(profile, row.record)}
                onEdit={startEdit}
                onDelete={(item) => void onDelete(item)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
