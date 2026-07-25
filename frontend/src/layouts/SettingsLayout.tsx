import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function SettingsLayout() {
  const { t } = useTranslation()

  const tabs = [
    { to: '/operator/settings', label: t('operator.settings.general'), end: true },
    { to: '/operator/settings/routes', label: t('nav.routes'), end: false },
    { to: '/operator/settings/buses', label: t('nav.buses'), end: false },
    { to: '/operator/settings/staff', label: t('nav.staff'), end: false },
  ]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">{t('operator.settings.title')}</h1>

      <nav
        role="group"
        aria-label="Settings section"
        className="inline-flex w-fit items-center rounded-full border p-0.5 text-sm"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'rounded-full px-2.5 py-1 font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
