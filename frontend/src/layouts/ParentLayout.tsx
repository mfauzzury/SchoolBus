import { Outlet } from 'react-router-dom'
import { useMe, useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export function ParentLayout() {
  const { data } = useMe()
  const logout = useLogout()

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-4 sm:px-6">
        <span className="shrink-0 font-medium">BasSekolah.my</span>
        <div className="flex min-w-0 items-center gap-4">
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">
            {data?.user.name}
          </span>
          <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
            Log out
          </Button>
        </div>
      </header>
      <main className="p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
