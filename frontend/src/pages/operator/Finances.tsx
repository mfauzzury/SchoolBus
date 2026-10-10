import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { TabBar } from '@/components/TabBar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useDashboardSummary, useInvoices } from '@/hooks/useFinances'
import { OutstandingTab } from '@/components/finances/OutstandingTab'
import { TransactionsTab } from '@/components/finances/TransactionsTab'
import { usePagination } from '@/hooks/usePagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { invoicesExportUrl, type LedgerInvoice } from '@/api/finances'
import { cn, formatMoney, formatPeriod, isInvoiceOverdue } from '@/lib/utils'

const ALL = 'all'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 3 + i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function monthLabel(month: number, language: string): string {
  return new Date(2000, month - 1, 1).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', {
    month: 'long',
  })
}

const statusVariant: Record<LedgerInvoice['status'], 'success' | 'info' | 'outline' | 'destructive'> = {
  draft: 'outline',
  issued: 'info',
  paid: 'success',
  overdue: 'destructive',
  void: 'outline',
}

// 'overdue' is never stored: it is an issued bill past its due date.
function displayStatus(invoice: LedgerInvoice): LedgerInvoice['status'] {
  return isInvoiceOverdue(invoice) ? 'overdue' : invoice.status
}

type Tab = 'bills' | 'transactions' | 'outstanding'
const TABS: Tab[] = ['bills', 'transactions', 'outstanding']

/** The invoice ledger: what was billed, what is still owed, and the actions on a bill. */
function BillsTab() {
  const { t, i18n } = useTranslation()
  const { data: routes } = useRoutes()
  const [routeId, setRouteId] = useState(ALL)
  const [year, setYear] = useState(ALL)
  const [month, setMonth] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [search, setSearch] = useState('')

  const debouncedSearch = useDebouncedValue(search.trim())

  const filters = {
    search: debouncedSearch || undefined,
    route_id: routeId !== ALL ? Number(routeId) : undefined,
    year: year !== ALL ? Number(year) : undefined,
    month: year !== ALL && month !== ALL ? Number(month) : undefined,
  }
  const invoiceFilters = { ...filters, status: status !== ALL ? status : undefined }

  const { data: summary } = useDashboardSummary(filters)
  const { data: invoices, isLoading } = useInvoices(invoiceFilters)
  const { page, setPage, pageCount, pageItems: pagedInvoices } = usePagination(invoices ?? [])

  useEffect(() => {
    setPage(1)
  }, [routeId, year, month, status, debouncedSearch, setPage])

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.totalExpected')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {formatMoney(summary?.total_expected ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.totalCollected')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {formatMoney(summary?.total_collected ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.totalOutstanding')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {formatMoney(summary?.total_outstanding ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {t('operator.finances.overdueCount')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{summary?.overdue_count ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill_search">{t('common.search')}</Label>
              <Input
                id="bill_search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('operator.finances.searchPlaceholder')}
                className="w-56"
              />
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
            <div className="flex flex-col gap-1.5">
              <Label>{t('common.year')}</Label>
              <Select
                items={{ [ALL]: t('common.allYears'), ...Object.fromEntries(YEARS.map((y) => [String(y), String(y)])) }}
                value={year}
                onValueChange={(v) => {
                  setYear(v ?? ALL)
                  if (v === ALL) setMonth(ALL)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('common.allYears')}</SelectItem>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('common.month')}</Label>
              <Select
                items={{
                  [ALL]: t('common.allMonths'),
                  ...Object.fromEntries(MONTHS.map((m) => [String(m), monthLabel(m, i18n.language)])),
                }}
                value={month}
                onValueChange={(v) => setMonth(v ?? ALL)}
                disabled={year === ALL}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('common.allMonths')}</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {monthLabel(m, i18n.language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('operator.finances.status')}</Label>
              <Select
                items={{
                  [ALL]: t('common.allStatuses'),
                  draft: t('operator.finances.draft'),
                  issued: t('operator.finances.issued'),
                  paid: t('operator.finances.paid'),
                  overdue: t('operator.finances.overdue'),
                  void: t('operator.finances.void'),
                }}
                value={status}
                onValueChange={(v) => setStatus(v ?? ALL)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('common.allStatuses')}</SelectItem>
                  <SelectItem value="draft">{t('operator.finances.draft')}</SelectItem>
                  <SelectItem value="issued">{t('operator.finances.issued')}</SelectItem>
                  <SelectItem value="paid">{t('operator.finances.paid')}</SelectItem>
                  <SelectItem value="overdue">{t('operator.finances.overdue')}</SelectItem>
                  <SelectItem value="void">{t('operator.finances.void')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex gap-2">
              <a
                href={invoicesExportUrl(invoiceFilters)}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                {t('operator.finances.exportCsv')}
              </a>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : !invoices?.length ? (
            <p className="text-sm text-muted-foreground">{t('operator.finances.noBills')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operator.finances.student')}</TableHead>
                  <TableHead>{t('operator.finances.route')}</TableHead>
                  <TableHead>{t('operator.finances.billing')}</TableHead>
                  <TableHead>{t('operator.finances.amount')}</TableHead>
                  <TableHead>{t('operator.finances.dueDate')}</TableHead>
                  <TableHead>{t('operator.finances.status')}</TableHead>
                  <TableHead className="text-right">{t('operator.finances.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link to={`/operator/students/${invoice.student.id}`} className="hover:text-primary">
                        {invoice.student.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.route?.name ?? '—'}</TableCell>
                    <TableCell>{formatPeriod(invoice.period_start, i18n.language)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>RM {formatMoney(invoice.final_amount)}</span>
                        {invoice.status === 'issued' && Number(invoice.amount_paid) > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {t('operator.finances.balance')} RM {formatMoney(invoice.balance)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{invoice.due_date.slice(0, 10)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[displayStatus(invoice)]}>
                        {t(`operator.finances.${displayStatus(invoice)}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/operator/finances/bills/${invoice.id}`}
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                        >
                          {t('operator.finances.openBill')}
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </CardContent>
      </Card>

    </>
  )
}

export function Finances() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('bills')

  const tabLabels: Record<Tab, string> = {
    bills: t('operator.finances.tabBills'),
    transactions: t('operator.finances.tabTransactions'),
    outstanding: t('operator.finances.tabOutstanding'),
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">{t('operator.finances.title')}</h1>

      <TabBar tabs={TABS.map((value) => ({ value, label: tabLabels[value] }))} value={tab} onChange={setTab} />

      {tab === 'bills' && <BillsTab />}
      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'outstanding' && <OutstandingTab />}
    </div>
  )
}
