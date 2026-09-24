import {
  ClipboardList,
  FileBarChart,
  FlaskConical,
  Home,
  MapPinned,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
  UserRound,
  Users,
} from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { OnlineBadge } from '@/components/layout/OnlineBadge'
import { SyncQueueIndicator } from '@/components/layout/SyncQueueIndicator'
import { useLayoutMode } from '@/context/LayoutContext'
import { useAuth } from '@/features/auth/auth-context'
import { isStaffRole } from '@/lib/constants'
import { cn } from '@/lib/utils'

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-medium',
    isActive ? 'text-primary' : 'text-muted',
  )

const desktopNavClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap',
    isActive ? 'bg-teal-50 text-primary' : 'text-muted hover:bg-teal-50/70',
  )

export function AppShell() {
  const { profile, isAdmin } = useAuth()
  const { isDesktop, toggleLayoutMode } = useLayoutMode()
  const staff = isStaffRole(profile?.role)

  const fifthNav = isAdmin ? (
    <NavLink to="/admin/agentes" className={isDesktop ? desktopNavClass : mobileNavClass}>
      <Users className={isDesktop ? 'size-4' : 'size-5'} />
      Usuários
    </NavLink>
  ) : staff ? (
    <NavLink to="/laboratorio" className={isDesktop ? desktopNavClass : mobileNavClass}>
      <FlaskConical className={isDesktop ? 'size-4' : 'size-5'} />
      Lab
    </NavLink>
  ) : (
    <NavLink to="/sincronizar" className={isDesktop ? desktopNavClass : mobileNavClass}>
      <RefreshCw className={isDesktop ? 'size-4' : 'size-5'} />
      Sync
    </NavLink>
  )

  return (
    <div
      className={cn(
        'mx-auto flex min-h-svh flex-col bg-surface',
        isDesktop ? 'max-w-7xl' : 'max-w-lg',
      )}
    >
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLayoutMode}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-teal-50"
              title={isDesktop ? 'Alternar para modo compacto' : 'Alternar para modo desktop'}
              aria-label="Alternar visualização"
            >
              {isDesktop ? <Smartphone className="size-4 shrink-0" /> : <Monitor className="size-4 shrink-0" />}
              <span>{isDesktop ? 'Modo Compacto' : 'Modo Desktop'}</span>
            </button>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Link
              to="/relatorios"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-teal-50"
            >
              <FileBarChart className="size-3.5" />
              <span className="hidden md:inline">Relatórios</span>
            </Link>
            {isAdmin ? (
              <Link
                to="/admin/bairros"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-teal-50"
              >
                <MapPinned className="size-3.5" />
                <span className="hidden md:inline">Bairros</span>
              </Link>
            ) : null}
            <OnlineBadge />
            <SyncQueueIndicator />
          </div>
        </div>

        {isDesktop ? (
          <nav
            className="flex items-center gap-1 overflow-x-auto border-t border-line px-3 py-1.5"
            aria-label="Navegação principal"
          >
            <NavLink to="/" end className={desktopNavClass}>
              <Home className="size-4" />
              Início
            </NavLink>
            <NavLink to="/coletas" end className={desktopNavClass}>
              <ClipboardList className="size-4" />
              Coletas
            </NavLink>
            <NavLink to="/coletas/nova" className={desktopNavClass}>
              <Plus className="size-4" />
              Nova
            </NavLink>
            <NavLink to="/relatorios" className={desktopNavClass}>
              <FileBarChart className="size-4" />
              Relatórios
            </NavLink>
            {fifthNav}
            <NavLink to="/perfil" className={desktopNavClass}>
              <UserRound className="size-4" />
              Perfil
            </NavLink>
          </nav>
        ) : null}
      </header>

      <main className={cn('flex-1 px-4 pt-4', isDesktop ? 'pb-8' : 'pb-24')}>
        <Outlet />
      </main>

      {!isDesktop ? (
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="grid grid-cols-6 py-2">
            <NavLink to="/" end className={mobileNavClass}>
              <Home className="size-5" />
              Início
            </NavLink>
            <NavLink to="/coletas" end className={mobileNavClass}>
              <ClipboardList className="size-5" />
              Coletas
            </NavLink>
            <NavLink to="/coletas/nova" className={mobileNavClass}>
              <span className="flex size-10 -mt-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                <Plus className="size-5" />
              </span>
              Nova
            </NavLink>
            <NavLink to="/relatorios" className={mobileNavClass}>
              <FileBarChart className="size-5" />
              Relatórios
            </NavLink>
            {fifthNav}
            <NavLink to="/perfil" className={mobileNavClass}>
              <UserRound className="size-5" />
              Perfil
            </NavLink>
          </div>
        </nav>
      ) : null}
    </div>
  )
}
