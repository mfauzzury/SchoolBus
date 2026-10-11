import { Outlet } from 'react-router-dom'
import {
  Building2,
  Bus,
  ClipboardList,
  Eye,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  Radio,
  ReceiptText,
  Route,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMe, useLogout } from '@/hooks/useAuth'
import { useStudentApplications } from '@/hooks/useStudentApplications'
import { useStopImpersonation } from '@/hooks/useAdmin'
import { AnnouncementBanner } from '@/components/AnnouncementBanner'
import { SidebarShell, type SidebarGroup } from '@/components/SidebarShell'
import { FEATURES } from '@/lib/features'
import { completionPercent, profileItems } from '@/lib/profileCompleteness'

export function OperatorLayout() {
  const { t } = useTranslation()
  const { data } = useMe()
  const logout = useLogout()
  const { data: pendingApplications } = useStudentApplications({ status: 'pending' })
  const stopImpersonation = useStopImpersonation()

  const tenant = data?.tenant
  const profilePercent = tenant
    ? completionPercent(
        profileItems({
          ...tenant,
          bank_name: tenant.bank_details?.bank_name,
          account_number: tenant.bank_details?.account_number,
          account_holder: tenant.bank_details?.account_holder,
        }),
      )
    : 100

  const groups: SidebarGroup[] = [
    {
      title: t('nav.groupOverview'),
      items: [
        { to: '/operator/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        ...(FEATURES.operatorLive ? [{ to: '/operator/live', label: t('nav.live'), icon: Radio }] : []),
      ],
    },
    {
      title: t('nav.groupPeople'),
      items: [
        { to: '/operator/students', label: t('nav.students'), icon: GraduationCap },
        {
          to: '/operator/applications',
          label: t('nav.applications'),
          icon: ClipboardList,
          badge: pendingApplications?.length ?? 0,
        },
      ],
    },
    {
      title: t('nav.groupFleet'),
      items: [
        { to: '/operator/routes', label: t('nav.routesAndFares'), icon: Route },
        { to: '/operator/buses', label: t('nav.buses'), icon: Bus },
        { to: '/operator/staff', label: t('nav.staff'), icon: IdCard },
      ],
    },
    {
      title: t('nav.groupMoney'),
      items: [{ to: '/operator/finances', label: t('nav.finances'), icon: Wallet }],
    },
    {
      title: t('nav.groupSettings'),
      items: [
        {
          to: '/operator/settings',
          label: t('nav.settingsGeneral'),
          icon: Building2,
          end: true,
          // Only until the profile is complete: a quiet nudge, not a permanent badge.
          badge: profilePercent < 100 ? `${profilePercent}%` : undefined,
        },
        { to: '/operator/settings/billing', label: t('nav.settingsBilling'), icon: ReceiptText },
      ],
    },
  ]

  const banners = (
    <>
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
    </>
  )

  return (
    <SidebarShell
      brand={{
        to: '/',
        content: (
          <>
            {data?.tenant?.logo_url && (
              <img src={data.tenant.logo_url} alt="" className="size-6 shrink-0 rounded object-cover" />
            )}
            <span className="truncate">{data?.tenant?.company_name}</span>
          </>
        ),
      }}
      groups={groups}
      userName={data?.user.name}
      logoutLabel={t('common.logOut')}
      onLogout={() => logout.mutate()}
      banners={banners}
    >
      <Outlet />
    </SidebarShell>
  )
}
