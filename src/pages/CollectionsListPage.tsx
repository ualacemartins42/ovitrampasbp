import { liveQuery } from 'dexie'
import { Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { canDeleteCollection, deleteCollection } from '@/features/collections/repository'
import { COLLECTION_KIND_LABELS, TRAP_STATUS_LABELS } from '@/lib/constants'
import { neighborhoodLabelById } from '@/constants/bairros'
import { db } from '@/lib/db'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { formatDateTime } from '@/lib/utils'
import type { CollectionRecord, LocalSyncStatus } from '@/types/domain'

export function CollectionsListPage() {
  const { profile, isAdmin } = useAuth()
  const [items, setItems] = useState<CollectionRecord[]>([])
  const [status, setStatus] = useState<'all' | LocalSyncStatus>('all')
  const [selected, setSelected] = useState<CollectionRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const neighborhoods = useNeighborhoods()

  useEffect(() => {
    const query = liveQuery(async () => {
      const all = await db.collections.orderBy('occurredAt').reverse().toArray()
      if (profile?.role === 'ace') {
        return all.filter((item) => item.agentId === profile.id)
      }
      return all
    })
    const sub = query.subscribe(setItems)
    return () => sub.unsubscribe()
  }, [profile])

  const filtered = useMemo(
    () => (status === 'all' ? items : items.filter((item) => item.syncStatus === status)),
    [items, status],
  )

  async function handleDelete() {
    if (!selected || !profile) return
    setSubmitting(true)
    try {
      await deleteCollection(selected, profile, isAdmin)
      toast.success('Coleta excluída.')
      setSelected(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir a coleta.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Coletas</h1>
        <p className="text-sm text-muted">Registros salvos neste aparelho, enviados ou pendentes.</p>
      </div>
      <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
        <option value="all">Todas</option>
        <option value="pending">Pendentes de envio</option>
        <option value="synced">Sincronizadas</option>
        <option value="error">Com erro</option>
      </Select>
      {filtered.length === 0 ? (
        <Card className="text-sm text-muted">Nenhum registro encontrado.</Card>
      ) : (
        filtered.map((item) => {
          const showDelete = canDeleteCollection(item, profile, isAdmin)
          return (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.trapCode}</p>
                  <p className="text-sm text-muted">
                    {COLLECTION_KIND_LABELS[item.kind]} · {TRAP_STATUS_LABELS[item.trapStatus]}
                  </p>
                  <p className="text-sm text-muted">{neighborhoodLabelById(neighborhoods, item.neighborhoodId)}</p>
                  <p className="text-sm text-muted">{formatDateTime(item.occurredAt)}</p>
                  {item.paddleCode ? <p className="text-sm">Palheta {item.paddleCode}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs font-semibold text-primary">
                    {item.syncStatus === 'synced' ? 'Enviado' : item.syncStatus === 'error' ? 'Erro' : 'Local'}
                  </span>
                  {showDelete ? (
                    <button
                      type="button"
                      className="rounded-lg p-1 text-red-600 hover:bg-red-50 hover:text-red-800"
                      aria-label={`Excluir coleta ${item.trapCode}`}
                      onClick={() => setSelected(item)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </Card>
          )
        })
      )}
      <Link to="/coletas/nova" className="block text-center text-sm font-semibold text-primary">
        Lançar nova coleta
      </Link>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={() => (submitting ? null : setSelected(null))}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-ink">Excluir coleta</h2>
            <p className="mt-2 text-sm text-muted">
              Tem certeza que deseja excluir esta coleta (Armadilha #{selected.trapCode} -{' '}
              {COLLECTION_KIND_LABELS[selected.kind]})? Esta ação não poderá ser desfeita.
            </p>
            <div className="mt-5 space-y-2">
              <Button className="w-full" variant="danger" disabled={submitting} onClick={() => void handleDelete()}>
                {submitting ? 'Excluindo...' : 'Excluir coleta'}
              </Button>
              <Button className="w-full" variant="ghost" disabled={submitting} onClick={() => setSelected(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
