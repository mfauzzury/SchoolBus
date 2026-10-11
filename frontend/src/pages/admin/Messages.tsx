import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useNotificationLog,
  useNotificationOverview,
  useSetNotificationEnabled,
} from '@/hooks/useAdmin'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { pillTabClass, pillTabListClass } from '@/lib/tabs'
import type { NotificationLogEntry, NotificationTypeKey } from '@/api/admin'

const ALL = 'all'

const TYPES: NotificationTypeKey[] = [
  'bill_issued',
  'payment_received',
  'reminder_due_soon',
  'reminder_overdue',
  'application_decided',
  'application_received',
  'operator_signed_up',
]

type Tab = 'types' | 'log'

const statusVariant: Record<NotificationLogEntry['status'], 'success' | 'destructive' | 'outline' | 'info'> = {
  sent: 'success',
  failed: 'destructive',
  skipped: 'outline',
  queued: 'info',
}

export function AdminMessages() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('types')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">{t('admin.messages.title')}</h1>

      <nav role="group" aria-label={t('admin.messages.title')} className={pillTabListClass}>
        <button type="button" onClick={() => setTab('types')} className={pillTabClass(tab === 'types')}>
          {t('admin.messages.tabTypes')}
        </button>
        <button type="button" onClick={() => setTab('log')} className={pillTabClass(tab === 'log')}>
          {t('admin.messages.tabLog')}
        </button>
      </nav>

      {tab === 'types' ? <MessageTypes /> : <SentLog />}
    </div>
  )
}

function DeliveryWarning({ delivers }: { delivers: boolean }) {
  const { t } = useTranslation()

  if (delivers) return null

  return (
    <div
      role="alert"
      className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <p className="font-medium">{t('admin.messages.notDeliveringTitle')}</p>
      <p className="mt-1">
        {t('admin.messages.notDeliveringHelp')}{' '}
        <Link to="/admin/system?tab=email" className="underline underline-offset-2">
          {t('admin.messages.setUpEmail')}
        </Link>
      </p>
    </div>
  )
}

function MessageTypes() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useNotificationOverview()
  const toggle = useSetNotificationEnabled()

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

  const byType = new Map(data.types.map((info) => [info.type, info]))

  return (
    <div className="flex flex-col gap-4">
      <DeliveryWarning delivers={data.delivers} />
      <p className="text-sm text-muted-foreground">{t('admin.messages.intro')}</p>

      <Card>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {TYPES.map((type) => {
              const info = byType.get(type)
              if (!info) return null

              return (
                <li key={type} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{t(`admin.messages.types.${type}.title`)}</span>
                      <Badge variant="outline">{t(`admin.messages.audience.${info.audience}`)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{t(`admin.messages.types.${type}.help`)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.messages.last30', { sent: info.sent, failed: info.failed })}
                      {info.waiting > 0 && ` · ${t('admin.messages.waiting', { count: info.waiting })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`type_${type}`}
                      checked={info.enabled}
                      disabled={toggle.isPending}
                      onCheckedChange={(checked) => toggle.mutate({ type, enabled: checked === true })}
                    />
                    <Label htmlFor={`type_${type}`}>
                      {info.enabled ? t('admin.messages.on') : t('admin.messages.off')}
                    </Label>
                  </div>
                </li>
              )
            })}
          </ul>
          {toggle.isError && (
            <p role="alert" className="pt-3 text-sm text-destructive">
              {t('admin.team.error')}
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t('admin.messages.daytimeNote')}</p>
    </div>
  )
}

function SentLog() {
  const { t, i18n } = useTranslation()
  const { data: overview } = useNotificationOverview()
  const [status, setStatus] = useState(ALL)
  const [type, setType] = useState(ALL)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounced = useDebouncedValue(search.trim())

  const { data, isLoading } = useNotificationLog({
    page,
    status: status !== ALL ? (status as NotificationLogEntry['status']) : undefined,
    type: type !== ALL ? (type as NotificationTypeKey) : undefined,
    search: debounced || undefined,
  })

  const when = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language === 'ms' ? 'ms-MY' : 'en-MY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const statusItems: Record<string, string> = {
    [ALL]: t('common.allStatuses'),
    sent: t('admin.messages.status.sent'),
    queued: t('admin.messages.status.queued'),
    failed: t('admin.messages.status.failed'),
    skipped: t('admin.messages.status.skipped'),
  }
  const typeItems: Record<string, string> = {
    [ALL]: t('admin.messages.allTypes'),
    ...Object.fromEntries(TYPES.map((key) => [key, t(`admin.messages.types.${key}.title`)])),
  }

  const reasonText = (entry: NotificationLogEntry) => {
    if (!entry.reason) return null
    if (entry.reason === 'switched_off' || entry.reason === 'no_email') {
      return t(`admin.messages.reason.${entry.reason}`)
    }
    return entry.reason
  }

  const filterSelect = (label: string, items: Record<string, string>, value: string, set: (v: string) => void) => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select
        items={items}
        value={value}
        onValueChange={(v) => {
          set(v ?? ALL)
          setPage(1)
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([key, text]) => (
            <SelectItem key={key} value={key}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {overview && <DeliveryWarning delivers={overview.delivers} />}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <Label htmlFor="message_search">{t('common.search')}</Label>
              <Input
                id="message_search"
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder={t('admin.messages.searchPlaceholder')}
              />
            </div>
            {filterSelect(t('admin.operators.status'), statusItems, status, setStatus)}
            {filterSelect(t('admin.messages.typeLabel'), typeItems, type, setType)}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : data?.data.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.activity.when')}</TableHead>
                    <TableHead>{t('admin.messages.to')}</TableHead>
                    <TableHead>{t('admin.messages.what')}</TableHead>
                    <TableHead>{t('admin.operators.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((entry) => {
                    const notDelivered =
                      entry.status === 'sent' && ['log', 'array'].includes(entry.transport ?? '')
                    const reason = reasonText(entry)

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">{when(entry.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{entry.recipient_name ?? '—'}</span>
                            <span className="text-xs text-muted-foreground">{entry.recipient}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="flex flex-col">
                            <span>{t(`admin.messages.types.${entry.type}.title`)}</span>
                            {entry.summary && (
                              <span className="text-xs text-muted-foreground">{entry.summary}</span>
                            )}
                            {entry.bus_operator && (
                              <span className="text-xs text-muted-foreground">
                                {entry.bus_operator.company_name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-48 whitespace-normal">
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant={statusVariant[entry.status]}>
                              {t(`admin.messages.status.${entry.status}`)}
                            </Badge>
                            {notDelivered && (
                              <span className="text-xs text-destructive">
                                {t('admin.messages.notDelivered')}
                              </span>
                            )}
                            {reason && <span className="text-xs text-muted-foreground">{reason}</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <Pagination page={data.current_page} pageCount={data.last_page} onPageChange={setPage} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('admin.messages.empty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
