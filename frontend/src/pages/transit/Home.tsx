import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarList, type BarRow } from '@/components/charts/BarList'
import { useMyCenter, useTransitStats } from '@/hooks/useTransitPortal'
import type { TransitStats } from '@/api/transitPortal'
import { cn, formatMoney } from '@/lib/utils'

const TOP_SCHOOLS = 6

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-6">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-3xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  )
}

/** Who the bus carries to this center, by school, age and gender: counts only. */
function Demographics({ stats }: { stats: TransitStats }) {
  const { t } = useTranslation()

  // The biggest schools one by one; the long tail is folded into one "other" row.
  const named = stats.by_school.filter((s) => s.name !== null)
  const unnamed = stats.by_school.filter((s) => s.name === null).reduce((n, s) => n + s.count, 0)
  const top = named.slice(0, TOP_SCHOOLS)
  const rest = named.slice(TOP_SCHOOLS).reduce((n, s) => n + s.count, 0)
  const schools: BarRow[] = [
    ...top.map((s) => ({ key: s.name as string, label: s.name as string, value: s.count })),
    ...(rest ? [{ key: '_rest', label: t('transit.stats.otherSchools'), value: rest, neutral: true }] : []),
    ...(unnamed ? [{ key: '_none', label: t('transit.stats.noSchool'), value: unnamed, neutral: true }] : []),
  ]

  const ages: BarRow[] = stats.by_age.map((a) => ({
    key: String(a.age),
    label: t('transit.stats.age', { count: a.age }),
    value: a.count,
  }))

  const g = stats.by_gender
  const genders: BarRow[] = [
    { key: 'male', label: t('transit.stats.male'), value: g.male },
    { key: 'female', label: t('transit.stats.female'), value: g.female },
    ...(g.unknown ? [{ key: 'unknown', label: t('transit.stats.unknown'), value: g.unknown, neutral: true }] : []),
  ].filter((row) => row.value > 0)

  const panels: { title: string; rows: BarRow[] }[] = [
    { title: t('transit.stats.bySchool'), rows: schools },
    { title: t('transit.stats.byAge'), rows: ages },
    { title: t('transit.stats.byGender'), rows: genders },
  ]

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
      {panels.map((panel) => (
        <Card key={panel.title}>
          <CardHeader>
            <CardTitle className="text-base">{panel.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {panel.rows.length ? (
              <BarList rows={panel.rows} label={panel.title} />
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** Start page for a transit center: who its bus operator is and what it costs per child each month. */
export function TransitHome() {
  const { t } = useTranslation()
  const { data: center, isLoading } = useMyCenter()
  const { data: stats } = useTransitStats()

  if (isLoading || !center) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t('transit.portal.welcome', { name: center.name })}</h1>
        </div>
        <Link to="/transit/students?apply=1" className={cn(buttonVariants({ size: 'lg' }))}>
          {t('transit.students.apply')}
        </Link>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StatTile label={t('transit.stats.studentsOnBus')} value={stats.students} />
            <StatTile label={t('transit.stats.waiting')} value={stats.waiting} />
            <StatTile label={t('transit.stats.schools')} value={stats.by_school.filter((s) => s.name !== null).length} />
          </div>
          {stats.students > 0 ? (
            <Demographics stats={stats} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('transit.stats.empty')}</p>
          )}
        </>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('transit.portal.prices')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('transit.portal.pricesHint')}</p>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {center.monthly_price === null
                ? t('transit.portal.askOperator')
                : `RM ${formatMoney(center.monthly_price)} / ${t('transit.portal.month')}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('transit.portal.operator')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{center.operator.company_name}</span>
            {center.operator.contact_phone && <span>{center.operator.contact_phone}</span>}
            {center.operator.email && <span className="text-muted-foreground">{center.operator.email}</span>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
