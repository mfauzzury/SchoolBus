import { Navigate, Outlet } from 'react-router-dom'
import { useMe } from '@/hooks/useAuth'
import { isPlatformUser } from '@/lib/platform'

export function ProtectedRoute({ role }: { role?: 'operator' | 'parent' | 'platform' }) {
  const { data, isLoading, isError } = useMe()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>
  }

  if (isError || !data) {
    return <Navigate to="/login" replace />
  }

  const isParent = data.roles.includes('parent')
  const isPlatform = isPlatformUser(data.roles)
  const homePath = isPlatform ? '/admin/dashboard' : isParent ? '/parent/dashboard' : '/operator/dashboard'

  if (role === 'platform' && !isPlatform) {
    return <Navigate to={homePath} replace />
  }

  if (role === 'parent' && !isParent) {
    return <Navigate to={homePath} replace />
  }

  if (role === 'operator' && (isParent || isPlatform)) {
    return <Navigate to={homePath} replace />
  }

  return <Outlet />
}
