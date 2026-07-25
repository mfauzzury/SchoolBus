import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { useMyInvoices, useMyStudents } from '@/hooks/useParentPortal'
import { usePagination } from '@/hooks/usePagination'
import { useTenant } from '@/hooks/useTenant'
import { receiptUrl, type Invoice } from '@/api/parentPortal'
import { cn, formatMoney, formatPeriod, isInvoiceOverdue } from '@/lib/utils'

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
  const { tenant } = useTenant()
  const { data: students } = useMyStudents()
  const { data: invoices, isLoading } = useMyInvoices()
  const [year, setYear] = useState(ALL)
  const [month, setMonth] = useState(ALL)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)

  const years = [...new Set((invoices ?? []).map((inv) => new Date(inv.period_start).getFullYear()))].sort(
    (a, b) => b - a,
  )

  const filteredInvoices = (invoices ?? []).filter((invoice) => {
    const period = new Date(invoice.period_start)
    if (year !== ALL && String(period.getFullYear()) !== year) return false
    if (year !== ALL && month !== ALL && String(period.getMonth() + 1) !== month) return false
    return true
  })

  const totalExpected = filteredInvoices.reduce((sum, inv) => sum + Number(inv.final_amount), 0)
  const totalPaid = filteredInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.final_amount), 0)
  const totalDue = filteredInvoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + Number(inv.final_amount), 0)
  const overdueCount = filteredInvoices.filter(isInvoiceOverdue).length

  const hasOutstandingBalance = (invoices ?? []).some(
    (inv) => inv.status === 'issued' || inv.status === 'overdue',
  )

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('nav.invoices')}</CardTitle>
          {hasOutstandingBalance && (
            <Link to="/parent/invoices/pay" className={buttonVariants({ size: 'sm' })}>
              {t('parent.dashboard.payNow')}
            </Link>
          )}
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
                    const displayStatus = isInvoiceOverdue(invoice) ? 'overdue' : invoice.status
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
                          <Button variant="outline" size="sm" onClick={() => setViewInvoice(invoice)}>
                            {t('parent.dashboard.viewInvoice')}
                          </Button>
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

      <Dialog open={viewInvoice !== null} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent>
          {viewInvoice && (
            <>
              <DialogHeader>
                <p className="text-xs text-muted-foreground">
                  {t('parent.invoice.title', { id: viewInvoice.id })}
                </p>
                <DialogTitle className="text-3xl font-semibold">
                  RM {formatMoney(viewInvoice.final_amount)}
                </DialogTitle>
                <div className="flex items-center gap-1.5 pt-0.5 text-sm">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      viewInvoice.status === 'paid' && 'bg-green-500',
                      viewInvoice.status !== 'paid' &&
                        (isInvoiceOverdue(viewInvoice) ? 'bg-red-500' : 'bg-blue-500'),
                    )}
                  />
                  <span className="text-muted-foreground">
                    {viewInvoice.status === 'paid' &&
                      t('parent.invoice.paidOn', { date: viewInvoice.paid_at?.slice(0, 10) ?? '—' })}
                    {viewInvoice.status !== 'paid' &&
                      (isInvoiceOverdue(viewInvoice)
                        ? t('parent.invoice.overdueSince', { date: viewInvoice.due_date.slice(0, 10) })
                        : t('parent.invoice.dueOn', { date: viewInvoice.due_date.slice(0, 10) }))}
                  </span>
                </div>
              </DialogHeader>

              <div className="flex flex-col text-sm">
                {tenant && (
                  <>
                    <div className="flex justify-between border-b py-1.5">
                      <span className="text-muted-foreground">{t('parent.invoice.operator')}</span>
                      <span>
                        {tenant.company_name} · {tenant.operator_code}
                      </span>
                    </div>
                    <div className="flex justify-between border-b py-1.5">
                      <span className="text-muted-foreground">{t('parent.invoice.contact')}</span>
                      <span>
                        {tenant.contact_phone} · {tenant.email}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">{t('parent.dashboard.child')}</span>
                  <span>{students?.find((s) => s.id === viewInvoice.student_id)?.full_name ?? '—'}</span>
                </div>
                <div className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">{t('parent.invoice.route')}</span>
                  <span>
                    {students?.find((s) => s.id === viewInvoice.student_id)?.route?.name ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">{t('parent.dashboard.billingPeriod')}</span>
                  <span>{formatPeriod(viewInvoice.period_start, i18n.language)}</span>
                </div>
                <div className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">{t('parent.dashboard.package')}</span>
                  <span>{t(`common.package.${viewInvoice.package_type}`)}</span>
                </div>
                <div className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">{t('parent.invoice.billingCycle')}</span>
                  <span>{t(`common.billingPeriod.${viewInvoice.billing_period}`)}</span>
                </div>
                <div className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">{t('parent.invoice.amountBeforeDiscount')}</span>
                  <span>RM {formatMoney(viewInvoice.amount_before_discount)}</span>
                </div>
                <div className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">{t('parent.invoice.discount')}</span>
                  <span>- RM {formatMoney(viewInvoice.discount_amount)}</span>
                </div>
                <div className="flex justify-between py-1.5 font-medium">
                  <span>{t('parent.dashboard.amount')}</span>
                  <span>RM {formatMoney(viewInvoice.final_amount)}</span>
                </div>
              </div>

              <DialogFooter>
                {viewInvoice.status === 'paid' ? (
                  <a
                    href={receiptUrl(viewInvoice.id)}
                    className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
                  >
                    {t('common.downloadReceipt')}
                  </a>
                ) : (
                  <Link to="/parent/invoices/pay" className={cn(buttonVariants({}), 'w-full')}>
                    {t('parent.dashboard.payNow')}
                  </Link>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
