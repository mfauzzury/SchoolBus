import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { downloadTransactions } from '@/api/admin'
import { useAdminTransactions, useOperatorOptions, usePaymentAttempts } from '@/hooks/useAdmin'
import { useCan } from '@/hooks/useAuth'
import { formatMoney } from '@/lib/utils'
import { pillTabClass, pillTabListClass } from '@/lib/tabs'

const ALL = 'all'

type TabKey = 'received' | 'online'

export function AdminTransactions() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: TabKey = searchParams.get('tab') === 'online' ? 'online' : 'received'

  const setTab = (next: TabKey) => setSearchParams(next === 'online' ? { tab: 'online' } : {})

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">{t('admin.transactions.title')}</h1>

      <nav role="group" aria-label={t('admin.transactions.title')} className={pillTabListClass}>
        <button type="button" onClick={() => setTab('received')} className={pillTabClass(tab === 'received')}>
          {t('admin.transactions.tabReceived')}
        </button>
        <button type="button" onClick={() => setTab('online')} className={pillTabClass(tab === 'online')}>
          {t('admin.transactions.tabOnline')}
        </button>
      </nav>

      {tab === 'received' ? <ReceivedPayments /> : <OnlineCheckouts initialStuck={searchParams.get('stuck') === '1'} />}
    </div>
  )
}

function OperatorSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation()
  const { data: operators } = useOperatorOptions()

  const items: Record<string, string> = {
    [ALL]: t('admin.transactions.allOperators'),
    ...Object.fromEntries((operators ?? []).map((o) => [String(o.id), o.company_name])),
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{t('admin.transactions.operator')}</Label>
      <Select items={items} value={value} onValueChange={(v) => onChange(v ?? ALL)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function ReceivedPayments() {
  const { t } = useTranslation()
  const canExport = useCan('transactions.export')
  const [operatorId, setOperatorId] = useState(ALL)
  const [method, setMethod] = useState(ALL)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportFailed, setExportFailed] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [operatorId, method, dateFrom, dateTo])

  const filters = {
    operator_id: operatorId !== ALL ? Number(operatorId) : undefined,
    method: method !== ALL ? method : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }
  const { data, isLoading } = useAdminTransactions({ ...filters, page })

  const methodItems = {
    [ALL]: t('common.allStatuses'),
    cash: t('operator.finances.cash'),
    bank_transfer: t('operator.finances.bankTransfer'),
    fpx: t('operator.finances.fpx'),
    online: t('operator.finances.online'),
  }

  const onExport = async () => {
    setExporting(true)
    setExportFailed(false)
    try {
      await downloadTransactions(filters)
    } catch {
      setExportFailed(true)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('admin.transactions.totalCollected')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {formatMoney(data?.totals.amount ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('admin.transactions.transactionCount')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{data?.totals.count ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <OperatorSelect value={operatorId} onChange={setOperatorId} />
            <div className="flex flex-col gap-1.5">
              <Label>{t('operator.finances.method')}</Label>
              <Select items={methodItems} value={method} onValueChange={(v) => setMethod(v ?? ALL)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(methodItems).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date_from">{t('admin.transactions.dateFrom')}</Label>
              <Input id="date_from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date_to">{t('admin.transactions.dateTo')}</Label>
              <Input id="date_to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            {canExport && (
              <Button variant="outline" disabled={exporting || !data?.totals.count} onClick={onExport}>
                {exporting ? t('admin.transactions.exporting') : t('admin.transactions.export')}
              </Button>
            )}
          </div>
          {exportFailed && (
            <p role="alert" className="text-sm text-destructive">
              {t('admin.transactions.exportError')}
            </p>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : data?.data.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.transactions.date')}</TableHead>
                    <TableHead>{t('admin.transactions.operator')}</TableHead>
                    <TableHead>{t('operator.finances.student')}</TableHead>
                    <TableHead>{t('operator.finances.route')}</TableHead>
                    <TableHead>{t('operator.finances.method')}</TableHead>
                    <TableHead>{t('operator.finances.referenceNumber')}</TableHead>
                    <TableHead className="text-right">{t('operator.finances.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>{txn.payment_date.slice(0, 10)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{txn.bus_operator.company_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {txn.bus_operator.operator_code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{txn.invoice.student.full_name}</TableCell>
                      <TableCell>{txn.invoice.route?.name ?? '—'}</TableCell>
                      <TableCell>
                        {t(`operator.finances.${txn.method === 'bank_transfer' ? 'bankTransfer' : txn.method}`)}
                      </TableCell>
                      <TableCell>{txn.reference_number ?? '—'}</TableCell>
                      <TableCell className="text-right">RM {formatMoney(txn.amount_paid)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={data.current_page} pageCount={data.last_page} onPageChange={setPage} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('admin.transactions.noTransactions')}</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function OnlineCheckouts({ initialStuck }: { initialStuck: boolean }) {
  const { t, i18n } = useTranslation()
  const [operatorId, setOperatorId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [stuckOnly, setStuckOnly] = useState(initialStuck)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [operatorId, status, stuckOnly])

  const { data, isLoading } = usePaymentAttempts({
    page,
    operator_id: operatorId !== ALL ? Number(operatorId) : undefined,
    status: status !== ALL ? (status as 'pending' | 'paid') : undefined,
    stuck: stuckOnly || undefined,
  })

  const statusItems = {
    [ALL]: t('common.allStatuses'),
    paid: t('admin.transactions.attemptPaid'),
    pending: t('admin.transactions.attemptPending'),
  }

  const when = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language === 'ms' ? 'ms-MY' : 'en-MY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t('admin.transactions.onlineIntro')}</p>

        <div className="flex flex-wrap items-end gap-4">
          <OperatorSelect value={operatorId} onChange={setOperatorId} />
          <div className="flex flex-col gap-1.5">
            <Label>{t('admin.operators.status')}</Label>
            <Select items={statusItems} value={status} onValueChange={(v) => setStatus(v ?? ALL)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusItems).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="stuck_only"
              checked={stuckOnly}
              onCheckedChange={(checked) => setStuckOnly(checked === true)}
            />
            <Label htmlFor="stuck_only">{t('admin.transactions.stuckOnly')}</Label>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : data?.data.length ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.transactions.started')}</TableHead>
                  <TableHead>{t('admin.transactions.operator')}</TableHead>
                  <TableHead>{t('admin.transactions.parent')}</TableHead>
                  <TableHead>{t('admin.transactions.bills')}</TableHead>
                  <TableHead className="text-right">{t('operator.finances.amount')}</TableHead>
                  <TableHead>{t('admin.operators.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="whitespace-nowrap">{when(attempt.created_at)}</TableCell>
                    <TableCell>{attempt.bus_operator?.company_name ?? '—'}</TableCell>
                    <TableCell>{attempt.user?.name ?? '—'}</TableCell>
                    <TableCell>{attempt.invoices_count}</TableCell>
                    <TableCell className="text-right">RM {formatMoney(attempt.amount)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={attempt.status === 'paid' ? 'success' : 'outline'}>
                          {attempt.status === 'paid'
                            ? t('admin.transactions.attemptPaid')
                            : t('admin.transactions.attemptPending')}
                        </Badge>
                        {attempt.stuck && (
                          <Badge variant="destructive">{t('admin.transactions.stuck')}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.current_page} pageCount={data.last_page} onPageChange={setPage} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('admin.transactions.noAttempts')}</p>
        )}
      </CardContent>
    </Card>
  )
}
