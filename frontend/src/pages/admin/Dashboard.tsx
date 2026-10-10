import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart'
import { useMe } from '@/hooks/useAuth'
import { usePlatformAttention, usePlatformSummary, usePlatformTrends } from '@/hooks/useAdmin'
import { formatMoney } from '@/lib/utils'
import type { AttentionKind } from '@/api/admin'

const ATTENTION_KINDS: AttentionKind[] = ['new', 'no_billplz', 'no_students', 'over_limit', 'inactive']

export function AdminDashboard() {
  const { t } = useTranslation()
  const { data } = useMe()
  const { data: summary } = usePlatformSummary()
  const { data: trends } = usePlatformTrends()
  const { data: attention } = usePlatformAttention()

  const thisMonth = summary?.this_month
  const lastMonth = summary?.last_month

  // "Last month" is the whole month, so it reads as a reference, not a like-for-like change.
  const monthTile = (
    label: string,
    value: string,
    previous: string | undefined,
    emphasis = false,
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <span className={emphasis ? 'text-3xl font-medium' : 'text-2xl font-medium'}>{value}</span>
        {previous !== undefined && (
          <span className="text-xs text-muted-foreground">
            {t('admin.dashboard.lastMonth', { value: previous })}
          </span>
        )}
      </CardContent>
    </Card>
  )

  const total = (label: string, value: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-medium">{value}</CardContent>
    </Card>
  )

  const attentionTotal = attention
    ? ATTENTION_KINDS.reduce((sum, kind) => sum + attention[kind].count, 0) +
      attention.stuck_payments.count
    : 0

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">
        {t('admin.dashboard.welcome', { name: data?.user.name })}
      </h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t('admin.dashboard.thisMonth')}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {monthTile(
            t('admin.dashboard.collected'),
            `RM ${formatMoney(thisMonth?.collected ?? 0)}`,
            lastMonth ? `RM ${formatMoney(lastMonth.collected)}` : undefined,
            true,
          )}
          {monthTile(
            t('admin.dashboard.newOperators'),
            String(thisMonth?.new_operators ?? 0),
            lastMonth ? String(lastMonth.new_operators) : undefined,
          )}
          {monthTile(
            t('admin.dashboard.newStudents'),
            String(thisMonth?.new_students ?? 0),
            lastMonth ? String(lastMonth.new_students) : undefined,
          )}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.dashboard.attentionTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!attention ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : attentionTotal === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.dashboard.attentionNone')}</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {ATTENTION_KINDS.map((kind) => {
                const list = attention[kind]
                if (list.count === 0) return null
                return (
                  <li key={kind} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={kind === 'over_limit' ? 'destructive' : 'info'}>{list.count}</Badge>
                        <span className="text-sm font-medium">
                          {t(`admin.dashboard.attention.${kind}.title`)}
                        </span>
                      </div>
                      <Link
                        to={`/admin/operators?attention=${kind}`}
                        className="text-sm underline underline-offset-4 hover:text-primary"
                      >
                        {t('admin.dashboard.seeAll')}
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(`admin.dashboard.attention.${kind}.help`)}
                    </p>
                    <p className="text-sm">
                      {list.items.map((operator, index) => (
                        <span key={operator.id}>
                          {index > 0 && ', '}
                          <Link to={`/admin/operators/${operator.id}`} className="hover:underline">
                            {operator.company_name}
                          </Link>
                        </span>
                      ))}
                      {list.count > list.items.length && (
                        <span className="text-muted-foreground">
                          {' '}
                          {t('admin.dashboard.andMore', { count: list.count - list.items.length })}
                        </span>
                      )}
                    </p>
                  </li>
                )
              })}

              {attention.stuck_payments.count > 0 && (
                <li className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{attention.stuck_payments.count}</Badge>
                      <span className="text-sm font-medium">
                        {t('admin.dashboard.attention.stuck_payments.title')}
                      </span>
                    </div>
                    <Link
                      to="/admin/transactions?tab=online&stuck=1"
                      className="text-sm underline underline-offset-4 hover:text-primary"
                    >
                      {t('admin.dashboard.seeAll')}
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.dashboard.attention.stuck_payments.help')}
                  </p>
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('admin.dashboard.charts.collected')}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart
              kind="money"
              label={t('admin.dashboard.charts.collected')}
              points={(trends ?? []).map((m) => ({ month: m.month, value: m.collected }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.charts.newOperators')}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart
              kind="count"
              label={t('admin.dashboard.charts.newOperators')}
              points={(trends ?? []).map((m) => ({ month: m.month, value: m.new_operators }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.charts.newStudents')}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart
              kind="count"
              label={t('admin.dashboard.charts.newStudents')}
              points={(trends ?? []).map((m) => ({ month: m.month, value: m.new_students }))}
            />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t('admin.dashboard.platformTotals')}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {total(t('admin.dashboard.totalOperators'), String(summary?.total_operators ?? 0))}
          {total(t('admin.dashboard.totalStudents'), String(summary?.total_students ?? 0))}
          {total(t('admin.dashboard.totalBuses'), String(summary?.total_buses ?? 0))}
          {total(t('admin.dashboard.totalParents'), String(summary?.total_parents ?? 0))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {total(t('operator.finances.totalExpected'), `RM ${formatMoney(summary?.total_expected ?? 0)}`)}
          {total(t('operator.finances.totalCollected'), `RM ${formatMoney(summary?.total_collected ?? 0)}`)}
          {total(t('operator.finances.totalOutstanding'), `RM ${formatMoney(summary?.total_outstanding ?? 0)}`)}
        </div>
      </section>
    </div>
  )
}
