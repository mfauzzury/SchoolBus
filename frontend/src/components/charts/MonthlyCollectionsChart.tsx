import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LedgerInvoice } from '@/api/finances'
import { cn, formatMoney } from '@/lib/utils'

type SeriesKey = 'collected' | 'pending' | 'overdue'

// Bottom of the stack first. Colours are the --viz-* tokens in index.css.
const SERIES: SeriesKey[] = ['collected', 'pending', 'overdue']

interface MonthBucket {
  key: string
  label: string
  /** Axis label, split over two lines so six months still fit at phone width. */
  month: string
  year: string
  collected: number
  pending: number
  overdue: number
  total: number
}

const MAX_MONTHS = 6
const GRID_STEPS = 4

/** Round a max value up to a "nice" axis ceiling (1, 2, 2.5, 5, 10 × 10^n). */
function niceCeil(value: number): number {
  if (value <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(value)))
  const f = value / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nice * exp
}

function compactMoney(value: number): string {
  if (value >= 1000) {
    const k = value / 1000
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`
  }
  return String(value)
}

// Mirrors the backend: 'overdue' is never stored, it is an issued invoice past its due
// date. Drafts count as awaiting payment so the three series add up to the dashboard's
// Total Collected / Total Outstanding tiles.
function isOverdue(inv: LedgerInvoice, today: string): boolean {
  return inv.status === 'overdue' || (inv.status === 'issued' && inv.due_date.slice(0, 10) < today)
}

function bucketByMonth(invoices: LedgerInvoice[], language: string): MonthBucket[] {
  const map = new Map<string, MonthBucket>()
  const today = new Date().toLocaleDateString('en-CA')
  for (const inv of invoices) {
    const key = inv.period_start.slice(0, 7)
    let bucket = map.get(key)
    if (!bucket) {
      const locale = language === 'ms' ? 'ms-MY' : 'en-MY'
      const date = new Date(`${key}-01T00:00:00`)
      const label = date.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
      const month = date.toLocaleDateString(locale, { month: 'short' })
      const year = String(date.getFullYear())
      bucket = { key, label, month, year, collected: 0, pending: 0, overdue: 0, total: 0 }
      map.set(key, bucket)
    }
    const amount = Number(inv.final_amount)
    if (inv.status === 'paid') bucket.collected += amount
    else if (isOverdue(inv, today)) bucket.overdue += amount
    else bucket.pending += amount
    bucket.total += amount
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-MAX_MONTHS)
}

export function MonthlyCollectionsChart({ invoices }: { invoices: LedgerInvoice[] }) {
  const { t, i18n } = useTranslation()
  const [active, setActive] = useState<number | null>(null)

  const months = bucketByMonth(invoices, i18n.language)
  if (months.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {t('operator.dashboard.charts.empty')}
      </p>
    )
  }

  const max = niceCeil(Math.max(...months.map((m) => m.total)))
  const ticks = Array.from({ length: GRID_STEPS + 1 }, (_, i) => (max / GRID_STEPS) * i)

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SERIES.map((key) => (
          <li key={key} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: `var(--viz-${key})` }}
            />
            {t(`operator.dashboard.charts.series.${key}`)}
          </li>
        ))}
      </ul>

      <div className="flex gap-3 pt-3" onPointerLeave={() => setActive(null)}>
        {/* y axis */}
        <div className="relative h-56 w-10 shrink-0 text-xs text-muted-foreground" aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2 leading-none"
              style={{ bottom: `${(tick / max) * 100}%` }}
            >
              {compactMoney(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-56">
            {ticks.map((tick) => (
              <div
                key={tick}
                className={cn(
                  'absolute inset-x-0 border-t',
                  tick === 0 ? 'border-foreground/25' : 'border-border',
                )}
                style={{ bottom: `${(tick / max) * 100}%` }}
              />
            ))}

            <div className="absolute inset-0 flex">
              {months.map((m, i) => {
                const present = SERIES.filter((s) => m[s] > 0)
                const dimmed = active !== null && active !== i
                return (
                  <div
                    key={m.key}
                    tabIndex={0}
                    role="img"
                    aria-label={`${m.label}: ${SERIES.map(
                      (s) =>
                        `${t(`operator.dashboard.charts.series.${s}`)} RM ${formatMoney(m[s])}`,
                    ).join(', ')}`}
                    className="relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  >
                    <div
                      className={cn(
                        'flex w-full max-w-6 flex-col-reverse gap-0.5 transition-opacity',
                        dimmed && 'opacity-50',
                      )}
                      style={{ height: `${(m.total / max) * 100}%` }}
                    >
                      {present.map((s, idx) => (
                        <div
                          key={s}
                          className={cn(idx === present.length - 1 && 'rounded-t-[4px]')}
                          style={{
                            flex: `${m[s]} 1 0`,
                            minHeight: 0,
                            backgroundColor: `var(--viz-${s})`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {active !== null && months[active] && (
              <div
                // Narrower on phones so it can sit beside the hovered bar instead of over it.
                className="pointer-events-none absolute top-0 z-10 w-(--tip-w) max-w-full rounded-lg border bg-popover p-3 text-xs shadow-md [--tip-w:10.5rem] sm:[--tip-w:15rem]"
                style={
                  active < months.length / 2
                    ? {
                        left: `clamp(0%, ${((active + 1) / months.length) * 100}%, calc(100% - var(--tip-w)))`,
                      }
                    : {
                        right: `clamp(0%, ${((months.length - active) / months.length) * 100}%, calc(100% - var(--tip-w)))`,
                      }
                }
              >
                <p className="mb-2 font-medium text-foreground">{months[active].label}</p>
                <ul className="flex flex-col gap-1.5">
                  {SERIES.map((s) => (
                    <li
                      key={s}
                      className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                        <span
                          className="h-0.5 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: `var(--viz-${s})` }}
                        />
                        {t(`operator.dashboard.charts.series.${s}`)}
                      </span>
                      <span className="font-medium whitespace-nowrap text-foreground tabular-nums">
                        RM {formatMoney(months[active][s])}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-2 flex text-xs text-muted-foreground" aria-hidden>
            {months.map((m) => (
              <span key={m.key} className="min-w-0 flex-1 text-center leading-tight">
                <span className="block whitespace-nowrap">{m.month}</span>
                <span className="block text-[10px] opacity-70">{m.year}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Table view: the same numbers for screen readers and anyone who can't hover.
          The sr-only clip sits on a wrapper div, not the <table>: browsers (Safari in
          particular) let a table's <caption> escape the table's own clipping and paint
          over the legend. */}
      <div className="sr-only">
        <table>
          <caption>{t('operator.dashboard.charts.collectionsTitle')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('operator.dashboard.charts.month')}</th>
              {SERIES.map((s) => (
                <th key={s} scope="col">
                  {t(`operator.dashboard.charts.series.${s}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key}>
                <th scope="row">{m.label}</th>
                {SERIES.map((s) => (
                  <td key={s}>RM {formatMoney(m[s])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
