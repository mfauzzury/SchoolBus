import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { UserRoundCheck } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useMe } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const SNOOZE_KEY = 'about-nudge-until'
const SNOOZE_DAYS = 7

function snoozedNow(): boolean {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now()
  } catch {
    return false
  }
}

/**
 * A gentle "complete your profile" prompt until the parent has seen the About
 * form once. "Not now" hides it for a week; saving the form hides it for good.
 */
export function ProfileNudge() {
  const { t } = useTranslation()
  const { data } = useMe()
  const [snoozed, setSnoozed] = useState(snoozedNow)

  const profile = data?.parentProfile
  if (!profile || profile.about_saved_at || snoozed) return null

  const later = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000))
    } catch {
      // Private mode etc.: it simply comes back next visit.
    }
    setSnoozed(true)
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UserRoundCheck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{t('parent.about.nudgeTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('parent.about.nudgeBody')}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link to="/parent/profile?tab=about" className={cn(buttonVariants({ size: 'sm' }))}>
            {t('parent.about.nudgeCta')}
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={later}>
            {t('parent.about.nudgeLater')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
