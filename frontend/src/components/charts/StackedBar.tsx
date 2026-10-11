import { useState } from 'react'
import { ChartLegend, ChartTable } from './ChartLegend'
import { cn } from '@/lib/utils'
import type { Slice } from './types'

/** One bar split into shares of 100%: the quickest way to read "how is this one thing divided". */
export function StackedBar({
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
  const [active, setActive] = useState<string | null>(null)
  const shown = slices.filter((slice) => slice.count !== null && slice.count > 0)

  return (
    <div className="flex flex-col gap-4">
      <div
        role="img"
        aria-label={caption}
        className="flex h-6 w-full gap-0.5 overflow-hidden rounded-md bg-muted"
        onPointerLeave={() => setActive(null)}
      >
        {shown.map((slice) => (
          <div
            key={slice.key}
            onPointerEnter={() => setActive(slice.key)}
            className={cn('h-full first:rounded-l-md last:rounded-r-md transition-opacity', active && active !== slice.key && 'opacity-40')}
            style={{
              width: `${((slice.count ?? 0) / Math.max(base, 1)) * 100}%`,
              backgroundColor: slice.color ?? 'var(--viz-primary)',
            }}
          />
        ))}
      </div>

      <ChartLegend slices={slices} base={base} minGroup={minGroup} active={active} onActive={setActive} />
      <ChartTable caption={caption} slices={slices} base={base} minGroup={minGroup} />
    </div>
  )
}
