import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-context'
import { db } from '@/lib/db'
import { syncAll } from '@/lib/sync'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function useSyncQueue() {
  const { profile, isDemo, configured } = useAuth()
  const online = useOnlineStatus()
  const [pending, setPending] = useState(0)
  const [pendingCollections, setPendingCollections] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    const queueSub = liveQuery(() => db.syncQueue.count()).subscribe({
      next: setPending,
      error: () => setPending(0),
    })
    return () => queueSub.unsubscribe()
  }, [])

  useEffect(() => {
    if (!profile) {
      setPendingCollections(0)
      return
    }
    const agentId = profile.id
    const collectionsSub = liveQuery(() =>
      db.collections.filter((item) => item.agentId === agentId && item.syncStatus !== 'synced').count(),
    ).subscribe({
      next: setPendingCollections,
      error: () => setPendingCollections(0),
    })
    return () => collectionsSub.unsubscribe()
  }, [profile])

  async function synchronize() {
    if (!profile) return
    if (!configured || isDemo) {
      toast.message('Sincronização indisponível no Modo Offline.')
      return
    }
    if (!online) {
      toast.error('Sem conexão. Os dados continuam salvos neste aparelho.')
      return
    }
    setSyncing(true)
    try {
      const result = await syncAll(profile)
      setLastError(null)
      if (result.failed > 0) {
        toast.error(`${result.failed} registro(s) falharam. Tente novamente.`)
      } else if (result.processed === 0 && pending === 0) {
        toast.success('Tudo já estava sincronizado.')
      } else if (result.processed === 0) {
        toast.message('Nada novo para enviar agora.')
      } else {
        toast.success(`${result.processed} registro(s) enviados ao servidor.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha na sincronização'
      setLastError(message)
      toast.error(message)
    } finally {
      setSyncing(false)
    }
  }

  return { pending, pendingCollections, syncing, lastError, synchronize, online }
}
