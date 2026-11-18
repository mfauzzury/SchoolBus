import { cn } from '@/lib/utils'

export interface BarRow {
  key: string
  label: string
  value: number
  /** "Not given" / "Other": drawn in the neutral colour, never a series colour. */
  neutral?: boolean
}

/**
 * Ranked horizontal bars: a name, a bar and the figure on each row, bars on one
 * baseline so close values can be compared. One measure, one hue, so no legend;
 * the card title says what is counted. Each figure is printed, so no hover is needed.
 */
export function BarList({ rows, label }: { rows: BarRow[]; label: string }) {
  const total = rows.reduce((sum, r) => sum + r.value, 0)
  const peak = Math.max(1, ...rows.map((r) => r.value))

  return (
    <ul className="flex flex-col gap-3" aria-label={label}>
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1">
          <span className="truncate text-sm" title={row.label}>
            {row.label}
          </span>
          <span className="text-sm font-medium tabular-nums">
            {row.value}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {total > 0 ? `${Math.round((row.value / total) * 100)}%` : ''}
            </span>
          </span>
          <div className="col-span-2 h-2 rounded-r-[4px] bg-muted/60" aria-hidden>
            <div
              className={cn('h-full rounded-r-[4px]')}
              style={{
                width: `${(row.value / peak) * 100}%`,
                backgroundColor: row.neutral ? 'var(--viz-neutral)' : 'var(--viz-primary)',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
