import { Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light theme' },
  { value: 'dark', icon: Moon, label: 'Dark theme' },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div role="group" aria-label="Theme" className="inline-flex h-6 items-stretch rounded-full border p-0.5 text-sm">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={theme === opt.value}
          aria-label={opt.label}
          onClick={() => setTheme(opt.value)}
          className={cn(
            'inline-flex items-center rounded-full px-1.5 transition-colors',
            theme === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <opt.icon className="size-3.5" />
        </button>
      ))}
    </div>
  )
}
