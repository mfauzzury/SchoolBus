import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { compactMoney, niceAxis } from '@/lib/chart'
import { cn } from '@/lib/utils'

export interface MonthPoint {
  /** 'YYYY-MM' */
  month: string
  value: number
}

/**
 * One measure across months as columns — a single series, so one colour and no
 * legend (the card title says what is plotted). Hover or focus a column for the
 * exact value; a screen-reader table carries the same numbers.
 *
 * `kind="money"` formats RM; `kind="count"` keeps whole-number gridlines.
 */
export function MonthlyBarChart({
  points,
  kind,
  label,
  tall = false,
}: {
  points: MonthPoint[]
  kind: 'money' | 'count'
  /** What the numbers are, e.g. "Money collected": names the table view. */
  label: string
  /** A taller plot, for when the card sits beside something taller than the default chart. */
  tall?: boolean
}) {
  const { t, i18n } = useTranslation()
  const [active, setActive] = useState<number | null>(null)

  const locale = i18n.language === 'ms' ? 'ms-MY' : 'en-MY'
  const format = (value: number) =>
    kind === 'money'
      ? `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : value.toLocaleString(locale)

  const months = points.map((point) => {
    const date = new Date(`${point.month}-01T00:00:00`)
    return {
      ...point,
      full: date.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
      short: date.toLocaleDateString(locale, { month: 'short' }),
      year: String(date.getFullYear()),
    }
  })

  const peak = Math.max(0, ...months.map((m) => m.value))
  if (peak === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {t('admin.dashboard.charts.empty')}
      </p>
    )
  }

  const { ceiling, ticks } = niceAxis(peak, 5, kind === 'count' ? 1 : 0)
  const tickLabel = (tick: number) => (kind === 'money' ? compactMoney(tick) : String(tick))

  return (
    <div className="flex gap-3 pt-3" onPointerLeave={() => setActive(null)}>
      {/* y axis */}
      <div className={cn('relative w-10 shrink-0 text-xs text-muted-foreground', tall ? 'h-52' : 'h-32')} aria-hidden>
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute right-0 translate-y-1/2 leading-none"
            style={{ bottom: `${(tick / ceiling) * 100}%` }}
          >
            {tickLabel(tick)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className={cn('relative', tall ? 'h-52' : 'h-32')}>
          {ticks.map((tick) => (
            <div
              key={tick}
              className={cn(
                'absolute inset-x-0 border-t',
                tick === 0 ? 'border-foreground/25' : 'border-border',
              )}
              style={{ bottom: `${(tick / ceiling) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex">
            {months.map((m, i) => (
              <div
                key={m.month}
                tabIndex={0}
                role="img"
                aria-label={`${m.full}: ${format(m.value)}`}
                className="relative flex h-full min-w-0 flex-1 items-end justify-center outline-none focus-visible:bg-muted/50"
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <div
                  className={cn(
                    'w-full max-w-6 rounded-t-[4px] transition-opacity',
                    active !== null && active !== i && 'opacity-50',
                  )}
                  style={{
                    height: `${(m.value / ceiling) * 100}%`,
                    backgroundColor: 'var(--viz-primary)',
                  }}
                />
              </div>
            ))}
          </div>

          {active !== null && months[active] && (
            <div
              className="pointer-events-none absolute top-0 z-10 w-40 max-w-full rounded-lg border bg-popover p-2.5 text-xs shadow-md"
              style={
                active < months.length / 2
                  ? { left: `clamp(0%, ${((active + 1) / months.length) * 100}%, calc(100% - 10rem))` }
                  : {
                      right: `clamp(0%, ${((months.length - active) / months.length) * 100}%, calc(100% - 10rem))`,
                    }
              }
            >
              <p className="text-muted-foreground">{months[active].full}</p>
              <p className="font-medium text-foreground tabular-nums">{format(months[active].value)}</p>
            </div>
          )}
        </div>

        <div className="mt-2 flex text-xs text-muted-foreground" aria-hidden>
          {months.map((m) => (
            // Twelve labels don't fit a phone: keep every other one there (the column still has its tooltip).
            <span key={m.month} className="min-w-0 flex-1 text-center leading-tight max-sm:even:invisible">
              <span className="block whitespace-nowrap">{m.short}</span>
              <span className="block text-[10px] opacity-70">{m.year.slice(2)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Table view: the same numbers for screen readers and anyone who can't hover. */}
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">{t('operator.dashboard.charts.month')}</th>
              <th scope="col">{label}</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <th scope="row">{m.full}</th>
                <td>{format(m.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
