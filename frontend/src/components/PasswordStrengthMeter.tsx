import { Check, Circle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getPasswordStrength, type StrengthScore } from '@/lib/passwordStrength'
import { cn } from '@/lib/utils'

const LABEL_KEYS: Record<StrengthScore, string> = {
  0: 'tooShort',
  1: 'weak',
  2: 'fair',
  3: 'good',
  4: 'strong',
}

const BAR_COLORS: Record<StrengthScore, string> = {
  0: 'bg-red-500',
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-green-500',
}

const TEXT_COLORS: Record<StrengthScore, string> = {
  0: 'text-red-600 dark:text-red-400',
  1: 'text-red-600 dark:text-red-400',
  2: 'text-orange-600 dark:text-orange-400',
  3: 'text-yellow-600 dark:text-yellow-400',
  4: 'text-green-600 dark:text-green-400',
}

/**
 * Live feedback under a "new password" field: the three hard requirements as a
 * checklist, plus a four-segment strength bar once the user starts typing.
 */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const { t } = useTranslation()
  const { score, checks } = getPasswordStrength(password)
  const typing = password.length > 0
  const filled = Math.max(score, 1)

  const rules = [
    { ok: checks.length, label: t('auth.password.rules.length') },
    { ok: checks.letter, label: t('auth.password.rules.letter') },
    { ok: checks.number, label: t('auth.password.rules.number') },
  ]

  return (
    <div className="flex flex-col gap-2">
      {typing && (
        <div className="flex flex-col gap-1">
          <div className="flex gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map((segment) => (
              <div
                key={segment}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  segment <= filled ? BAR_COLORS[score] : 'bg-muted',
                )}
              />
            ))}
          </div>
          <p className="text-xs" aria-live="polite">
            <span className="text-muted-foreground">{t('auth.password.strength.label')}: </span>
            <span className={cn('font-medium', TEXT_COLORS[score])}>
              {t(`auth.password.strength.${LABEL_KEYS[score]}`)}
            </span>
          </p>
        </div>
      )}

      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={cn(
              'flex items-center gap-1',
              rule.ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
            )}
          >
            {rule.ok ? <Check className="size-3" /> : <Circle className="size-3" />}
            {rule.label}
          </li>
        ))}
      </ul>

      {!typing && <p className="text-xs text-muted-foreground">{t('auth.password.tip')}</p>}
    </div>
  )
}
