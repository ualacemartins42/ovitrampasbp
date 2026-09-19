import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { db } from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import type { SyncQueueItem } from '@/types/domain'

const TYPE_LABELS: Record<SyncQueueItem['type'], string> = {
  collection: 'Coleta',
  photo: 'Foto',
  lab_result: 'Laudo',
  profile: 'Perfil',
  trap: 'Ovitrampa',
  cycle: 'Ciclo',
}

export function SyncPage() {
  const { configured, isDemo } = useAuth()
  const { pending, syncing, synchronize, online } = useSyncQueue()
  const [items, setItems] = useState<SyncQueueItem[]>([])

  useEffect(() => {
    const sub = liveQuery(() => db.syncQueue.orderBy('createdAt').toArray()).subscribe(setItems)
    return () => sub.unsubscribe()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Sincronização</h1>
        <p className="text-sm text-muted">
          A fila envia automaticamente ao reconectar. Você também pode disparar o envio agora.
        </p>
      </div>

      <Card>
        <p className="text-sm text-muted">Registros pendentes</p>
        <p className="text-3xl font-semibold text-primary">{pending}</p>
        <p className="mt-1 text-sm text-muted">
          {online ? 'Conexão disponível.' : 'Sem internet — os dados permanecem no IndexedDB.'}
        </p>
      </Card>

      <Button
        className="w-full"
        size="lg"
        disabled={syncing || !online}
        onClick={() => {
          if (!configured || isDemo) {
            toast.message('Configure o Supabase para enviar os dados oficiais.')
            return
          }
          void synchronize()
        }}
      >
        {syncing ? 'Sincronizando...' : 'Sincronizar dados'}
      </Button>

      {items.length === 0 ? (
        <Card className="text-sm text-muted">Nenhum item na fila.</Card>
      ) : (
        items.map((item) => (
          <Card key={item.id} className="text-sm">
            <p className="font-semibold">
              {TYPE_LABELS[item.type]} · {item.status}
            </p>
            <p className="text-muted">{formatDateTime(item.createdAt)}</p>
            {item.lastError ? <p className="text-danger">{item.lastError}</p> : null}
          </Card>
        ))
      )}
    </div>
  )
}
