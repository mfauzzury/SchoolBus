import { Navigate, Outlet } from 'react-router-dom'
import { useMe } from '@/hooks/useAuth'

export function ProtectedRoute({ role }: { role?: 'operator' | 'parent' | 'saas_admin' }) {
  const { data, isLoading, isError } = useMe()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>
  }

  if (isError || !data) {
    return <Navigate to="/login" replace />
  }

  const isParent = data.roles.includes('parent')
  const isSaasAdmin = data.roles.includes('saas_admin')
  const homePath = isSaasAdmin ? '/admin/dashboard' : isParent ? '/parent/dashboard' : '/operator/dashboard'

  if (role === 'saas_admin' && !isSaasAdmin) {
    return <Navigate to={homePath} replace />
  }

  if (role === 'parent' && !isParent) {
    return <Navigate to={homePath} replace />
  }

  if (role === 'operator' && (isParent || isSaasAdmin)) {
    return <Navigate to={homePath} replace />
  }

  return <Outlet />
}
