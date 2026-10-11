import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { completionPercent, type ProfileItem } from '@/lib/profileCompleteness'

/**
 * "Your company profile is 64% complete": a bar, a friendly line, and one tap
 * per missing item that jumps to the right field. Reaching 100% turns it green.
 */
export function ProfileCompleteness({ items }: { items: ProfileItem[] }) {
  const { t } = useTranslation()
  const percent = completionPercent(items)
  const missing = items.filter((item) => !item.done)
  const complete = missing.length === 0

  const jumpTo = (targetId: string) => {
    const element = document.getElementById(targetId)
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element?.focus({ preventScroll: true })
  }

  return (
    <Card className={cn(complete && 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30')}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-medium">
            {complete && <CheckCircle2 className="size-5 text-green-600" aria-hidden />}
            {complete
              ? t('operator.settings.completeness.titleDone')
              : t('operator.settings.completeness.title', { percent })}
          </p>
          <span className="text-sm font-medium tabular-nums">{percent}%</span>
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={t('operator.settings.completeness.title', { percent })}
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              complete ? 'bg-green-500' : 'bg-primary',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        {complete ? (
          <p className="text-sm text-muted-foreground">{t('operator.settings.completeness.done')}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {percent < 60
                ? t('operator.settings.completeness.hintLow')
                : t('operator.settings.completeness.hintHigh', { count: missing.length })}
            </p>
            <ul className="flex flex-wrap gap-2">
              {missing.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => jumpTo(item.targetId)}
                    className="rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
                  >
                    + {t(`operator.settings.completeness.items.${item.key}`)}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
