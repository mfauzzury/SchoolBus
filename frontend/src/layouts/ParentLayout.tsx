import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe, useLogout } from '@/hooks/useAuth'
import { useMyInvoices } from '@/hooks/useParentPortal'
import { BrandLogo } from '@/components/BrandLogo'
import { ParentBottomNav } from '@/components/ParentBottomNav'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { cn } from '@/lib/utils'
import { FEATURES } from '@/lib/features'

export function ParentLayout() {
  const { t } = useTranslation()
  const { data } = useMe()
  const logout = useLogout()
  const { data: invoices } = useMyInvoices()

  const unpaidCount = invoices?.filter((inv) => inv.status === 'issued' || inv.status === 'overdue').length ?? 0

  const navItems = [
    { to: '/parent/dashboard', label: t('nav.myChildren'), count: 0 },
    ...(FEATURES.parentTrack ? [{ to: '/parent/track', label: t('nav.track'), count: 0 }] : []),
    { to: '/parent/invoices', label: t('nav.invoices'), count: unpaidCount },
    { to: '/parent/profile', label: t('nav.profile'), count: 0 },
  ]

  return (
    <div className="min-h-screen">
      {/* Below lg, navigation moves to the floating ParentBottomNav and
          account controls move into the Profile page — there's no header
          at all on mobile, matching a native-app shell rather than a
          responsive website chrome. */}
      <header className="hidden border-b lg:block">
        <div className="mx-auto flex max-w-content items-center justify-between gap-2 px-4 py-4 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-medium hover:text-primary">
            <BrandLogo />
          </Link>

          <nav className="flex items-center gap-4">
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

          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            {data?.parentProfile?.avatar_url && (
              <img
                src={data.parentProfile.avatar_url}
                alt=""
                className="size-6 shrink-0 rounded-full object-cover"
              />
            )}
            <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
              {t('common.logOut')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-content p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-6">
        <Outlet />
      </main>

      <ParentBottomNav />
    </div>
  )
}
