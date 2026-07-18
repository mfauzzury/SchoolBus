import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useRoutes } from '@/hooks/useRoutes'
import { useDashboardSummary, useInvoices, useRecordPayment } from '@/hooks/useFinances'
import { invoicesExportUrl, type LedgerInvoice } from '@/api/finances'

const ALL = 'all'

const statusVariant: Record<LedgerInvoice['status'], 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  issued: 'default',
  paid: 'default',
  overdue: 'destructive',
}

const paymentSchema = z.object({
  method: z.enum(['cash', 'bank_transfer', 'fpx', 'online']),
  reference_number: z.string().optional(),
  payment_date: z.string().min(1, 'Required'),
  amount_paid: z.string().refine((v) => Number(v) > 0, 'Must be greater than 0'),
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
          <DialogTitle>Record payment for {invoice?.student.full_name}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label>Method</Label>
            <Select
              items={{ cash: 'Cash', bank_transfer: 'Bank Transfer', fpx: 'FPX', online: 'Online' }}
              value={method}
              onValueChange={(v) => setValue('method', v as PaymentForm['method'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="fpx">FPX</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference_number">Reference number</Label>
            <Input id="reference_number" {...register('reference_number')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment_date">Payment date</Label>
            <Input id="payment_date" type="date" {...register('payment_date')} />
            {errors.payment_date && (
              <p className="text-sm text-destructive">{errors.payment_date.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount_paid">Amount paid (RM)</Label>
            <Input id="amount_paid" type="number" step="0.01" {...register('amount_paid')} />
            {errors.amount_paid && (
              <p className="text-sm text-destructive">{errors.amount_paid.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Saving…' : 'Record payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Finances() {
  const isAdmin = useIsOperatorAdmin()
  const { data: routes } = useRoutes()
  const [routeId, setRouteId] = useState(ALL)
  const [month, setMonth] = useState('')
  const [status, setStatus] = useState(ALL)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<LedgerInvoice | undefined>(undefined)

  const filters = {
    route_id: routeId !== ALL ? Number(routeId) : undefined,
    month: month || undefined,
  }
  const invoiceFilters = { ...filters, status: status !== ALL ? status : undefined }

  const { data: summary } = useDashboardSummary(filters)
  const { data: invoices, isLoading } = useInvoices(invoiceFilters)

  const openPaymentDialog = (invoice: LedgerInvoice) => {
    setSelectedInvoice(invoice)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Finances</h1>
        <a href={invoicesExportUrl(invoiceFilters)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total Expected</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {(summary?.total_expected ?? 0).toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total Collected</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {(summary?.total_collected ?? 0).toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">
            RM {(summary?.total_outstanding ?? 0).toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Overdue Count</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-medium">{summary?.overdue_count ?? 0}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Route</Label>
          <Select
            items={{ [ALL]: 'All routes', ...Object.fromEntries((routes ?? []).map((r) => [String(r.id), r.name])) }}
            value={routeId}
            onValueChange={(v) => setRouteId(v ?? ALL)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All routes</SelectItem>
              {routes?.map((route) => (
                <SelectItem key={route.id} value={String(route.id)}>
                  {route.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="month">Month</Label>
          <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select
            items={{ [ALL]: 'All statuses', draft: 'Draft', issued: 'Issued', paid: 'Paid', overdue: 'Overdue' }}
            value={status}
            onValueChange={(v) => setStatus(v ?? ALL)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices?.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.student.full_name}</TableCell>
                <TableCell>{invoice.route?.name ?? '—'}</TableCell>
                <TableCell className="capitalize">{invoice.billing_period.replace('_', ' ')}</TableCell>
                <TableCell>RM {Number(invoice.final_amount).toFixed(2)}</TableCell>
                <TableCell>{invoice.due_date.slice(0, 10)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    {invoice.status !== 'paid' && (
                      <Button size="sm" onClick={() => openPaymentDialog(invoice)}>
                        Record payment
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RecordPaymentDialog invoice={selectedInvoice} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
