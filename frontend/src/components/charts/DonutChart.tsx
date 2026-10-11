import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartLegend, ChartTable } from './ChartLegend'
import { percentOf, type Slice } from './types'

const SIZE = 132
const STROKE = 18
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 2 // surface gap between touching segments, in px

/**
 * A few groups that make up a whole (a handful, never many). The centre shows
 * the total, or the group you are pointing at.
 */
export function DonutChart({
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
  const [active, setActive] = useState<string | null>(null)

  const shown = slices.filter((slice) => slice.count !== null && slice.count > 0)
  const focus = slices.find((slice) => slice.key === active && slice.count !== null)

  let offset = 0
  const arcs = shown.map((slice) => {
    const length = ((slice.count ?? 0) / Math.max(base, 1)) * CIRCUMFERENCE
    const arc = { slice, length, offset }
    offset += length
    return arc
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={caption}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={STROKE}
          />
          {arcs.map(({ slice, length, offset: start }) => (
            <circle
              key={slice.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={slice.color ?? 'var(--viz-primary)'}
              strokeWidth={active === slice.key ? STROKE + 3 : STROKE}
              strokeDasharray={`${Math.max(length - GAP, 0.5)} ${CIRCUMFERENCE - Math.max(length - GAP, 0.5)}`}
              strokeDashoffset={-start}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              opacity={active && active !== slice.key ? 0.4 : 1}
              onPointerEnter={() => setActive(slice.key)}
              onPointerLeave={() => setActive(null)}
              className="transition-all"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {focus && focus.count !== null ? (
            <>
              <span className="text-xl leading-none font-medium tabular-nums">{percentOf(focus.count, base)}%</span>
              <span className="mt-1 line-clamp-2 text-[11px] leading-tight text-muted-foreground">{focus.label}</span>
            </>
          ) : (
            <>
              <span className="text-xl leading-none font-medium tabular-nums">{base.toLocaleString('en-MY')}</span>
              <span className="mt-1 text-[11px] text-muted-foreground">{t('admin.parentsReport.parentsUnit')}</span>
            </>
          )}
        </div>
      </div>

      <ChartLegend slices={slices} base={base} minGroup={minGroup} active={active} onActive={setActive} />
      <ChartTable caption={caption} slices={slices} base={base} minGroup={minGroup} />
    </div>
  )
}
