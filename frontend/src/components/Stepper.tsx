import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export interface StepperStep {
  key: string
  label: string
}

/**
 * A row of numbered steps. Finished steps get a tick and can be tapped to go
 * back; steps you have not reached yet are greyed out (unless `canJumpTo`
 * says you may go straight there, as when editing something that already exists).
 * On a phone it collapses to "Step 2 of 5 · Stops" with a thin progress bar.
 */
export function Stepper({
  steps,
  current,
  canJumpTo,
  onStepClick,
}: {
  steps: StepperStep[]
  current: number
  canJumpTo: (index: number) => boolean
  onStepClick: (index: number) => void
}) {
  const { t } = useTranslation()

  return (
    <nav aria-label={t('stepper.label')}>
      {/* Phone */}
      <div className="flex flex-col gap-2 sm:hidden">
        <p className="text-sm font-medium">
          {t('stepper.stepOf', { current: current + 1, total: steps.length })}
          <span className="text-muted-foreground"> · {steps[current]?.label}</span>
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Tablet and up */}
      <ol className="hidden items-center sm:flex">
        {steps.map((step, index) => {
          const done = index < current
          const active = index === current
          const clickable = !active && canJumpTo(index)

          return (
            <li key={step.key} className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}>
              <button
                type="button"
                disabled={!clickable}
                aria-current={active ? 'step' : undefined}
                onClick={() => onStepClick(index)}
                className={cn(
                  'flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm transition-colors',
                  clickable && 'hover:bg-muted',
                  !clickable && !active && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                    active && 'border-primary bg-primary text-primary-foreground',
                    done && 'border-primary bg-primary/15 text-primary',
                    !active && !done && 'text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : index + 1}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap',
                    active ? 'font-medium' : done ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </button>
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn('mx-2 h-px min-w-4 flex-1', index < current ? 'bg-primary/50' : 'bg-border')}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
