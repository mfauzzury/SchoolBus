import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartCard } from '@/components/charts/ChartCard'
import { ColumnChart } from '@/components/charts/ColumnChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { RankedBars } from '@/components/charts/RankedBars'
import { RingGauge } from '@/components/charts/RingGauge'
import { StackedBar } from '@/components/charts/StackedBar'
import { NEUTRAL_COLOR, RAMP_COLORS, SERIES_COLORS, type Slice } from '@/components/charts/types'
import { useOperatorOptions, useParentReport } from '@/hooks/useAdmin'
import type { Distribution, ParentReport } from '@/api/admin'

const ALL = 'all'

const INCOME_ORDER = ['under_3000', '3000_5000', '5000_8000', '8000_12000', 'above_12000'] as const
const NOT_A_GROUP = new Set(['unknown', 'not_answered', 'other', 'prefer_not_to_say'])

/** Who our parents are, as group totals. Never individuals. */
export function AdminParentsReport() {
  const { t } = useTranslation()
  const [operatorId, setOperatorId] = useState(ALL)
  const { data: operators } = useOperatorOptions()
  const { data: report, isLoading, isError } = useParentReport(
    operatorId === ALL ? undefined : Number(operatorId),
  )

  const operatorItems: Record<string, string> = {
    [ALL]: t('admin.parentsReport.allOperators'),
    ...Object.fromEntries((operators ?? []).map((o) => [String(o.id), o.company_name])),
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('admin.system.loadError')}
      </p>
    )
  }

  if (isLoading || !report) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium">{t('admin.parentsReport.title')}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t('admin.parentsReport.intro', { count: report.min_group })}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('admin.parentsReport.operator')}</Label>
          <Select items={operatorItems} value={operatorId} onValueChange={(v) => setOperatorId(v ?? ALL)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(operatorItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Overview report={report} />

      {report.enough_data ? (
        <Charts report={report} />
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('admin.parentsReport.notEnough', { count: report.min_group })}
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        {t('admin.parentsReport.privacy', { count: report.min_group })}
      </p>
    </div>
  )
}

function Overview({ report }: { report: ParentReport }) {
  const { t } = useTranslation()
  const percent =
    report.total_parents > 0 ? Math.round((report.answered_about / report.total_parents) * 100) : 0

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card size="sm">
        <CardContent className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{t('admin.parentsReport.totalParents')}</span>
          <span className="text-3xl font-medium tabular-nums">
            {report.total_parents.toLocaleString('en-MY')}
          </span>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent className="flex items-center gap-4">
          <RingGauge percent={percent} label={t('admin.parentsReport.answered')} />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{t('admin.parentsReport.answered')}</span>
            <span className="text-xs text-muted-foreground">
              {t('admin.parentsReport.answeredOf', { done: report.answered_about, total: report.total_parents })}
            </span>
            <span className="text-xs text-muted-foreground">{t('admin.parentsReport.answeredHelp')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Charts({ report }: { report: ParentReport }) {
  const { t } = useTranslation()
  const d = report.distributions
  const min = report.min_group
  const notGiven = t('admin.parentsReport.notGiven')

  /** A label for a group key, from the translation tree under `prefix`. */
  const labelOf = (prefix: string) => (key: string) => {
    if (key === 'unknown') return notGiven
    if (key === 'not_answered') return t('admin.parentsReport.notAnswered')
    if (key === 'other') return t('admin.parentsReport.other')
    return t(`${prefix}.${key}`, { defaultValue: key })
  }

  const slices = (
    distribution: Distribution | undefined,
    label: (key: string) => string,
    color: (key: string) => string | undefined,
    short?: (key: string) => string,
  ): Slice[] =>
    (distribution?.items ?? []).map((item) => ({
      key: item.key,
      label: label(item.key),
      count: item.count,
      color: NOT_A_GROUP.has(item.key) ? NEUTRAL_COLOR : color(item.key),
      short: short?.(item.key),
    }))

  const base = (distribution?: Distribution) => distribution?.base ?? 0
  const primary = () => undefined // charts fall back to the single-series colour
  const plain = (key: string) => (key === 'unknown' ? notGiven : key === 'other' ? t('admin.parentsReport.other') : key)

  const gender = slices(d.gender, labelOf('parent.profile'), (key) =>
    key === 'female' ? SERIES_COLORS[0] : key === 'male' ? SERIES_COLORS[1] : undefined,
  )
  const relationship = slices(d.relationship, labelOf('parent.profile'), (key) =>
    key === 'mother' ? SERIES_COLORS[0] : key === 'father' ? SERIES_COLORS[1] : key === 'guardian' ? SERIES_COLORS[2] : undefined,
  )
  const age = slices(d.age, labelOf('admin.parentsReport.ageBands'), primary)
  const state = slices(d.state, plain, primary)
  const children = slices(d.children, labelOf('admin.parentsReport.childCount'), primary, (key) =>
    key === 'other' ? t('admin.parentsReport.otherShort') : t(`admin.parentsReport.childShort.${key}`, { defaultValue: key }),
  )
  const schoolLevel = slices(d.school_level, labelOf('admin.parentsReport.level'), primary, (key) =>
    key === 'other' ? t('admin.parentsReport.otherShort') : t(`admin.parentsReport.levelShort.${key}`, { defaultValue: key }),
  )
  const income = slices(
    d.income,
    labelOf('parent.about.incomeOptions'),
    (key) => RAMP_COLORS[INCOME_ORDER.indexOf(key as (typeof INCOME_ORDER)[number])] ?? undefined,
    (key) => (key === 'not_answered' ? t('admin.parentsReport.noAnswerShort') : key === 'other' ? t('admin.parentsReport.otherShort') : t(`admin.parentsReport.incomeShort.${key}`, { defaultValue: key })),
  )
  const field = slices(d.working_field, labelOf('parent.about.fieldOptions'), primary)
  const profession = slices(d.profession, plain, primary)

  const heading = (title: string) => (
    <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
  )

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        {heading(t('admin.parentsReport.sectionWho'))}
        <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title={t('admin.parentsReport.gender')}>
            <DonutChart slices={gender} base={base(d.gender)} minGroup={min} caption={t('admin.parentsReport.gender')} />
          </ChartCard>
          <ChartCard title={t('admin.parentsReport.relationship')}>
            <StackedBar
              slices={relationship}
              base={base(d.relationship)}
              minGroup={min}
              caption={t('admin.parentsReport.relationship')}
            />
          </ChartCard>
          <ChartCard title={t('admin.parentsReport.age')} note={t('admin.parentsReport.ageNote')}>
            <ColumnChart slices={age} base={base(d.age)} minGroup={min} caption={t('admin.parentsReport.age')} />
          </ChartCard>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        {heading(t('admin.parentsReport.sectionWhere'))}
        <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard
            title={t('admin.parentsReport.state')}
            note={t('admin.parentsReport.stateNote')}
            className="md:row-span-2"
          >
            <RankedBars slices={state} base={base(d.state)} minGroup={min} caption={t('admin.parentsReport.state')} />
          </ChartCard>
          <ChartCard title={t('admin.parentsReport.schoolLevel')} className="xl:col-span-2">
            <ColumnChart
              slices={schoolLevel}
              base={base(d.school_level)}
              minGroup={min}
              caption={t('admin.parentsReport.schoolLevel')}
            />
          </ChartCard>
          <ChartCard title={t('admin.parentsReport.children')} className="xl:col-span-2">
            <ColumnChart
              slices={children}
              base={base(d.children)}
              minGroup={min}
              caption={t('admin.parentsReport.children')}
              height={112}
            />
          </ChartCard>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        {heading(t('admin.parentsReport.sectionWork'))}
        <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title={t('admin.parentsReport.income')} note={t('admin.parentsReport.incomeNote')}>
            <ColumnChart
              slices={income}
              base={base(d.income)}
              minGroup={min}
              caption={t('admin.parentsReport.income')}
              height={300}
            />
          </ChartCard>
          <ChartCard title={t('admin.parentsReport.workingField')}>
            <RankedBars
              slices={field}
              base={base(d.working_field)}
              minGroup={min}
              caption={t('admin.parentsReport.workingField')}
            />
          </ChartCard>
          <ChartCard
            title={t('admin.parentsReport.profession')}
            note={
              d.profession?.hidden_titles
                ? t('admin.parentsReport.professionNote', { count: d.profession.hidden_titles, min })
                : undefined
            }
          >
            <RankedBars
              slices={profession}
              base={base(d.profession)}
              minGroup={min}
              caption={t('admin.parentsReport.profession')}
            />
          </ChartCard>
        </div>
      </section>
    </div>
  )
}
