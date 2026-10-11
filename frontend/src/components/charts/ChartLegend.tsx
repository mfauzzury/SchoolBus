import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { NEUTRAL_COLOR, percentOf, type Slice } from './types'

/**
 * The key to a chart, with each group's number beside it, so the chart never
 * depends on colour alone (and a pale series is still readable).
 */
export function ChartLegend({
  slices,
  base,
  minGroup,
  active,
  onActive,
}: {
  slices: Slice[]
  base: number
  minGroup: number
  active?: string | null
  onActive?: (key: string | null) => void
}) {
  const { t } = useTranslation()

  return (
    <ul className="flex flex-col gap-1">
      {slices.map((slice) => (
        <li
          key={slice.key}
          onPointerEnter={() => onActive?.(slice.key)}
          onPointerLeave={() => onActive?.(null)}
          className={cn(
            'flex items-center justify-between gap-3 rounded-md px-1.5 py-0.5 text-sm transition-colors',
            active === slice.key && 'bg-muted',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: slice.count === null ? NEUTRAL_COLOR : (slice.color ?? 'var(--viz-primary)') }}
            />
            <span className="truncate">{slice.label}</span>
          </span>
          <span className="shrink-0 text-muted-foreground tabular-nums">
            {slice.count === null
              ? t('admin.parentsReport.fewerThan', { count: minGroup })
              : `${slice.count.toLocaleString('en-MY')} · ${percentOf(slice.count, base)}%`}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** The same numbers as a table, for screen readers and anyone who cannot hover. */
export function ChartTable({
  caption,
  slices,
  base,
  minGroup,
}: {
  caption: string
  slices: Slice[]
  base: number
  minGroup: number
}) {
  const { t } = useTranslation()

  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <tbody>
          {slices.map((slice) => (
            <tr key={slice.key}>
              <th scope="row">{slice.label}</th>
              <td>
                {slice.count === null
                  ? t('admin.parentsReport.fewerThan', { count: minGroup })
                  : `${slice.count} (${percentOf(slice.count, base)}%)`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
