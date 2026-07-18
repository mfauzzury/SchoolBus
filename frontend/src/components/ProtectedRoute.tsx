import { Navigate, Outlet } from 'react-router-dom'
import { useMe } from '@/hooks/useAuth'

export function ProtectedRoute({ role }: { role?: 'operator' | 'parent' }) {
  const { data, isLoading, isError } = useMe()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>
  }

  if (isError || !data) {
    return <Navigate to="/login" replace />
  }

  const isParent = data.roles.includes('parent')

  if (role === 'parent' && !isParent) {
    return <Navigate to="/operator/dashboard" replace />
  }

  if (role === 'operator' && isParent) {
    return <Navigate to="/parent/dashboard" replace />
  }

  return <Outlet />
}
