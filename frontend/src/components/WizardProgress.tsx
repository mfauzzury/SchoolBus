import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The numbered dots and "Step 2 of 5 · Contact" line at the top of a sign-up
 * wizard. Unlike Stepper (a clickable nav for long forms), this one only shows
 * where you are; the page's own Back and Next buttons do the moving.
 */
export function WizardProgress({
  labels,
  current,
  stepLabel,
}: {
  /** The name of each step, in order. */
  labels: string[]
  /** Zero-based index of the step being shown. */
  current: number
  /** Already translated, e.g. "Step 2 of 5". */
  stepLabel: string
}) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <ol className="flex items-center gap-2" aria-label={stepLabel}>
        {labels.map((label, index) => {
          const done = index < current
          const active = index === current
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className={cn('flex items-center gap-2', index > 0 && 'flex-1')}
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn('h-0.5 flex-1 rounded-full', index <= current ? 'bg-primary' : 'bg-border')}
                />
              )}
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                  (done || active) && 'border-primary bg-primary text-primary-foreground',
                  !done && !active && 'text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        {stepLabel}
        {' · '}
        <span className="font-medium text-foreground">{labels[current]}</span>
      </p>
    </div>
  )
}
