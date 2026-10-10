import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ms', label: 'BM' },
] as const

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = LANGUAGES.some((l) => l.code === i18n.language) ? i18n.language : 'en'

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex h-6 items-stretch rounded-full border p-0.5 text-xs"
    >
      {LANGUAGES.map((lng) => (
        <button
          key={lng.code}
          type="button"
          aria-pressed={current === lng.code}
          onClick={() => i18n.changeLanguage(lng.code)}
          className={cn(
            'inline-flex items-center rounded-full px-2 font-medium transition-colors',
            current === lng.code
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {lng.label}
        </button>
      ))}
    </div>
  )
}
