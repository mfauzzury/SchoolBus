import { useTranslation } from 'react-i18next'
import { ChartTable } from './ChartLegend'
import { percentOf, type Slice } from './types'

/** Many groups, biggest first, with names long enough that they need a row each. */
export function RankedBars({
  slices,
  base,
  minGroup,
  caption,
}: {
  slices: Slice[]
  base: number
  minGroup: number
  caption: string
}) {
  const { t } = useTranslation()
  const largest = Math.max(1, ...slices.map((slice) => slice.count ?? 0))

  if (slices.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('admin.parentsReport.nothing')}</p>
  }

  return (
    <div>
      <ul className="flex flex-col gap-2.5">
        {slices.map((slice) => (
          <li key={slice.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{slice.label}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {slice.count === null
                  ? t('admin.parentsReport.fewerThan', { count: minGroup })
                  : `${slice.count.toLocaleString('en-MY')} · ${percentOf(slice.count, base)}%`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              {slice.count !== null && (
                <div
                  className="h-full rounded-[4px]"
                  style={{
                    width: `${(slice.count / largest) * 100}%`,
                    backgroundColor: slice.color ?? 'var(--viz-primary)',
                  }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      <ChartTable caption={caption} slices={slices} base={base} minGroup={minGroup} />
    </div>
  )
}
