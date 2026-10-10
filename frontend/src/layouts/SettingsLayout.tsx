import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { pillTabClass, pillTabListClass } from '@/lib/tabs'

export function SettingsLayout() {
  const { t } = useTranslation()

  const tabs = [
    { to: '/operator/settings', label: t('operator.settings.general'), end: true },
    { to: '/operator/settings/billing', label: t('operator.settings.billing'), end: false },
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
        className={pillTabListClass}
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => pillTabClass(isActive)}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
