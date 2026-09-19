import { Navigate, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/features/auth/auth-context'

export function ProtectedLayout() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-surface text-sm text-muted">
        Carregando aplicativo...
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppShell />
  )
}

export function StaffOutlet() {
  const { profile } = useAuth()
  if (profile?.role === 'ace') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

export function AdminOutlet() {
  const { isAdmin } = useAuth()
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
