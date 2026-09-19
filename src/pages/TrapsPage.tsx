import { liveQuery } from 'dexie'
import { MapPin, Pencil, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { neighborhoodLabelById } from '@/constants/bairros'
import { db } from '@/lib/db'
import { useNeighborhoods } from '@/hooks/useNeighborhoods'
import type { Trap } from '@/types/domain'

export function TrapsPage() {
  const [traps, setTraps] = useState<Trap[]>([])
  const neighborhoods = useNeighborhoods()
  const [query, setQuery] = useState('')

  useEffect(() => {
    const sub = liveQuery(() => db.traps.orderBy('code').toArray()).subscribe(setTraps)
    return () => sub.unsubscribe()
  }, [])

  const neighborhoodName = (id: number | null) => neighborhoodLabelById(neighborhoods, id)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const visible = traps.filter((item) => !item.deletedAt)
    if (!term) return visible
    return visible.filter((item) => {
      const haystack = `${item.code} ${item.street ?? ''} ${item.district ?? ''} ${neighborhoodName(item.neighborhoodId)}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [traps, query, neighborhoods])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Ovitrampas cadastradas</h1>
        <p className="text-sm text-muted">Cadastro, edição e exclusão das armadilhas de campo.</p>
      </div>
      <Input value={query} placeholder="Buscar por número, rua ou bairro" onChange={(event) => setQuery(event.target.value)} />
      {filtered.length === 0 ? (
        <Card className="text-sm text-muted">Nenhuma ovitrampa cadastrada neste aparelho.</Card>
      ) : (
        filtered.map((trap) => (
          <Link key={trap.id} to={`/ovitrampas/${encodeURIComponent(trap.code)}`} className="block">
            <Card className="flex items-center justify-between gap-3 border-l-4 border-l-primary">
              <div>
                <p className="text-lg font-semibold">Ovitrampa {trap.code}</p>
                <p className="text-sm text-muted">
                  {neighborhoodName(trap.neighborhoodId)}
                  {trap.street ? ` · ${trap.street}` : ''}
                  {trap.number ? `, ${trap.number}` : ''}
                </p>
              </div>
              <Pencil className="size-4 text-muted" />
            </Card>
          </Link>
        ))
      )}
      <div className="h-16" />
      <div className="fixed inset-x-0 bottom-20 z-10 mx-auto w-full max-w-lg px-4">
        <Link to="/ovitrampas/nova">
          <Button className="w-full" size="lg">
            <Plus className="size-5" />
            Cadastrar nova ovitrampa
          </Button>
        </Link>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted">
        <MapPin className="size-3.5" />
        Use o mapa para ver as armadilhas com GPS.
      </p>
    </div>
  )
}
