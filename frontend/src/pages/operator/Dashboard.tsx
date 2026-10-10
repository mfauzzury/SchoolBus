import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { useDashboardSummary, useInvoices } from '@/hooks/useFinances'
import { useBuses } from '@/hooks/useBuses'
import { useStaff } from '@/hooks/useStaff'
import { useRoutes } from '@/hooks/useRoutes'
import { useOperatorStudents } from '@/hooks/useOperatorStudents'
import { useStudentApplications } from '@/hooks/useStudentApplications'
import { RegistrationShareCard } from '@/components/RegistrationShareCard'
import { MonthlyCollectionsChart } from '@/components/charts/MonthlyCollectionsChart'
import { SeatUsageMeters } from '@/components/charts/SeatUsageMeters'
import { cn, formatMoney } from '@/lib/utils'

function StatCard({
  label,
  value,
  children,
}: {
  label: string
  value: ReactNode
  children?: ReactNode
}) {
  return (
    <Card size="sm" className="gap-1">
      <CardHeader>
        <CardTitle className="text-xs font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <span className="text-xl font-medium">{value}</span>
        {children}
      </CardContent>
    </Card>
  )
}

export function OperatorDashboard() {
  const { t } = useTranslation()
  const { data } = useMe()
  const { tenant } = useTenant()
  const { data: summary } = useDashboardSummary({})
  const { data: invoices } = useInvoices({})
  const { data: buses } = useBuses()
  const { data: staff } = useStaff()
  const { data: routes } = useRoutes()
  const { data: students } = useOperatorStudents({})
  const { data: pendingApplications } = useStudentApplications({ status: 'pending' })
  const pendingCount = pendingApplications?.length ?? 0

  const collectionRate =
    summary && summary.total_expected > 0
      ? Math.round((summary.total_collected / summary.total_expected) * 100)
      : 0

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">
        {t('operator.dashboard.welcome', {
          name: data?.user.name,
          company: tenant?.company_name,
        })}
      </h1>

      <Card
        size="sm"
        className="bg-amber-50 text-amber-950 ring-amber-300/70 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/30"
      >
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
            <ClipboardList className="size-5" />
          </span>
          <div className="flex min-w-40 flex-1 flex-col">
            <span className="text-xs text-amber-900/70 dark:text-amber-200/70">
              {t('operator.dashboard.newApplications')}
            </span>
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-xl font-medium" data-testid="new-applications-count">
                {pendingCount}
              </span>
              <span className="text-sm text-amber-900/80 dark:text-amber-100/80">
                {pendingCount > 0
                  ? t('operator.dashboard.newApplicationsWaiting', { count: pendingCount })
                  : t('operator.dashboard.noNewApplications')}
              </span>
            </span>
          </div>
          {pendingCount > 0 && (
            <Link
              to="/operator/applications"
              className={cn(
                buttonVariants({ size: 'sm' }),
                'bg-amber-500 text-amber-950 hover:bg-amber-400',
              )}
            >
              {t('operator.dashboard.reviewApplications')}
            </Link>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t('operator.finances.totalExpected')}
          value={`RM ${formatMoney(summary?.total_expected ?? 0)}`}
        />
        <StatCard
          label={t('operator.finances.totalCollected')}
          value={
            <>
              RM {formatMoney(summary?.total_collected ?? 0)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {collectionRate}%
              </span>
            </>
          }
        >
          <div
            role="meter"
            aria-label={t('operator.dashboard.charts.collectionRate', { percent: collectionRate })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={collectionRate}
            title={t('operator.dashboard.charts.collectionRate', { percent: collectionRate })}
            className="h-1.5 overflow-hidden rounded-full"
            style={{ backgroundColor: 'color-mix(in oklab, var(--viz-collected) 18%, transparent)' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${collectionRate}%`, backgroundColor: 'var(--viz-collected)' }}
            />
          </div>
        </StatCard>
        <StatCard
          label={t('operator.finances.totalOutstanding')}
          value={`RM ${formatMoney(summary?.total_outstanding ?? 0)}`}
        />
        <StatCard label={t('operator.finances.overdueCount')} value={summary?.overdue_count ?? 0} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t('nav.students')} value={students?.length ?? 0} />
        <StatCard label={t('nav.buses')} value={buses?.length ?? 0} />
        <StatCard label={t('nav.staff')} value={staff?.length ?? 0} />
        <StatCard label={t('nav.routes')} value={routes?.length ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {t('operator.dashboard.charts.collectionsTitle')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('operator.dashboard.charts.collectionsDescription')}
            </p>
          </CardHeader>
          <CardContent>
            <MonthlyCollectionsChart invoices={invoices ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('operator.dashboard.charts.seatsTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('operator.dashboard.charts.seatsDescription')}
            </p>
          </CardHeader>
          <CardContent>
            <SeatUsageMeters routes={routes ?? []} students={students ?? []} />
          </CardContent>
        </Card>
      </div>

      {tenant && (
        <RegistrationShareCard
          operatorCode={tenant.operator_code}
          companyName={tenant.company_name}
        />
      )}
    </div>
  )
}
