import { liveQuery } from 'dexie'
import { Camera, ClipboardPlus, CloudUpload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { COLLECTION_KIND_LABELS, ROLE_LABELS } from '@/lib/constants'
import { db } from '@/lib/db'
import { formatDateTime, isSameLocalDay } from '@/lib/utils'
import type { CollectionRecord } from '@/types/domain'

export function HomePage() {
  const { profile } = useAuth()
  const { pending } = useSyncQueue()
  const [collections, setCollections] = useState<CollectionRecord[]>([])

  useEffect(() => {
    if (!profile) return
    const sub = liveQuery(() =>
      db.collections.where('agentId').equals(profile.id).reverse().sortBy('occurredAt'),
    ).subscribe(setCollections)
    return () => sub.unsubscribe()
  }, [profile])

  const today = collections.filter((item) => isSameLocalDay(item.occurredAt))

  return (
    <div className="space-y-4">
      <section>
        <p className="text-sm text-muted">{ROLE_LABELS[profile?.role ?? 'ace']}</p>
        <h1 className="text-xl font-semibold">Olá, {profile?.fullName?.split(' ')[0] ?? 'agente'}</h1>
        <p className="text-sm text-muted">
          {profile?.zone ?? 'Zona não informada'}
          {profile?.registrationNumber ? ` · Matrícula ${profile.registrationNumber}` : ''}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-muted">Coletas de hoje</p>
          <p className="mt-1 text-3xl font-semibold text-primary">{today.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Aguardando envio</p>
          <p className="mt-1 text-3xl font-semibold text-warn">{pending}</p>
        </Card>
      </div>

      <Link to="/coletas/nova" className="block">
        <Button className="h-14 w-full text-base" size="lg">
          <ClipboardPlus className="size-5" />
          Nova coleta / vistoria
        </Button>
      </Link>

      {pending > 0 ? (
        <Link to="/sincronizar" className="block">
          <Card className="flex items-center gap-3 border-amber-200 bg-amber-50">
            <CloudUpload className="size-5 text-warn" />
            <div>
              <p className="font-semibold text-ink">
                {pending} {pending === 1 ? 'coleta aguardando sincronização' : 'coletas aguardando sincronização'}
              </p>
              <p className="text-sm text-muted">Os dados já estão salvos neste aparelho.</p>
            </div>
          </Card>
        </Link>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Últimos registros</h2>
          <Link to="/coletas" className="text-sm font-medium text-primary">
            Ver todas
          </Link>
        </div>
        {today.length === 0 ? (
          <Card className="text-sm text-muted">Nenhuma coleta lançada hoje.</Card>
        ) : (
          today.slice(0, 5).map((item) => (
            <Card key={item.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{item.trapCode}</p>
                <p className="text-sm text-muted">
                  {COLLECTION_KIND_LABELS[item.kind]} · {formatDateTime(item.occurredAt)}
                </p>
              </div>
              <span className="text-xs font-semibold text-primary">
                {item.syncStatus === 'synced' ? 'Enviado' : 'Local'}
              </span>
            </Card>
          ))
        )}
      </section>

      <Card className="flex items-center gap-3 text-sm text-muted">
        <Camera className="size-4" />
        GPS e câmera funcionam offline se o aparelho tiver satélite e permissão.
      </Card>
    </div>
  )
}
