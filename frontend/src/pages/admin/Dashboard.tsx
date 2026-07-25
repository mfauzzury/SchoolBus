import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from '@/hooks/useAuth'
import { usePlatformSummary } from '@/hooks/useAdmin'
import { formatMoney } from '@/lib/utils'

export function AdminDashboard() {
  const { t } = useTranslation()
  const { data } = useMe()
  const { data: summary } = usePlatformSummary()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">
        {t('admin.dashboard.welcome', { name: data?.user.name })}
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('admin.dashboard.totalOperators')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{summary?.total_operators ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('admin.dashboard.totalStudents')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{summary?.total_students ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('admin.dashboard.totalBuses')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{summary?.total_buses ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('admin.dashboard.totalParents')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{summary?.total_parents ?? 0}</CardContent>
        </Card>
      </div>

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
      </div>
    </div>
  )
}
