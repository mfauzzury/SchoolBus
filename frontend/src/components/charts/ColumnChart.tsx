import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { niceAxis } from '@/lib/chart'
import { cn } from '@/lib/utils'
import { ChartTable } from './ChartLegend'
import { percentOf, type Slice } from './types'

/**
 * Ordered groups left to right (age bands, school years, income bands): the
 * shape of the distribution is the point. A group too small to show is drawn
 * as an empty dashed slot, so the order still reads.
 */
export function ColumnChart({
  slices,
  base,
  minGroup,
  caption,
  height = 144,
}: {
  slices: Slice[]
  base: number
  minGroup: number
  caption: string
  height?: number
}) {
  const { t } = useTranslation()
  const [active, setActive] = useState<number | null>(null)

  const peak = Math.max(0, ...slices.map((slice) => slice.count ?? 0))
  const { ceiling, ticks } = niceAxis(peak, 4, 1)
  const focus = active !== null ? slices[active] : null

  return (
    <div className="flex flex-col gap-2" onPointerLeave={() => setActive(null)}>
      <div className="flex gap-2 pt-1">
        <div className="relative w-8 shrink-0 text-xs text-muted-foreground" style={{ height }} aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2 leading-none"
              style={{ bottom: `${(tick / ceiling) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {ticks.map((tick) => (
              <div
                key={tick}
                className={cn('absolute inset-x-0 border-t', tick === 0 ? 'border-foreground/25' : 'border-border')}
                style={{ bottom: `${(tick / ceiling) * 100}%` }}
              />
            ))}

            <div className="absolute inset-0 flex">
              {slices.map((slice, index) => (
                <div
                  key={slice.key}
                  tabIndex={0}
                  role="img"
                  aria-label={`${slice.label}: ${
                    slice.count === null
                      ? t('admin.parentsReport.fewerThan', { count: minGroup })
                      : `${slice.count} (${percentOf(slice.count, base)}%)`
                  }`}
                  className="relative flex h-full min-w-0 flex-1 items-end justify-center outline-none focus-visible:bg-muted/50"
                  onPointerEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                >
                  {slice.count === null ? (
                    <div className="h-3 w-full max-w-6 rounded-t-[4px] border border-dashed border-muted-foreground/50" />
                  ) : (
                    <div
                      className={cn(
                        'w-full max-w-6 rounded-t-[4px] transition-opacity',
                        active !== null && active !== index && 'opacity-50',
                      )}
                      style={{
                        height: `${(slice.count / ceiling) * 100}%`,
                        backgroundColor: slice.color ?? 'var(--viz-primary)',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {focus && active !== null && (
              <div
                className="pointer-events-none absolute top-0 z-10 w-36 rounded-lg border bg-popover p-2 text-xs shadow-md"
                style={{
                  left: `clamp(0px, calc(${((active + 0.5) / slices.length) * 100}% - 4.5rem), calc(100% - 9rem))`,
                }}
              >
                <p className="text-muted-foreground">{focus.label}</p>
                <p className="font-medium text-foreground tabular-nums">
                  {focus.count === null
                    ? t('admin.parentsReport.fewerThan', { count: minGroup })
                    : `${focus.count.toLocaleString('en-MY')} · ${percentOf(focus.count, base)}%`}
                </p>
              </div>
            )}
          </div>

          <div className="mt-1.5 flex text-[11px] leading-tight text-muted-foreground" aria-hidden>
            {slices.map((slice) => (
              <span key={slice.key} className="min-w-0 flex-1 truncate text-center" title={slice.label}>
                {slice.short ?? slice.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ChartTable caption={caption} slices={slices} base={base} minGroup={minGroup} />
    </div>
  )
}
