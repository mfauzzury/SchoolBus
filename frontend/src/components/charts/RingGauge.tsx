const SIZE = 84
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** One share of 100% (here: how many parents answered "About you"), as a ring. */
export function RingGauge({ percent, label }: { percent: number; label: string }) {
  const clamped = Math.min(100, Math.max(0, percent))

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={`${label}: ${clamped}%`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--viz-primary)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-medium tabular-nums">
        {clamped}%
      </span>
    </div>
  )
}
