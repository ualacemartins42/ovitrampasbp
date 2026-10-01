import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { resolveEducacaoPhotos, type ResolvedPhoto } from '@/services/educacaoService'
import type { EducacaoPhotoRef } from '@/types/educacao'

interface EducacaoPhotoGalleryProps {
  photos: EducacaoPhotoRef[]
  className?: string
}

export function EducacaoPhotoGallery({ photos, className }: EducacaoPhotoGalleryProps) {
  const [resolved, setResolved] = useState<ResolvedPhoto[]>([])
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const photosKey = photos.map((item) => item.key).join('|')
  const photosRef = useRef(photos)
  photosRef.current = photos

  useEffect(() => {
    let cancelled = false
    let created: ResolvedPhoto[] = []
    void resolveEducacaoPhotos(photosRef.current).then((items) => {
      created = items
      if (cancelled) {
        for (const item of items) if (item.local && item.url) URL.revokeObjectURL(item.url)
        return
      }
      setResolved(items)
    })
    return () => {
      cancelled = true
      for (const item of created) if (item.local && item.url) URL.revokeObjectURL(item.url)
    }
  }, [photosKey])

  if (photos.length === 0) return null

  const viewable = resolved.filter((item) => item.url)
  const current = openIndex != null ? viewable[openIndex] : null

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {(resolved.length ? resolved : photos.map((item) => ({ key: item.key, url: null, local: false }))).map(
          (item) =>
            item.url ? (
              <button
                key={item.key}
                type="button"
                className="size-16 overflow-hidden rounded-lg border border-line"
                aria-label="Abrir foto em tela cheia"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenIndex(viewable.findIndex((photo) => photo.key === item.key))
                }}
              >
                <img src={item.url} alt="Foto da ação" className="size-full object-cover" loading="lazy" />
              </button>
            ) : (
              <div
                key={item.key}
                className="flex size-16 items-center justify-center rounded-lg border border-dashed border-line bg-surface text-muted"
                title="Foto indisponível offline"
              >
                <ImageOff className="size-4" />
              </div>
            ),
        )}
      </div>

      {current ? (
        <PhotoViewer
          url={current.url!}
          index={openIndex!}
          total={viewable.length}
          onClose={() => setOpenIndex(null)}
          onNavigate={(next) => setOpenIndex((next + viewable.length) % viewable.length)}
        />
      ) : null}
    </>
  )
}

function PhotoViewer({
  url,
  index,
  total,
  onClose,
  onNavigate,
}: {
  url: string
  index: number
  total: number
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight' && total > 1) onNavigate(index + 1)
      if (event.key === 'ArrowLeft' && total > 1) onNavigate(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, total, onClose, onNavigate])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      onClick={(event) => {
        event.stopPropagation()
        onClose()
      }}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Fechar foto"
        onClick={onClose}
      >
        <X className="size-5" />
      </button>
      {total > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Foto anterior"
            onClick={(event) => {
              event.stopPropagation()
              onNavigate(index - 1)
            }}
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Próxima foto"
            onClick={(event) => {
              event.stopPropagation()
              onNavigate(index + 1)
            }}
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      ) : null}
      <img
        src={url}
        alt="Foto da ação em tela cheia"
        className="max-h-full max-w-full rounded-lg object-contain"
        onClick={(event) => event.stopPropagation()}
      />
      {total > 1 ? (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
          {index + 1} / {total}
        </p>
      ) : null}
    </div>
  )
}
