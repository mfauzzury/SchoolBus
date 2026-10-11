import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BackLink } from '@/components/BackLink'
import { useHandleInboxMessage, useInboxMessage, useReopenInboxMessage } from '@/hooks/useAdmin'
import { whatsappLink } from '@/lib/contact'
import { cn } from '@/lib/utils'

export function AdminInboxMessage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const messageId = Number(id)
  const { data: message, isLoading } = useInboxMessage(messageId)
  const handle = useHandleInboxMessage()
  const reopen = useReopenInboxMessage()

  if (isLoading || !message) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  const locale = i18n.language === 'ms' ? 'ms-MY' : 'en-MY'
  const whatsapp = message.phone ? whatsappLink(message.phone) : null
  const subject = encodeURIComponent(t('admin.inbox.replySubject'))
  const quoted = encodeURIComponent(`\n\n> ${message.message.replace(/\n/g, '\n> ')}`)

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/admin/inbox">{t('admin.inbox.back')}</BackLink>

      <Card className="max-w-2xl">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{message.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date(message.created_at).toLocaleString(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
          {message.handled_at ? (
            <Badge variant="success">
              {message.handler
                ? t('admin.inbox.handledBy', { name: message.handler.name })
                : t('admin.inbox.handledBadge')}
            </Badge>
          ) : (
            <Badge variant="info">{t('admin.inbox.openBadge')}</Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="text-sm whitespace-pre-wrap">{message.message}</p>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{t('admin.team.email')}</dt>
              <dd>{message.email}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{t('admin.operatorDetail.company.phone')}</dt>
              <dd>{message.phone || '—'}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <a
              href={`mailto:${message.email}?subject=${subject}&body=${quoted}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              {t('admin.inbox.replyEmail')}
            </a>
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                {t('admin.inbox.replyWhatsapp')}
              </a>
            )}
            {message.handled_at ? (
              <Button
                size="sm"
                variant="outline"
                disabled={reopen.isPending}
                onClick={() => reopen.mutate(message.id)}
              >
                {t('admin.inbox.reopen')}
              </Button>
            ) : (
              <Button size="sm" disabled={handle.isPending} onClick={() => handle.mutate(message.id)}>
                {t('admin.inbox.markHandled')}
              </Button>
            )}
          </div>

          {(handle.isError || reopen.isError) && (
            <p role="alert" className="text-sm text-destructive">
              {t('admin.team.error')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
