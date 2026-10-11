import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Distribution } from '@/api/admin'

/**
 * One breakdown as labelled bars. A group too small to show arrives with a null
 * count and is written as "fewer than 5", never as a number.
 */
export function DistributionCard({
  title,
  distribution,
  labelFor,
  minGroup,
  note,
}: {
  title: string
  distribution?: Distribution
  labelFor: (key: string) => string
  minGroup: number
  note?: string
}) {
  const { t } = useTranslation()
  const items = distribution?.items ?? []
  const base = distribution?.base ?? 0
  const largest = Math.max(1, ...items.map((item) => item.count ?? 0))

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('admin.parentsReport.nothing')}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((item) => {
              const percent = base > 0 && item.count !== null ? Math.round((item.count / base) * 100) : null

              return (
                <li key={item.key} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{labelFor(item.key)}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {item.count === null
                        ? t('admin.parentsReport.fewerThan', { count: minGroup })
                        : `${item.count.toLocaleString('en-MY')} · ${percent}%`}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                    {item.count !== null && (
                      <div
                        className="h-full rounded-[4px]"
                        style={{
                          width: `${(item.count / largest) * 100}%`,
                          backgroundColor: 'var(--viz-primary)',
                        }}
                      />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {note && <p className="pt-1 text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  )
}
