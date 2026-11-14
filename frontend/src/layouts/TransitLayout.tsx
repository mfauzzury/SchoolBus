import { Outlet } from 'react-router-dom'
import { House } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMe, useLogout } from '@/hooks/useAuth'
import { SidebarShell, type SidebarGroup } from '@/components/SidebarShell'

/** The transit center's portal: asking the bus operator to carry its children. */
export function TransitLayout() {
  const { t } = useTranslation()
  const { data } = useMe()
  const logout = useLogout()

  const groups: SidebarGroup[] = [
    {
      title: t('transit.portal.groupCenter'),
      items: [{ to: '/transit/home', label: t('transit.portal.home'), icon: House }],
    },
  ]

  return (
    <SidebarShell
      brand={{ to: '/transit/home', content: <span className="truncate">{data?.transitCenter?.name}</span> }}
      groups={groups}
      userName={data?.user.name}
      logoutLabel={t('common.logOut')}
      onLogout={() => logout.mutate()}
    >
      <Outlet />
    </SidebarShell>
  )
}
