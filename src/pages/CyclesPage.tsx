import { liveQuery } from 'dexie'
import { Box, ChevronRight, FileBarChart, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { neighborhoodLabelById } from '@/constants/bairros'
import { CYCLE_STATUS_ACTION } from '@/lib/constants'
import { db } from '@/lib/db'
import { foldSearchText } from '@/lib/utils'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import type { CycleRecord, Trap } from '@/types/domain'

export function CyclesPage() {
  const [cycles, setCycles] = useState<CycleRecord[]>([])
  const [traps, setTraps] = useState<Trap[]>([])
  const [query, setQuery] = useState('')
  const neighborhoods = useNeighborhoods()

  useEffect(() => {
    const cyclesSub = liveQuery(() => db.cycles.orderBy('createdAt').reverse().toArray()).subscribe(setCycles)
    const trapsSub = liveQuery(() => db.traps.toArray()).subscribe(setTraps)
    return () => {
      cyclesSub.unsubscribe()
      trapsSub.unsubscribe()
    }
  }, [])

  const trapsByCode = useMemo(() => {
    const map = new Map<string, Trap>()
    for (const trap of traps) {
      if (!trap.deletedAt) map.set(trap.code, trap)
    }
    return map
  }, [traps])

  const active = useMemo(() => cycles.filter((item) => item.status !== 'finalizada'), [cycles])

  const filtered = useMemo(() => {
    const term = foldSearchText(query)
    if (!term) return active
    return active.filter((cycle) => {
      const trap = trapsByCode.get(cycle.trapCode)
      const neighborhood =
        cycle.neighborhoodName ??
        (trap ? neighborhoodLabelById(neighborhoods, trap.neighborhoodId, '') : '')
      const haystack = foldSearchText(
        [
          cycle.trapCode,
          `#${cycle.trapCode}`,
          trap?.street ?? '',
          trap?.number ?? '',
          trap?.district ?? '',
          neighborhood,
        ].join(' '),
      )
      return haystack.includes(term)
    })
  }, [active, query, trapsByCode, neighborhoods])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Ciclos em andamento</h1>
        <p className="text-sm text-muted">Instalação, troca de palheta e retirada da mesma armadilha.</p>
        <Link to="/relatorios" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          <FileBarChart className="size-3.5" />
          Ver ciclos concluídos
        </Link>
      </div>
      <Input
        value={query}
        placeholder="Buscar por número, rua ou bairro"
        onChange={(event) => setQuery(event.target.value)}
      />
      {active.length === 0 ? (
        <Card className="text-sm text-muted">Nenhum ciclo aberto. Inicie uma nova instalação.</Card>
      ) : filtered.length === 0 ? (
        <Card className="text-sm text-muted">Nenhum ciclo em andamento encontrado para esta busca.</Card>
      ) : (
        filtered.map((cycle) => {
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
