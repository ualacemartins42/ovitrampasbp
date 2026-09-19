import { CloudUpload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { useSyncQueue } from '@/hooks/useSyncQueue'

export function SyncQueueIndicator() {
  const { pending } = useSyncQueue()

  if (pending === 0) {
    return (
      <Badge className="bg-teal-50 text-primary">
        Fila vazia
      </Badge>
    )
  }

  return (
    <Link to="/sincronizar" className="no-underline">
      <Badge className="bg-amber-100 text-warn">
        <CloudUpload className="size-3.5" aria-hidden />
        {pending} na fila
      </Badge>
    </Link>
  )
}
