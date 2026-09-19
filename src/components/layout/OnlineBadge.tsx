import { Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OnlineBadge() {
  const online = useOnlineStatus()

  return (
    <Badge
      className={
        online
          ? 'bg-emerald-100 text-ok'
          : 'bg-amber-100 text-warn'
      }
    >
      {online ? <Wifi className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />}
      {online ? 'Online' : 'Offline'}
    </Badge>
  )
}
