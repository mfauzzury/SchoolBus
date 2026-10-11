import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Megaphone, X } from 'lucide-react'
import { useActiveAnnouncements } from '@/hooks/useAnnouncements'

const STORAGE_KEY = 'dismissed-announcements'

function readDismissed(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : []
  } catch {
    return []
  }
}

/** Platform notices for operators. Each can be closed; closing is remembered on this device. */
export function AnnouncementBanner() {
  const { i18n, t } = useTranslation()
  const { data: announcements } = useActiveAnnouncements()
  const [dismissed, setDismissed] = useState<number[]>(readDismissed)

  const visible = (announcements ?? []).filter((a) => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  const close = (id: number) => {
    const next = [...dismissed, id]
    setDismissed(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Private mode etc.: it simply comes back on reload.
    }
  }

  const ms = i18n.language === 'ms'

  return (
    <div className="flex flex-col">
      {visible.map((announcement) => (
        <div
          key={announcement.id}
          role="status"
          className="flex items-start gap-3 bg-sky-100 px-4 py-2 text-sm text-sky-950 dark:bg-sky-950 dark:text-sky-100"
        >
          <Megaphone className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            <span className="font-medium">
              {(ms && announcement.title_ms) || announcement.title}
            </span>{' '}
            {(ms && announcement.body_ms) || announcement.body}
          </p>
          <button
            type="button"
            onClick={() => close(announcement.id)}
            aria-label={t('common.close')}
            className="shrink-0 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
