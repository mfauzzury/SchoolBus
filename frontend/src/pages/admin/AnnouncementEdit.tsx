import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BackLink } from '@/components/BackLink'
import { useAnnouncements, useSaveAnnouncement } from '@/hooks/useAdmin'
import { fromLocalInput, toLocalInput } from '@/lib/contact'
import type { Announcement } from '@/api/admin'

export function AdminAnnouncementEdit() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data: announcements, isLoading } = useAnnouncements()
  const announcement = id ? announcements?.find((a) => a.id === Number(id)) : undefined

  if (id && isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }
  if (id && !announcement) {
    return <p className="text-sm text-muted-foreground">{t('admin.announcements.notFound')}</p>
  }

  return <AnnouncementForm announcement={announcement} />
}

// Separate component so the inputs start from the loaded announcement, not from empty.
function AnnouncementForm({ announcement }: { announcement?: Announcement }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const save = useSaveAnnouncement(announcement?.id)

  const [title, setTitle] = useState(announcement?.title ?? '')
  const [body, setBody] = useState(announcement?.body ?? '')
  const [titleMs, setTitleMs] = useState(announcement?.title_ms ?? '')
  const [bodyMs, setBodyMs] = useState(announcement?.body_ms ?? '')
  const [startsAt, setStartsAt] = useState(toLocalInput(announcement?.starts_at ?? null))
  const [endsAt, setEndsAt] = useState(toLocalInput(announcement?.ends_at ?? null))

  const endBeforeStart = Boolean(startsAt && endsAt && new Date(endsAt) <= new Date(startsAt))

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    save.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        title_ms: titleMs.trim() || null,
        body_ms: bodyMs.trim() || null,
        starts_at: fromLocalInput(startsAt),
        ends_at: fromLocalInput(endsAt),
      },
      { onSuccess: () => navigate('/admin/announcements') },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/admin/announcements">{t('admin.announcements.back')}</BackLink>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>
            {announcement ? t('admin.announcements.editTitle') : t('admin.announcements.add')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('admin.announcements.formHelp')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann_title">{t('admin.announcements.titleEn')}</Label>
              <Input
                id="ann_title"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann_body">{t('admin.announcements.bodyEn')}</Label>
              <Textarea
                id="ann_body"
                value={body}
                maxLength={500}
                onChange={(e) => setBody(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">{body.length} / 500</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann_title_ms">{t('admin.announcements.titleMs')}</Label>
              <Input
                id="ann_title_ms"
                value={titleMs}
                maxLength={120}
                onChange={(e) => setTitleMs(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann_body_ms">{t('admin.announcements.bodyMs')}</Label>
              <Textarea
                id="ann_body_ms"
                value={bodyMs}
                maxLength={500}
                onChange={(e) => setBodyMs(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('admin.announcements.msHelp')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ann_start">{t('admin.announcements.startsAt')}</Label>
                <Input
                  id="ann_start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t('admin.announcements.startHelp')}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ann_end">{t('admin.announcements.endsAt')}</Label>
                <Input
                  id="ann_end"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t('admin.announcements.endHelp')}</p>
              </div>
            </div>

            {endBeforeStart && (
              <p role="alert" className="text-sm text-destructive">
                {t('admin.announcements.endBeforeStart')}
              </p>
            )}
            {save.isError && (
              <p role="alert" className="text-sm text-destructive">
                {t('admin.team.error')}
              </p>
            )}

            <Button
              type="submit"
              className="w-fit"
              disabled={save.isPending || !title.trim() || !body.trim() || endBeforeStart}
            >
              {save.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
