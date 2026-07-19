import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useRoutes } from '@/hooks/useRoutes'
import { useDashboardSummary, useInvoices, useRecordPayment } from '@/hooks/useFinances'
import { usePagination } from '@/hooks/usePagination'
import { invoicesExportUrl, receiptUrl, type LedgerInvoice } from '@/api/finances'
import { cn, formatMoney, formatPeriod } from '@/lib/utils'

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
}

const paymentSchema = z.object({
  method: z.enum(['cash', 'bank_transfer', 'fpx', 'online']),
  reference_number: z.string().optional(),
  payment_date: z.string().min(1),
  amount_paid: z.string().refine((v) => Number(v) > 0),
})

type PaymentForm = z.infer<typeof paymentSchema>

function toFormValues(invoice?: LedgerInvoice): PaymentForm {
  return {
    method: 'cash',
    reference_number: '',
    payment_date: new Date().toISOString().slice(0, 10),
    amount_paid: invoice ? invoice.final_amount : '0',
  }
}

function RecordPaymentDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice?: LedgerInvoice
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const recordPayment = useRecordPayment()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: toFormValues(invoice),
  })

  useEffect(() => {
    if (open) reset(toFormValues(invoice))
  }, [open, invoice, reset])

  const method = watch('method')

  const onSubmit = (values: PaymentForm) => {
    if (!invoice) return
    recordPayment.mutate(
      { invoiceId: invoice.id, input: { ...values, amount_paid: Number(values.amount_paid) } },
      {
        onSuccess: () => {
          onOpenChange(false)
          reset()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('operator.finances.recordPaymentFor', { name: invoice?.student.full_name })}
          </DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label>{t('operator.finances.method')}</Label>
            <Select
              items={{
                cash: t('operator.finances.cash'),
                bank_transfer: t('operator.finances.bankTransfer'),
                fpx: t('operator.finances.fpx'),
                online: t('operator.finances.online'),
              }}
              value={method}
              onValueChange={(v) => setValue('method', v as PaymentForm['method'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t('operator.finances.cash')}</SelectItem>
                <SelectItem value="bank_transfer">{t('operator.finances.bankTransfer')}</SelectItem>
                <SelectItem value="fpx">{t('operator.finances.fpx')}</SelectItem>
                <SelectItem value="online">{t('operator.finances.online')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference_number">{t('operator.finances.referenceNumber')}</Label>
            <Input id="reference_number" {...register('reference_number')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment_date">{t('operator.finances.paymentDate')}</Label>
            <Input id="payment_date" type="date" {...register('payment_date')} />
            {errors.payment_date && (
              <p className="text-sm text-destructive">{errors.payment_date.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount_paid">{t('operator.finances.amountPaid')}</Label>
            <Input id="amount_paid" type="number" step="0.01" {...register('amount_paid')} />
            {errors.amount_paid && (
              <p className="text-sm text-destructive">{errors.amount_paid.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? t('common.saving') : t('operator.finances.recordPayment')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Finances() {
  const { t, i18n } = useTranslation()
  const isAdmin = useIsOperatorAdmin()
  const { data: routes } = useRoutes()
  const [routeId, setRouteId] = useState(ALL)
  const [year, setYear] = useState(ALL)
  const [month, setMonth] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<LedgerInvoice | undefined>(undefined)

  const filters = {
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
  }, [routeId, year, month, status, setPage])

  const openPaymentDialog = (invoice: LedgerInvoice) => {
    setSelectedInvoice(invoice)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">{t('operator.finances.title')}</h1>
        <a href={invoicesExportUrl(invoiceFilters)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          {t('operator.finances.exportCsv')}
        </a>
      </div>

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
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
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
                  {isAdmin && <TableHead className="text-right">{t('operator.finances.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.student.full_name}</TableCell>
                    <TableCell>{invoice.route?.name ?? '—'}</TableCell>
                    <TableCell>{formatPeriod(invoice.period_start, i18n.language)}</TableCell>
                    <TableCell>RM {formatMoney(invoice.final_amount)}</TableCell>
                    <TableCell>{invoice.due_date.slice(0, 10)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[invoice.status]}>
                        {t(`operator.finances.${invoice.status}`)}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {invoice.status === 'paid' ? (
                          <a
                            href={receiptUrl(invoice.id)}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                          >
                            {t('common.downloadReceipt')}
                          </a>
                        ) : (
                          <Button size="sm" onClick={() => openPaymentDialog(invoice)}>
                            {t('operator.finances.recordPayment')}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </CardContent>
      </Card>

      <RecordPaymentDialog invoice={selectedInvoice} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
