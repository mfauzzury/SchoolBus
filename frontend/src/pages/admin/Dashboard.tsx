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

/** A compact number tile: small label, the value, and an optional line underneath. */
function Stat({
  label,
  value,
  note,
  size = 'md',
}: {
  label: string
  value: string
  note?: string
  size?: 'lg' | 'md' | 'sm'
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-card px-3.5 py-2.5 ring-1 ring-foreground/10">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span
        className={
          size === 'lg' ? 'text-2xl font-medium' : size === 'md' ? 'text-xl font-medium' : 'text-base font-medium'
        }
      >
        {value}
      </span>
      {note && <span className="truncate text-xs text-muted-foreground">{note}</span>}
    </div>
  )
}

export function AdminDashboard() {
  const { t } = useTranslation()
  const { data } = useMe()
  const { data: summary } = usePlatformSummary()
  const { data: trends } = usePlatformTrends()
  const { data: attention } = usePlatformAttention()

  const thisMonth = summary?.this_month
  const lastMonth = summary?.last_month

  // "Last month" is the whole month, so it reads as a reference, not a like-for-like change.
  const previous = (value: string | undefined) =>
    value === undefined ? undefined : t('admin.dashboard.lastMonth', { value })

  const attentionTotal = attention
    ? ATTENTION_KINDS.reduce((sum, kind) => sum + attention[kind].count, 0) +
      attention.stuck_payments.count
    : 0

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">
        {t('admin.dashboard.welcome', { name: data?.user.name })}
      </h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('admin.dashboard.thisMonth')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            size="lg"
            label={t('admin.dashboard.collected')}
            value={`RM ${formatMoney(thisMonth?.collected ?? 0)}`}
            note={previous(lastMonth ? `RM ${formatMoney(lastMonth.collected)}` : undefined)}
          />
          <Stat
            label={t('admin.dashboard.newOperators')}
            value={String(thisMonth?.new_operators ?? 0)}
            note={previous(lastMonth ? String(lastMonth.new_operators) : undefined)}
          />
          <Stat
            label={t('admin.dashboard.newStudents')}
            value={String(thisMonth?.new_students ?? 0)}
            note={previous(lastMonth ? String(lastMonth.new_students) : undefined)}
          />
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <Card size="sm">
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
                    <li
                      key={kind}
                      className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0"
                      title={t(`admin.dashboard.attention.${kind}.help`)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                          <Badge variant={kind === 'over_limit' ? 'destructive' : 'info'}>{list.count}</Badge>
                          <span className="truncate">{t(`admin.dashboard.attention.${kind}.title`)}</span>
                        </span>
                        <Link
                          to={`/admin/operators?attention=${kind}`}
                          className="shrink-0 text-xs underline underline-offset-4 hover:text-primary"
                        >
                          {t('admin.dashboard.seeAll')}
                        </Link>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {list.items.map((operator, index) => (
                          <span key={operator.id}>
                            {index > 0 && ', '}
                            <Link to={`/admin/operators/${operator.id}`} className="hover:underline">
                              {operator.company_name}
                            </Link>
                          </span>
                        ))}
                        {list.count > list.items.length &&
                          ` ${t('admin.dashboard.andMore', { count: list.count - list.items.length })}`}
                      </p>
                    </li>
                  )
                })}

                {attention.stuck_payments.count > 0 && (
                  <li
                    className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                    title={t('admin.dashboard.attention.stuck_payments.help')}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <Badge variant="destructive">{attention.stuck_payments.count}</Badge>
                      <span className="truncate">
                        {t('admin.dashboard.attention.stuck_payments.title')}
                      </span>
                    </span>
                    <Link
                      to="/admin/transactions?tab=online&stuck=1"
                      className="shrink-0 text-xs underline underline-offset-4 hover:text-primary"
                    >
                      {t('admin.dashboard.seeAll')}
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>{t('admin.dashboard.charts.collected')}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart
              kind="money"
              tall
              label={t('admin.dashboard.charts.collected')}
              points={(trends ?? []).map((m) => ({ month: m.month, value: m.collected }))}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card size="sm">
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
        <Card size="sm">
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

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('admin.dashboard.platformTotals')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat size="sm" label={t('admin.dashboard.totalOperators')} value={String(summary?.total_operators ?? 0)} />
          <Stat size="sm" label={t('admin.dashboard.totalStudents')} value={String(summary?.total_students ?? 0)} />
          <Stat size="sm" label={t('admin.dashboard.totalBuses')} value={String(summary?.total_buses ?? 0)} />
          <Stat size="sm" label={t('admin.dashboard.totalParents')} value={String(summary?.total_parents ?? 0)} />
          <Stat
            size="sm"
            label={t('operator.finances.totalExpected')}
            value={`RM ${formatMoney(summary?.total_expected ?? 0)}`}
          />
          <Stat
            size="sm"
            label={t('operator.finances.totalCollected')}
            value={`RM ${formatMoney(summary?.total_collected ?? 0)}`}
          />
          <Stat
            size="sm"
            label={t('operator.finances.totalOutstanding')}
            value={`RM ${formatMoney(summary?.total_outstanding ?? 0)}`}
          />
        </div>
      </section>
    </div>
  )
}
