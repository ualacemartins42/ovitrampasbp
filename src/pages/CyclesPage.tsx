import { liveQuery } from 'dexie'
import { Box, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CYCLE_STATUS_ACTION } from '@/lib/constants'
import { db } from '@/lib/db'
import type { CycleRecord } from '@/types/domain'

export function CyclesPage() {
  const [cycles, setCycles] = useState<CycleRecord[]>([])

  useEffect(() => {
    const sub = liveQuery(() => db.cycles.orderBy('createdAt').reverse().toArray()).subscribe(setCycles)
    return () => sub.unsubscribe()
  }, [])

  const active = useMemo(() => cycles.filter((item) => item.status !== 'finalizada'), [cycles])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Ciclos em andamento</h1>
        <p className="text-sm text-muted">Instalação, troca de palheta e retirada da mesma armadilha.</p>
      </div>
      {active.length === 0 ? (
        <Card className="text-sm text-muted">Nenhum ciclo aberto. Inicie uma nova instalação.</Card>
      ) : (
        active.map((cycle) => {
          const waitingSwap = cycle.status === 'instalada'
          return (
            <Link key={cycle.id} to={`/ciclos/${cycle.id}`} className="block">
              <Card
                className={`flex items-center justify-between gap-3 border-l-4 ${
                  waitingSwap ? 'border-l-blue-500' : 'border-l-orange-500'
                }`}
              >
                <div>
                  <p className="font-semibold">Armadilha #{cycle.trapCode}</p>
                  {cycle.neighborhoodName ? <p className="text-xs text-muted">{cycle.neighborhoodName}</p> : null}
                  <p className="flex items-center gap-1 text-xs text-muted">
                    {waitingSwap ? <RefreshCw className="size-3.5 text-blue-600" /> : <Box className="size-3.5 text-orange-600" />}
                    {CYCLE_STATUS_ACTION[waitingSwap ? 'instalada' : 'trocada']}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted" />
              </Card>
            </Link>
          )
        })
      )}
      <div className="h-16" />
      <div className="fixed inset-x-0 bottom-20 z-10 mx-auto w-full max-w-lg px-4">
        <Link to="/ciclos/novo">
          <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
            <Plus className="size-5" />
            Nova instalação
          </Button>
        </Link>
      </div>
    </div>
  )
}
