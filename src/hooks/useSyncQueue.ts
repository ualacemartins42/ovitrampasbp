import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-context'
import { db } from '@/lib/db'
import { processSyncQueue, syncAll } from '@/lib/sync'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function useSyncQueue() {
  const { profile, isDemo, configured } = useAuth()
  const online = useOnlineStatus()
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.syncQueue.filter((item) => item.status !== 'processing').count(),
    ).subscribe({
      next: setPending,
      error: () => setPending(0),
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!online || !configured || isDemo || !profile || pending === 0) return
    const timer = window.setTimeout(() => {
      void processSyncQueue()
    }, 800)
    return () => window.clearTimeout(timer)
  }, [online, configured, isDemo, profile, pending])

  async function synchronize() {
    if (!profile) return
    if (!configured || isDemo) {
      toast.message('Sincronização indisponível no modo demonstração.')
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
      } else if (result.processed === 0) {
        toast.success('Tudo já estava sincronizado.')
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

  return { pending, syncing, lastError, synchronize, online }
}
