import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMe, useLogout } from '@/hooks/useAuth'
import { useStudentApplications } from '@/hooks/useStudentApplications'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { cn } from '@/lib/utils'

export function OperatorLayout() {
  const { t } = useTranslation()
  const { data } = useMe()
  const logout = useLogout()
  const { data: pendingApplications } = useStudentApplications({ status: 'pending' })
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { to: '/operator/dashboard', label: t('nav.dashboard'), count: 0 },
    { to: '/operator/students', label: t('nav.students'), count: 0 },
    { to: '/operator/applications', label: t('nav.applications'), count: pendingApplications?.length ?? 0 },
    { to: '/operator/finances', label: t('nav.finances'), count: 0 },
    { to: '/operator/settings', label: t('nav.settings'), count: 0 },
  ]

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2 hover:text-primary">
            {data?.tenant?.logo_url && (
              <img src={data.tenant.logo_url} alt="" className="size-6 shrink-0 rounded object-cover" />
            )}
            <span className="truncate font-medium">{data?.tenant?.company_name}</span>
          </Link>

          <nav className="hidden items-center gap-4 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground',
                    isActive && 'font-medium text-foreground',
                  )
                }
              >
                {item.label}
                {item.count > 0 && (
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {item.count}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
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
                      'flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted',
                      isActive && 'font-medium text-foreground',
                    )
                  }
                >
                  {item.label}
                  {item.count > 0 && (
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {item.count}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-3 border-t pt-3">
              <LanguageSwitcher />
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
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
