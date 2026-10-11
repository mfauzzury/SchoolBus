import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSystemHealth } from '@/hooks/useAdmin'

export function AdminSystem() {
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useSystemHealth()

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  const when = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(i18n.language === 'ms' ? 'ms-MY' : 'en-MY', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : t('admin.system.never')

  const { billing, failed_jobs: failedJobs, environment } = data
  const mailNotSent = ['log', 'array'].includes(environment.mailer)
  const debugInProduction = environment.debug && environment.app_env === 'production'

  const billingBadge =
    billing.ok === null ? (
      <Badge variant="outline">{t('admin.system.notRunYet')}</Badge>
    ) : billing.ok ? (
      <Badge variant={billing.stale ? 'destructive' : 'success'}>
        {billing.stale ? t('admin.system.overdue') : t('admin.system.ok')}
      </Badge>
    ) : (
      <Badge variant="destructive">{t('admin.system.failed')}</Badge>
    )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">{t('admin.system.title')}</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{t('admin.system.billingTitle')}</CardTitle>
          {billingBadge}
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>{t('admin.system.lastRan', { when: when(billing.ran_at) })}</p>
          {billing.ok && (
            <p className="text-muted-foreground">
              {t('admin.system.billingResult', {
                generated: billing.generated ?? 0,
                skipped: billing.skipped ?? 0,
              })}
            </p>
          )}
          {billing.ok === false && billing.message && (
            <p className="text-destructive">{billing.message}</p>
          )}
          {billing.stale && <p className="text-destructive">{t('admin.system.billingStale')}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>{t('admin.system.jobsTitle')}</CardTitle>
            <Badge variant={failedJobs.count > 0 ? 'destructive' : 'success'}>{failedJobs.count}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {failedJobs.count === 0 ? (
              <p className="text-muted-foreground">{t('admin.system.jobsNone')}</p>
            ) : (
              <>
                <p className="text-muted-foreground">{t('admin.system.jobsHelp')}</p>
                <ul className="flex flex-col gap-1">
                  {failedJobs.latest.map((job) => (
                    <li key={job.id} className="flex flex-wrap justify-between gap-2">
                      <span className="font-mono text-xs">{job.name}</span>
                      <span className="text-xs text-muted-foreground">{when(job.failed_at)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.system.webhookTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <p>{t('admin.system.lastReceived', { when: when(data.billplz_webhook.received_at) })}</p>
            <p className="text-muted-foreground">{t('admin.system.webhookHelp')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{t('admin.system.sandboxTitle')}</CardTitle>
          <Badge variant={data.sandbox_operators.count > 0 ? 'destructive' : 'success'}>
            {data.sandbox_operators.count}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {data.sandbox_operators.count === 0 ? (
            <p className="text-muted-foreground">{t('admin.system.sandboxNone')}</p>
          ) : (
            <>
              <p className="text-muted-foreground">{t('admin.system.sandboxHelp')}</p>
              <p>
                {data.sandbox_operators.items.map((operator, index) => (
                  <span key={operator.id}>
                    {index > 0 && ', '}
                    <Link to={`/admin/operators/${operator.id}`} className="hover:underline">
                      {operator.company_name}
                    </Link>
                  </span>
                ))}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.system.environmentTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <dl className="grid gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{t('admin.system.envName')}</dt>
              <dd>{environment.app_env}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{t('admin.system.mailer')}</dt>
              <dd>{environment.mailer}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{t('admin.system.queue')}</dt>
              <dd>{environment.queue}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{t('admin.system.debug')}</dt>
              <dd>{environment.debug ? t('admin.system.on') : t('admin.system.off')}</dd>
            </div>
          </dl>
          {mailNotSent && (
            <p role="alert" className="text-destructive">
              {t('admin.system.mailNotSent')}
            </p>
          )}
          {debugInProduction && (
            <p role="alert" className="text-destructive">
              {t('admin.system.debugOn')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
