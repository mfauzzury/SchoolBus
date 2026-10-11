import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DistributionCard } from '@/components/admin/DistributionCard'
import { useOperatorOptions, useParentReport } from '@/hooks/useAdmin'

const ALL = 'all'

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

  const notGiven = t('admin.parentsReport.notGiven')
  const withKey = (prefix: string, fallback = notGiven) => (key: string) =>
    key === 'unknown' || key === 'not_answered'
      ? key === 'unknown'
        ? notGiven
        : t('admin.parentsReport.notAnswered')
      : key === 'other'
        ? t('admin.parentsReport.other')
        : t(`${prefix}.${key}`, { defaultValue: fallback })

  const plain = (key: string) =>
    key === 'unknown' ? notGiven : key === 'other' ? t('admin.parentsReport.other') : key

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

  const d = report.distributions
  const answeredPercent =
    report.total_parents > 0 ? Math.round((report.answered_about / report.total_parents) * 100) : 0
  const min = report.min_group

  const card = (
    title: string,
    key: keyof typeof d,
    labelFor: (key: string) => string,
    note?: string,
  ) => (
    <DistributionCard title={title} distribution={d[key]} labelFor={labelFor} minGroup={min} note={note} />
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium">{t('admin.parentsReport.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.parentsReport.intro', { count: min })}</p>
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t('admin.parentsReport.totalParents')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{report.total_parents.toLocaleString('en-MY')}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">{t('admin.parentsReport.answered')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-0.5">
            <span className="text-2xl font-medium">{answeredPercent}%</span>
            <span className="text-xs text-muted-foreground">
              {t('admin.parentsReport.answeredOf', { done: report.answered_about, total: report.total_parents })}
            </span>
          </CardContent>
        </Card>
      </div>

      {!report.enough_data ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('admin.parentsReport.notEnough', { count: min })}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Section title={t('admin.parentsReport.sectionWho')}>
            {card(t('admin.parentsReport.gender'), 'gender', withKey('parent.profile'))}
            {card(t('admin.parentsReport.relationship'), 'relationship', withKey('parent.profile'))}
            {card(
              t('admin.parentsReport.age'),
              'age',
              withKey('admin.parentsReport.ageBands'),
              t('admin.parentsReport.ageNote'),
            )}
          </Section>

          <Section title={t('admin.parentsReport.sectionWhere')}>
            {card(
              t('admin.parentsReport.state'),
              'state',
              plain,
              t('admin.parentsReport.stateNote'),
            )}
          </Section>

          <Section title={t('admin.parentsReport.sectionFamily')}>
            {card(t('admin.parentsReport.children'), 'children', withKey('admin.parentsReport.childCount'))}
            {card(t('admin.parentsReport.schoolLevel'), 'school_level', withKey('admin.parentsReport.level'))}
          </Section>

          <Section title={t('admin.parentsReport.sectionWork')}>
            {card(t('admin.parentsReport.income'), 'income', withKey('parent.about.incomeOptions'))}
            {card(t('admin.parentsReport.workingField'), 'working_field', withKey('parent.about.fieldOptions'))}
            {card(
              t('admin.parentsReport.profession'),
              'profession',
              plain,
              d.profession?.hidden_titles
                ? t('admin.parentsReport.professionNote', { count: d.profession.hidden_titles, min })
                : undefined,
            )}
          </Section>
        </>
      )}

      <p className="text-xs text-muted-foreground">{t('admin.parentsReport.privacy', { count: min })}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  )
}
