import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMe, useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { cn } from '@/lib/utils'

export function SaasAdminLayout() {
  const { t } = useTranslation()
  const { data } = useMe()
  const logout = useLogout()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { to: '/admin/dashboard', label: t('admin.nav.dashboard') },
    { to: '/admin/operators', label: t('admin.nav.operators') },
    { to: '/admin/transactions', label: t('admin.nav.transactions') },
  ]

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 py-4 lg:px-8">
          <Link to="/admin/dashboard" className="flex min-w-0 items-center gap-2 hover:text-primary">
            <span className="truncate font-medium">{t('admin.nav.platformAdmin')}</span>
          </Link>

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
            <ThemeSwitcher />
            <LanguageSwitcher />
            <span className="text-sm text-muted-foreground">{data?.user.name}</span>
            <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
              {t('common.logOut')}
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
            <div className="mt-3 flex flex-col gap-3 border-t pt-3">
              <div className="flex items-center gap-3">
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{data?.user.name}</span>
                <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
                  {t('common.logOut')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-content p-4 sm:py-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
