import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAnnouncements, useDeleteAnnouncement } from '@/hooks/useAdmin'
import { cn } from '@/lib/utils'
import type { Announcement } from '@/api/admin'

const statusVariant: Record<Announcement['status'], 'success' | 'info' | 'outline'> = {
  live: 'success',
  scheduled: 'info',
  ended: 'outline',
}

export function AdminAnnouncements() {
  const { t, i18n } = useTranslation()
  const { data: announcements, isLoading } = useAnnouncements()
  const remove = useDeleteAnnouncement()

  const day = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language === 'ms' ? 'ms-MY' : 'en-MY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const period = (a: Announcement) => {
    if (a.starts_at && a.ends_at) return `${day(a.starts_at)} – ${day(a.ends_at)}`
    if (a.starts_at) return t('admin.announcements.from', { date: day(a.starts_at) })
    if (a.ends_at) return t('admin.announcements.until', { date: day(a.ends_at) })
    return t('admin.announcements.untilRemoved')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-medium">{t('admin.announcements.title')}</h1>
        <Link to="/admin/announcements/new" className={cn(buttonVariants())}>
          {t('admin.announcements.add')}
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">{t('admin.announcements.intro')}</p>

      <Card>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : announcements?.length ? (
            <ul className="flex flex-col divide-y">
              {announcements.map((announcement) => (
                <li
                  key={announcement.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{announcement.title}</span>
                      <Badge variant={statusVariant[announcement.status]}>
                        {t(`admin.announcements.status.${announcement.status}`)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{announcement.body}</p>
                    <p className="text-xs text-muted-foreground">{period(announcement)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/admin/announcements/${announcement.id}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      {t('common.edit')}
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button type="button" variant="outline" size="sm">
                            {t('common.delete')}
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t('admin.announcements.deleteConfirm', { title: announcement.title })}
                          </AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(announcement.id)}>
                            {t('common.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('admin.announcements.empty')}</p>
          )}
          {remove.isError && (
            <p role="alert" className="text-sm text-destructive">
              {t('admin.team.error')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
