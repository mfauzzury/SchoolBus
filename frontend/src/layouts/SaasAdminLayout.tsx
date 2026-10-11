import { Outlet } from 'react-router-dom'
import {
  Bus,
  HeartPulse,
  History,
  Inbox,
  Layers,
  LayoutDashboard,
  Mail,
  Megaphone,
  Receipt,
  Users,
  UsersRound,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCan, useMe, useLogout } from '@/hooks/useAuth'
import { useInboxSummary } from '@/hooks/useAdmin'
import { SidebarShell, type SidebarGroup } from '@/components/SidebarShell'

export function SaasAdminLayout() {
  const { t } = useTranslation()
  const { data } = useMe()
  const logout = useLogout()
  const canManageTeam = useCan('team.manage')
  const canManagePlans = useCan('plans.manage')
  const canSupport = useCan('support.manage')
  const canSeeReports = useCan('reports.view')
  const { data: inbox } = useInboxSummary(canSupport)

  // Items hidden by permission; a group left empty is dropped by the shell.
  const groups: SidebarGroup[] = [
    {
      title: t('admin.nav.groupOverview'),
      items: [{ to: '/admin/dashboard', label: t('admin.nav.dashboard'), icon: LayoutDashboard }],
    },
    {
      title: t('admin.nav.groupOperators'),
      items: [
        { to: '/admin/operators', label: t('admin.nav.operators'), icon: Bus },
        ...(canSeeReports ? [{ to: '/admin/parents', label: t('admin.nav.parents'), icon: UsersRound }] : []),
      ],
    },
    {
      title: t('admin.nav.groupMoney'),
      items: [
        { to: '/admin/transactions', label: t('admin.nav.transactions'), icon: Receipt },
        ...(canManagePlans ? [{ to: '/admin/plans', label: t('admin.nav.plans'), icon: Layers }] : []),
      ],
    },
    {
      title: t('admin.nav.groupSupport'),
      items: canSupport
        ? [
            { to: '/admin/inbox', label: t('admin.nav.inbox'), icon: Inbox, badge: inbox?.open },
            { to: '/admin/announcements', label: t('admin.nav.announcements'), icon: Megaphone },
          ]
        : [],
    },
    {
      title: t('admin.nav.groupSettings'),
      items: canManageTeam
        ? [
            { to: '/admin/team', label: t('admin.nav.team'), icon: Users },
            { to: '/admin/activity', label: t('admin.nav.activity'), icon: History },
            { to: '/admin/messages', label: t('admin.nav.messages'), icon: Mail },
            { to: '/admin/system', label: t('admin.nav.system'), icon: HeartPulse },
          ]
        : [],
    },
  ]

  return (
    <SidebarShell
      brand={{ to: '/admin/dashboard', content: <span className="truncate">{t('admin.nav.platformAdmin')}</span> }}
      groups={groups}
      userName={data?.user.name}
      logoutLabel={t('common.logOut')}
      onLogout={() => logout.mutate()}
    >
      <Outlet />
    </SidebarShell>
  )
}
