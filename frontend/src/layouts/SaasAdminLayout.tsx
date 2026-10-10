import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCan, useMe, useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

export function SaasAdminLayout() {
  const { t } = useTranslation()
  const { data } = useMe()
  const logout = useLogout()
  const [mobileOpen, setMobileOpen] = useState(false)
  const canManageTeam = useCan('team.manage')
  const canManagePlans = useCan('plans.manage')

  // Groups with nothing in them (a level may not see Settings at all) are dropped.
  const groups: NavGroup[] = [
    {
      title: t('admin.nav.groupOverview'),
      items: [{ to: '/admin/dashboard', label: t('admin.nav.dashboard') }],
    },
    {
      title: t('admin.nav.groupOperators'),
      items: [{ to: '/admin/operators', label: t('admin.nav.operators') }],
    },
    {
      title: t('admin.nav.groupMoney'),
      items: [
        { to: '/admin/transactions', label: t('admin.nav.transactions') },
        ...(canManagePlans ? [{ to: '/admin/plans', label: t('admin.nav.plans') }] : []),
      ],
    },
    {
      title: t('admin.nav.groupSettings'),
      items: canManageTeam
        ? [
            { to: '/admin/team', label: t('admin.nav.team') },
            { to: '/admin/activity', label: t('admin.nav.activity') },
          ]
        : [],
    },
  ].filter((group) => group.items.length > 0)

  const nav = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <span className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group.title}
          </span>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
                  isActive && 'bg-muted font-medium text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )

  const account = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-muted-foreground">{data?.user.name}</span>
        <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
          {t('common.logOut')}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col justify-between overflow-y-auto border-r p-4 lg:flex">
        <div className="flex flex-col gap-6">
          <Link to="/admin/dashboard" className="px-2 font-medium hover:text-primary">
            {t('admin.nav.platformAdmin')}
          </Link>
          {nav()}
        </div>
        {account}
      </aside>

      <header className="border-b lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/admin/dashboard" className="truncate font-medium hover:text-primary">
            {t('admin.nav.platformAdmin')}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {mobileOpen && (
          <div className="flex flex-col gap-4 border-t px-4 py-3">
            {nav(() => setMobileOpen(false))}
            <div className="border-t pt-3">{account}</div>
          </div>
        )}
      </header>

      <div className="lg:pl-60">
        <main className="mx-auto max-w-content p-4 sm:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
