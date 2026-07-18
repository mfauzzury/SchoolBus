import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Outlet />
    </div>
  )
}
