import { ClipboardList, FlaskConical, Home, Plus, RefreshCw, UserRound, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { BrandMark } from '@/components/brand/BrandMark'
import { OnlineBadge } from '@/components/layout/OnlineBadge'
import { SyncQueueIndicator } from '@/components/layout/SyncQueueIndicator'
import { useAuth } from '@/features/auth/auth-context'
import { isStaffRole } from '@/lib/constants'
import { cn } from '@/lib/utils'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-medium',
    isActive ? 'text-primary' : 'text-muted',
  )

export function AppShell() {
  const { profile, isAdmin } = useAuth()
  const staff = isStaffRole(profile?.role)

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-surface">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark size="sm" className="mx-0 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">SMS · Ovitrampas</p>
              <p className="truncate text-sm text-muted">{profile?.fullName ?? 'Agente'}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <OnlineBadge />
            <SyncQueueIndicator />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="grid grid-cols-5 py-2">
          <NavLink to="/" end className={navClass}>
            <Home className="size-5" />
            Início
          </NavLink>
          <NavLink to="/coletas" end className={navClass}>
            <ClipboardList className="size-5" />
            Coletas
          </NavLink>
          <NavLink to="/coletas/nova" className={navClass}>
            <span className="flex size-10 -mt-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
              <Plus className="size-5" />
            </span>
            Nova
          </NavLink>
          {isAdmin ? (
            <NavLink to="/admin/agentes" className={navClass}>
              <Users className="size-5" />
              Usuários
            </NavLink>
          ) : staff ? (
            <NavLink to="/laboratorio" className={navClass}>
              <FlaskConical className="size-5" />
              Lab
            </NavLink>
          ) : (
            <NavLink to="/sincronizar" className={navClass}>
              <RefreshCw className="size-5" />
              Sync
            </NavLink>
          )}
          <NavLink to="/perfil" className={navClass}>
            <UserRound className="size-5" />
            Perfil
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
