import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { useRoutes } from '@/hooks/useRoutes'
import { useTransactions } from '@/hooks/useFinances'
import { usePagination } from '@/hooks/usePagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { receiptUrl, transactionsExportUrl } from '@/api/finances'
import { cn, formatMoney, formatPeriod } from '@/lib/utils'

const ALL = 'all'

/** Every payment received, newest first: the "what came in, and when" view. */
export function TransactionsTab() {
  const { t, i18n } = useTranslation()
  const { data: routes } = useRoutes()
  const [search, setSearch] = useState('')
  const [routeId, setRouteId] = useState(ALL)
  const [method, setMethod] = useState(ALL)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const debouncedSearch = useDebouncedValue(search.trim())

  const filters = {
    search: debouncedSearch || undefined,
    route_id: routeId !== ALL ? Number(routeId) : undefined,
    method: method !== ALL ? method : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }

  const { data: transactions, isLoading } = useTransactions(filters)
  const { page, setPage, pageCount, pageItems } = usePagination(transactions ?? [])
  const totalReceived = (transactions ?? []).reduce((sum, payment) => sum + Number(payment.amount_paid), 0)

  useEffect(() => {
    setPage(1)
  }, [routeId, method, dateFrom, dateTo, debouncedSearch, setPage])

  const methodLabels: Record<string, string> = {
    cash: t('operator.finances.cash'),
    bank_transfer: t('operator.finances.bankTransfer'),
    fpx: t('operator.finances.fpx'),
    online: t('operator.finances.online'),
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transaction_search">{t('common.search')}</Label>
            <Input
              id="transaction_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('operator.finances.searchPlaceholder')}
              className="w-56"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date_from">{t('operator.finances.dateFrom')}</Label>
            <Input id="date_from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date_to">{t('operator.finances.dateTo')}</Label>
            <Input id="date_to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('operator.finances.method')}</Label>
            <Select
              items={{ [ALL]: t('operator.finances.allMethods'), ...methodLabels }}
              value={method}
              onValueChange={(v) => setMethod(v ?? ALL)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('operator.finances.allMethods')}</SelectItem>
                {Object.entries(methodLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('operator.finances.route')}</Label>
            <Select
              items={{ [ALL]: t('common.allRoutes'), ...Object.fromEntries((routes ?? []).map((r) => [String(r.id), r.name])) }}
              value={routeId}
              onValueChange={(v) => setRouteId(v ?? ALL)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.allRoutes')}</SelectItem>
                {routes?.map((route) => (
                  <SelectItem key={route.id} value={String(route.id)}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <a
            href={transactionsExportUrl(filters)}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'ml-auto')}
          >
            {t('operator.finances.exportCsv')}
          </a>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : !transactions?.length ? (
          <p className="text-sm text-muted-foreground">{t('operator.finances.noTransactions')}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operator.finances.date')}</TableHead>
                  <TableHead>{t('operator.finances.student')}</TableHead>
                  <TableHead>{t('operator.finances.route')}</TableHead>
                  <TableHead>{t('operator.finances.billPeriod')}</TableHead>
                  <TableHead>{t('operator.finances.method')}</TableHead>
                  <TableHead>{t('operator.finances.referenceNumber')}</TableHead>
                  <TableHead className="text-right">{t('operator.finances.amount')}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.payment_date.slice(0, 10)}</TableCell>
                    <TableCell>
                      {payment.invoice?.student ? (
                        <Link to={`/operator/students/${payment.invoice.student.id}`} className="hover:text-primary">
                          {payment.invoice.student.full_name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{payment.invoice?.route?.name ?? '—'}</TableCell>
                    <TableCell>
                      {payment.invoice ? (
                        <Link to={`/operator/finances/bills/${payment.invoice.id}`} className="hover:text-primary">
                          {formatPeriod(payment.invoice.period_start, i18n.language)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{methodLabels[payment.method] ?? payment.method}</TableCell>
                    <TableCell>{payment.reference_number ?? '—'}</TableCell>
                    <TableCell className="text-right">RM {formatMoney(payment.amount_paid)}</TableCell>
                    <TableCell className="text-right">
                      <a
                        href={receiptUrl(payment.id)}
                        className={cn(buttonVariants({ variant: 'outline', size: 'xs' }))}
                      >
                        {t('common.downloadReceipt')}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between border-t pt-3 text-sm font-medium">
              <span>{t('operator.finances.totalReceived')}</span>
              <span>RM {formatMoney(totalReceived)}</span>
            </div>
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
