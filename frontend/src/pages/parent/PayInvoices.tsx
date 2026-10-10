import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  useMyInvoices,
  useMyStudents,
  usePaymentConfig,
  useStartPayment,
} from '@/hooks/useParentPortal'
import { formatMoney, formatPeriod, invoiceBalance, isInvoiceOverdue } from '@/lib/utils'
import type { Invoice } from '@/api/parentPortal'

type PayOption = 'total' | 'current'

export function PayInvoices() {
  const { t, i18n } = useTranslation()
  const { data: invoices, isLoading: invoicesLoading } = useMyInvoices()
  const { data: students, isLoading: studentsLoading } = useMyStudents()
  const { data: paymentConfig, isLoading: configLoading } = usePaymentConfig()
  const startPayment = useStartPayment()
  const [payOption, setPayOption] = useState<PayOption>('total')

  const loading = invoicesLoading || studentsLoading || configLoading
  const unpaidInvoices = (invoices ?? []).filter(
    (inv) => inv.status === 'issued' || inv.status === 'overdue',
  )
  const currentInvoices = unpaidInvoices.filter((inv) => !isInvoiceOverdue(inv))
  const hasOverdue = currentInvoices.length < unpaidInvoices.length

  const total = (list: Invoice[]) => list.reduce((sum, inv) => sum + invoiceBalance(inv), 0)
  const totalOutstanding = total(unpaidInvoices)
  const currentTotal = total(currentInvoices)

  const selectedInvoices = payOption === 'total' || !hasOverdue ? unpaidInvoices : currentInvoices
  const selectedTotal = payOption === 'total' || !hasOverdue ? totalOutstanding : currentTotal

  const studentName = (studentId: number) =>
    students?.find((s) => s.id === studentId)?.full_name ?? '—'

  // Redirects the browser to Billplz's hosted page (FPX / e-wallet / card there).
  const onPay = () => {
    startPayment.mutate(
      selectedInvoices.map((invoice) => invoice.id),
      { onSuccess: ({ url }) => window.location.assign(url) },
    )
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (unpaidInvoices.length === 0) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-12 text-primary" />
          <p className="text-lg font-medium">{t('parent.pay.allCaughtUpTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('parent.pay.allCaughtUpDescription')}</p>
          <Link to="/parent/invoices" className={buttonVariants({ className: 'mt-2' })}>
            {t('parent.pay.backToDashboard')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (!paymentConfig?.enabled) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-lg font-medium">{t('parent.pay.unavailableTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('parent.pay.unavailableDescription')}</p>
          <Link to="/parent/invoices" className={buttonVariants({ className: 'mt-2' })}>
            {t('parent.pay.backToDashboard')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>{t('parent.pay.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('parent.pay.subtitle')}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasOverdue ? (
          <RadioGroup
            value={payOption}
            onValueChange={(v) => v && setPayOption(v as PayOption)}
            className="flex-col items-stretch gap-2.5"
          >
            <RadioGroupItem value="total">
              <div
                className={
                  payOption === 'total'
                    ? 'flex flex-1 items-center justify-between rounded-lg border border-primary bg-primary/5 p-3'
                    : 'flex flex-1 items-center justify-between rounded-lg border p-3'
                }
              >
                <div>
                  <p className="text-sm font-medium">{t('parent.pay.payTotalTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('parent.pay.payTotalDescription')}</p>
                </div>
                <p className="text-sm font-medium">RM {formatMoney(totalOutstanding)}</p>
              </div>
            </RadioGroupItem>
            <RadioGroupItem value="current">
              <div
                className={
                  payOption === 'current'
                    ? 'flex flex-1 items-center justify-between rounded-lg border border-primary bg-primary/5 p-3'
                    : 'flex flex-1 items-center justify-between rounded-lg border p-3'
                }
              >
                <div>
                  <p className="text-sm font-medium">{t('parent.pay.payCurrentTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('parent.pay.payCurrentDescription')}</p>
                </div>
                <p className="text-sm font-medium">RM {formatMoney(currentTotal)}</p>
              </div>
            </RadioGroupItem>
          </RadioGroup>
        ) : (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <p className="text-sm font-medium">{t('parent.pay.payCurrentTitle')}</p>
            <p className="text-sm font-medium">RM {formatMoney(currentTotal)}</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {t('parent.pay.includedBills')}
          </p>
          <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
            {selectedInvoices.map((invoice) => (
              <div key={invoice.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {studentName(invoice.student_id)} · {formatPeriod(invoice.period_start, i18n.language)}
                </span>
                <span>RM {formatMoney(invoiceBalance(invoice))}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t pt-1.5 text-base font-medium">
              <span>{t('parent.dashboard.amount')}</span>
              <span>RM {formatMoney(selectedTotal)}</span>
            </div>
          </div>
        </div>

        {startPayment.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t('parent.pay.startError')}
          </p>
        )}

        <Button onClick={onPay} disabled={startPayment.isPending || startPayment.isSuccess} className="w-full">
          {startPayment.isPending || startPayment.isSuccess ? (
            <>
              <Loader2 className="animate-spin" />
              {t('parent.pay.processing')}
            </>
          ) : (
            t('parent.pay.payAmount', { amount: formatMoney(selectedTotal) })
          )}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          {t('parent.pay.redirectNote')}
        </p>
        <p className="text-center text-xs text-muted-foreground">{t('parent.pay.poweredBy')}</p>
      </CardContent>
    </Card>
  )
}
