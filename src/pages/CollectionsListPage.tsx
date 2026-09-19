import { liveQuery } from 'dexie'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { COLLECTION_KIND_LABELS, TRAP_STATUS_LABELS } from '@/lib/constants'
import { neighborhoodLabelById } from '@/constants/bairros'
import { db } from '@/lib/db'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import { formatDateTime } from '@/lib/utils'
import type { CollectionRecord, LocalSyncStatus } from '@/types/domain'

export function CollectionsListPage() {
  const { profile } = useAuth()
  const [items, setItems] = useState<CollectionRecord[]>([])
  const [status, setStatus] = useState<'all' | LocalSyncStatus>('all')
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
        filtered.map((item) => (
          <Card key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{item.trapCode}</p>
                <p className="text-sm text-muted">
                  {COLLECTION_KIND_LABELS[item.kind]} · {TRAP_STATUS_LABELS[item.trapStatus]}
                </p>
                <p className="text-sm text-muted">{neighborhoodLabelById(neighborhoods, item.neighborhoodId)}</p>
                <p className="text-sm text-muted">{formatDateTime(item.occurredAt)}</p>
                {item.paddleCode ? (
                  <p className="text-sm">Palheta {item.paddleCode}</p>
                ) : null}
              </div>
              <span className="text-xs font-semibold text-primary">
                {item.syncStatus === 'synced' ? 'Enviado' : item.syncStatus === 'error' ? 'Erro' : 'Local'}
              </span>
            </div>
          </Card>
        ))
      )}
      <Link to="/coletas/nova" className="block text-center text-sm font-semibold text-primary">
        Lançar nova coleta
      </Link>
    </div>
  )
}
