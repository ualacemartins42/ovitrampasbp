import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import { BARRA_DO_PIRAI_BAIRROS } from '@/constants/bairros'
import { db } from '@/lib/db'
import type { Neighborhood } from '@/types/domain'

export function useNeighborhoods(includeInactive = false): Neighborhood[] {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>(BARRA_DO_PIRAI_BAIRROS)

  useEffect(() => {
    const sub = liveQuery(() => db.neighborhoods.toArray()).subscribe((rows) => {
      if (rows.length > 0) setNeighborhoods(rows)
    })
    return () => sub.unsubscribe()
  }, [])

  if (includeInactive) return neighborhoods
  return neighborhoods.filter((item) => item.active !== false)
}
