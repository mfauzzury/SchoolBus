import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Company settings. The menu picks the section; this just titles it. */
export function SettingsLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const title = pathname.endsWith('/billing') ? t('nav.settingsBilling') : t('nav.settingsGeneral')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">{title}</h1>

      <Outlet />
    </div>
  )
}
