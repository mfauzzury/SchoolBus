import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { useDashboardSummary } from '@/hooks/useFinances'
import { useBuses } from '@/hooks/useBuses'
import { useStaff } from '@/hooks/useStaff'
import { useRoutes } from '@/hooks/useRoutes'
import { useOperatorStudents } from '@/hooks/useOperatorStudents'
import { useStudentApplications } from '@/hooks/useStudentApplications'
import { cn, formatMoney } from '@/lib/utils'

export function OperatorDashboard() {
  const { t } = useTranslation()
  const { data } = useMe()
  const { tenant } = useTenant()
  const { data: summary } = useDashboardSummary({})
  const { data: buses } = useBuses()
  const { data: staff } = useStaff()
  const { data: routes } = useRoutes()
  const { data: students } = useOperatorStudents({})
  const { data: pendingApplications } = useStudentApplications({ status: 'pending' })
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    if (!tenant) return
    await navigator.clipboard.writeText(tenant.operator_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">
        {t('operator.dashboard.welcome', {
          name: data?.user.name,
          company: tenant?.company_name,
        })}
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.totalExpected')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {formatMoney(summary?.total_expected ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.totalCollected')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {formatMoney(summary?.total_collected ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.totalOutstanding')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {formatMoney(summary?.total_outstanding ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.overdueCount')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{summary?.overdue_count ?? 0}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t('nav.students')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{students?.length ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t('nav.buses')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{buses?.length ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t('nav.staff')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{staff?.length ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t('nav.routes')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{routes?.length ?? 0}</CardContent>
        </Card>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">{t('operator.dashboard.pendingApplications')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('operator.dashboard.pendingApplicationsDescription')}
          </p>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-2xl font-medium">{pendingApplications?.length ?? 0}</span>
          <Link to="/operator/applications" className={cn(buttonVariants({ size: 'sm' }))}>
            {t('operator.dashboard.reviewApplications')}
          </Link>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">{t('operator.dashboard.operatorId')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('operator.dashboard.operatorIdDescription')}
          </p>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <span className="rounded-lg border bg-muted/50 px-4 py-2 text-2xl font-medium tracking-[0.3em]">
            {tenant?.operator_code}
          </span>
          <Button variant="outline" size="sm" onClick={copyCode}>
            {copied ? <Check /> : <Copy />}
            {copied ? t('operator.dashboard.copied') : t('operator.dashboard.copy')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
