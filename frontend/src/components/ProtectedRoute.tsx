import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useMe } from '@/hooks/useAuth'
import { loginPathFor } from '@/lib/nextPath'
import { isPlatformUser } from '@/lib/platform'
import { Suspended } from '@/pages/Suspended'

export function ProtectedRoute({ role }: { role?: 'operator' | 'parent' | 'platform' }) {
  const { data, isLoading, isError } = useMe()
  const location = useLocation()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>
  }

  if (isError || !data) {
    // Remember the page they wanted (for instance a Pay now link from an email) so login can go back to it.
    return <Navigate to={loginPathFor(location.pathname + location.search)} replace />
  }

  // On hold: operator, its staff and its parents see a plain notice instead of the app.
  // (A platform member logged in as the operator is let through to help.)
  if (data.tenant?.status === 'suspended' && !data.impersonating) {
    return (
      <Suspended
        isParent={data.roles.includes('parent')}
        companyName={data.tenant.company_name}
      />
    )
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
