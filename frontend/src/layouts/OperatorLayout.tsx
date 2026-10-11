import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Eye, Menu, Settings, X, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMe, useLogout } from '@/hooks/useAuth'
import { useStudentApplications } from '@/hooks/useStudentApplications'
import { useStopImpersonation } from '@/hooks/useAdmin'
import { AnnouncementBanner } from '@/components/AnnouncementBanner'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { cn } from '@/lib/utils'
import { FEATURES } from '@/lib/features'

export function OperatorLayout() {
  const { t } = useTranslation()
  const { data } = useMe()
  const logout = useLogout()
  const { data: pendingApplications } = useStudentApplications({ status: 'pending' })
  const [mobileOpen, setMobileOpen] = useState(false)
  const stopImpersonation = useStopImpersonation()

  const navItems: { to: string; label: string; count: number; icon?: LucideIcon }[] = [
    { to: '/operator/dashboard', label: t('nav.dashboard'), count: 0 },
    ...(FEATURES.operatorLive ? [{ to: '/operator/live', label: t('nav.live'), count: 0 }] : []),
    { to: '/operator/students', label: t('nav.students'), count: 0 },
    { to: '/operator/applications', label: t('nav.applications'), count: pendingApplications?.length ?? 0 },
    { to: '/operator/finances', label: t('nav.finances'), count: 0 },
    // Icon-only in the desktop bar; the label stays for screen readers and the mobile menu.
    { to: '/operator/settings', label: t('nav.settings'), count: 0, icon: Settings },
  ]

  return (
    <div className="min-h-screen">
      {data?.impersonating && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span className="flex items-center gap-1.5">
            <Eye className="size-4" aria-hidden />
            {t('impersonation.viewingAs', { company: data.tenant?.company_name })}
          </span>
          <button
            type="button"
            className="font-medium underline underline-offset-2 disabled:opacity-50"
            disabled={stopImpersonation.isPending}
            onClick={() =>
              stopImpersonation.mutate(undefined, {
                onSuccess: (result) =>
                  window.location.assign(
                    result.operator_id ? `/admin/operators/${result.operator_id}` : '/login',
                  ),
              })
            }
          >
            {t('impersonation.return')}
          </button>
        </div>
      )}
      <AnnouncementBanner />
      <header className="border-b">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 py-4 lg:px-8">
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
                title={item.icon ? item.label : undefined}
                aria-label={item.icon ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground',
                    isActive &&
                      'font-medium text-foreground after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:rounded-full after:bg-primary',
                  )
                }
              >
                {item.icon ? <item.icon className="size-4" /> : item.label}
                {item.count > 0 && (
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {item.count}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button
              variant="outline"
              size="sm"
              title={data?.user.name}
              onClick={() => logout.mutate()}
            >
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
                  {item.icon && <item.icon className="size-4" />}
                  {item.label}
                  {item.count > 0 && (
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {item.count}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex items-center gap-3 border-t pt-3">
              <ThemeSwitcher />
              <LanguageSwitcher />
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => logout.mutate()}
              >
                {t('common.logOut')}
              </Button>
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
