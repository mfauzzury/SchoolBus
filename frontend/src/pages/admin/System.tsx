import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { BrevoSettingsCard } from '@/components/admin/BrevoSettingsCard'
import { WhatsAppSettingsCard } from '@/components/admin/WhatsAppSettingsCard'
import { pillTabClass, pillTabListClass } from '@/lib/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSystemHealth } from '@/hooks/useAdmin'

function SystemStatus() {
  const { t, i18n } = useTranslation()
  const { data, isLoading, isError } = useSystemHealth()

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('admin.system.loadError')}
      </p>
    )
  }

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
  const backlog = data.queue_backlog
  // Emails are sent by a background worker. Anything waiting over 10 minutes means none is running.
  const workerStuck =
    backlog !== null &&
    backlog.waiting > 0 &&
    backlog.oldest_at !== null &&
    Date.now() - new Date(backlog.oldest_at).getTime() > 10 * 60_000
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
      {workerStuck && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        >
          <p className="font-medium">
            {t('admin.system.queueStuckTitle', { count: backlog?.waiting ?? 0 })}
          </p>
          <p className="mt-1">{t('admin.system.queueStuckHelp')}</p>
        </div>
      )}

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

type TabKey = 'status' | 'email' | 'whatsapp'

/** System settings: server health, plus where the platform's email and WhatsApp notifications are set up. */
export function AdminSystem() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab: TabKey = requested === 'email' || requested === 'whatsapp' ? requested : 'status'

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'status', label: t('admin.system.tabStatus') },
    { key: 'email', label: t('admin.system.tabEmail') },
    { key: 'whatsapp', label: t('admin.system.tabWhatsapp') },
  ]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">{t('admin.system.title')}</h1>

      <nav role="group" aria-label={t('admin.system.title')} className={pillTabListClass}>
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSearchParams(item.key === 'status' ? {} : { tab: item.key })}
            className={pillTabClass(tab === item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'status' && <SystemStatus />}
      {tab === 'email' && <BrevoSettingsCard />}
      {tab === 'whatsapp' && <WhatsAppSettingsCard />}
    </div>
  )
}
