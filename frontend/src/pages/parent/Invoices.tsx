import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { useMyInvoices, useMyStudents } from '@/hooks/useParentPortal'
import { usePagination } from '@/hooks/usePagination'
import { receiptUrl, type Invoice } from '@/api/parentPortal'
import { cn, formatMoney, formatPeriod } from '@/lib/utils'

const ALL = 'all'
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

function monthLabel(month: number, language: string): string {
  return new Date(2000, month - 1, 1).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', {
    month: 'long',
  })
}

const invoiceStatusVariant: Record<Invoice['status'], 'success' | 'info' | 'outline' | 'destructive'> = {
  draft: 'outline',
  issued: 'info',
  paid: 'success',
  overdue: 'destructive',
}

export function ParentInvoices() {
  const { t, i18n } = useTranslation()
  const { data: students } = useMyStudents()
  const { data: invoices, isLoading } = useMyInvoices()
  const [year, setYear] = useState(ALL)
  const [month, setMonth] = useState(ALL)

  const years = [...new Set((invoices ?? []).map((inv) => new Date(inv.period_start).getFullYear()))].sort(
    (a, b) => b - a,
  )

  const filteredInvoices = (invoices ?? []).filter((invoice) => {
    const period = new Date(invoice.period_start)
    if (year !== ALL && String(period.getFullYear()) !== year) return false
    if (year !== ALL && month !== ALL && String(period.getMonth() + 1) !== month) return false
    return true
  })

  const today = new Date()
  const isOverdue = (invoice: Invoice) =>
    invoice.status === 'issued' && new Date(invoice.due_date) < today

  const totalExpected = filteredInvoices.reduce((sum, inv) => sum + Number(inv.final_amount), 0)
  const totalPaid = filteredInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.final_amount), 0)
  const totalDue = filteredInvoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + Number(inv.final_amount), 0)
  const overdueCount = filteredInvoices.filter(isOverdue).length

  const { page, setPage, pageCount, pageItems: pagedInvoices } = usePagination(filteredInvoices)

  useEffect(() => {
    setPage(1)
  }, [year, month, setPage])

  return (
    <div className="flex flex-col gap-6">
      {invoices?.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                {t('operator.finances.totalExpected')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-medium">RM {formatMoney(totalExpected)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                {t('operator.finances.totalCollected')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-medium">RM {formatMoney(totalPaid)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                {t('operator.finances.totalOutstanding')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-medium">RM {formatMoney(totalDue)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                {t('operator.finances.overdueCount')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-medium">{overdueCount}</CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('nav.invoices')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : invoices?.length ? (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>{t('common.year')}</Label>
                  <Select
                    items={{ [ALL]: t('common.allYears'), ...Object.fromEntries(years.map((y) => [String(y), String(y)])) }}
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
                      {years.map((y) => (
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
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('parent.dashboard.child')}</TableHead>
                    <TableHead>{t('parent.dashboard.billingPeriod')}</TableHead>
                    <TableHead>{t('parent.dashboard.amount')}</TableHead>
                    <TableHead>{t('parent.dashboard.dueDate')}</TableHead>
                    <TableHead>{t('parent.dashboard.status')}</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedInvoices.map((invoice) => {
                    const student = students?.find((s) => s.id === invoice.student_id)
                    const payable = invoice.status === 'issued' || invoice.status === 'overdue'
                    const displayStatus = isOverdue(invoice) ? 'overdue' : invoice.status
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>{student?.full_name ?? '—'}</TableCell>
                        <TableCell>{formatPeriod(invoice.period_start, i18n.language)}</TableCell>
                        <TableCell>RM {formatMoney(invoice.final_amount)}</TableCell>
                        <TableCell>{invoice.due_date.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Badge variant={invoiceStatusVariant[displayStatus]}>
                            {t(`operator.finances.${displayStatus}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {payable && (
                            <Link
                              to={`/parent/invoices/${invoice.id}/pay`}
                              className={buttonVariants({ size: 'sm' })}
                            >
                              {t('parent.dashboard.payNow')}
                            </Link>
                          )}
                          {invoice.status === 'paid' && (
                            <a
                              href={receiptUrl(invoice.id)}
                              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                            >
                              {t('common.downloadReceipt')}
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('parent.dashboard.noInvoices')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
