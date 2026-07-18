import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useMe, useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/operator/dashboard', label: 'Dashboard' },
  { to: '/operator/routes', label: 'Routes' },
  { to: '/operator/buses', label: 'Buses' },
  { to: '/operator/staff', label: 'Staff' },
  { to: '/operator/students', label: 'Students' },
  { to: '/operator/finances', label: 'Finances' },
  { to: '/operator/settings', label: 'Settings' },
]

export function OperatorLayout() {
  const { data } = useMe()
  const logout = useLogout()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            {data?.tenant.logo_url && (
              <img src={data.tenant.logo_url} alt="" className="size-6 shrink-0 rounded object-cover" />
            )}
            <span className="truncate font-medium">{data?.tenant.company_name}</span>
          </div>

          <nav className="hidden items-center gap-4 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'text-sm text-muted-foreground hover:text-foreground',
                    isActive && 'font-medium text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <span className="text-sm text-muted-foreground">{data?.user.name}</span>
            <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
              Log out
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {mobileOpen && (
          <div className="border-t px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted',
                      isActive && 'font-medium text-foreground',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground">{data?.user.name}</span>
              <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
                Log out
              </Button>
            </div>
          </div>
        )}
      </header>
      <main className="p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
