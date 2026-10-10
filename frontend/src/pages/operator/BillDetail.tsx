import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RecordPaymentForm } from '@/components/finances/RecordPaymentForm'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import {
  useAddInvoiceAdjustment,
  useInvoice,
  useRemoveInvoiceAdjustment,
  useVoidInvoice,
} from '@/hooks/useFinances'
import { receiptUrl, type LedgerInvoice } from '@/api/finances'
import { cn, formatMoney, formatPeriod, isInvoiceOverdue } from '@/lib/utils'
import { formatSignedMoney, invoiceItemLabel } from '@/lib/billing'
import { BackLink } from '@/components/BackLink'

type AdjustmentKind = 'discount' | 'charge'

const statusVariant: Record<string, 'success' | 'info' | 'outline' | 'destructive'> = {
  draft: 'outline',
  issued: 'info',
  paid: 'success',
  overdue: 'destructive',
  void: 'outline',
}

const methodKey: Record<string, string> = {
  cash: 'cash',
  bank_transfer: 'bankTransfer',
  fpx: 'fpx',
  online: 'online',
}

const cents = (value: number | string) => Math.round(Number(value) * 100)

/** 409 = a parent has this bill open in an online checkout right now. */
function useChangeError() {
  const { t } = useTranslation()
  return (error: unknown) =>
    isAxiosError(error) && error.response?.status === 409
      ? t('operator.finances.beingPaidError')
      : t('operator.finances.adjustError')
}

/**
 * Add a one-off discount or extra charge to an unpaid bill, with a reason the
 * parent sees. Changes this bill only — the monthly fee is set on the student.
 */
function AdjustmentForm({ invoice }: { invoice: LedgerInvoice }) {
  const { t } = useTranslation()
  const addAdjustment = useAddInvoiceAdjustment()
  const changeError = useChangeError()
  const [kind, setKind] = useState<AdjustmentKind>('discount')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  const signedAmount = kind === 'discount' ? -Math.abs(Number(amount)) : Math.abs(Number(amount))
  const amountValid = amount !== '' && Number(amount) > 0
  // The server refuses this too; checking here saves a round trip.
  const belowPaid = amountValid && cents(invoice.final_amount) + cents(signedAmount) < cents(invoice.amount_paid)

  const kindLabels: Record<AdjustmentKind, string> = {
    discount: t('operator.finances.adjustmentDiscount'),
    charge: t('operator.finances.adjustmentCharge'),
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!amountValid || belowPaid || !reason.trim()) return
    addAdjustment.mutate(
      { invoiceId: invoice.id, input: { description: reason.trim(), amount: signedAmount } },
      {
        onSuccess: () => {
          setAmount('')
          setReason('')
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('operator.finances.addAdjustment')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label>{t('operator.finances.adjustmentType')}</Label>
            <Select items={kindLabels} value={kind} onValueChange={(v) => v && setKind(v as AdjustmentKind)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">{kindLabels.discount}</SelectItem>
                <SelectItem value="charge">{kindLabels.charge}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjustment_amount">{t('operator.finances.adjustmentAmount')}</Label>
            <Input
              id="adjustment_amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjustment_reason">{t('operator.finances.adjustmentReason')}</Label>
            <Input
              id="adjustment_reason"
              value={reason}
              maxLength={255}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('operator.finances.adjustmentReasonPlaceholder')}
            />
          </div>
          {belowPaid && <p className="text-sm text-destructive">{t('operator.finances.belowPaidError')}</p>}
          {addAdjustment.isError && (
            <p role="alert" className="text-sm text-destructive">
              {changeError(addAdjustment.error)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t('operator.finances.adjustmentHint')}</p>
          <Button
            type="submit"
            className="self-start"
            disabled={!amountValid || belowPaid || !reason.trim() || addAdjustment.isPending}
          >
            {addAdjustment.isPending ? t('common.saving') : t('operator.finances.addAdjustment')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/** Cancel a bill raised by mistake. Asks for a reason first; a bill with payments can't be cancelled. */
function CancelBillCard({ invoice }: { invoice: LedgerInvoice }) {
  const { t } = useTranslation()
  const voidInvoice = useVoidInvoice()
  const changeError = useChangeError()
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const hasPayments = cents(invoice.amount_paid) > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('operator.finances.cancelBill')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {confirming ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cancel_reason">{t('operator.finances.cancelReason')}</Label>
              <Textarea
                id="cancel_reason"
                value={reason}
                maxLength={255}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            {voidInvoice.isError && (
              <p role="alert" className="text-sm text-destructive">
                {changeError(voidInvoice.error)}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={!reason.trim() || voidInvoice.isPending}
                onClick={() => voidInvoice.mutate({ invoiceId: invoice.id, reason: reason.trim() })}
              >
                {voidInvoice.isPending ? t('common.saving') : t('operator.finances.confirmCancel')}
              </Button>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="destructive" className="self-start" disabled={hasPayments} onClick={() => setConfirming(true)}>
              {t('operator.finances.cancelBill')}
            </Button>
            {hasPayments && (
              <p className="text-xs text-muted-foreground">{t('operator.finances.cancelHasPayments')}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * One bill, on its own page: the lines it is made of, what has been paid,
 * and — for an admin, while it is unpaid — recording payments, adjusting the
 * amount and cancelling. Paid and cancelled bills are read-only.
 */
export function BillDetail() {
  const { t, i18n } = useTranslation()
  const isAdmin = useIsOperatorAdmin()
  const { id } = useParams<{ id: string }>()
  const { data: invoice, isLoading, isError } = useInvoice(Number(id))
  const removeAdjustment = useRemoveInvoiceAdjustment()
  const changeError = useChangeError()

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (isError || !invoice) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">{t('operator.finances.billNotFound')}</p>
        <BackLink to="/operator/finances">{t('operator.finances.backToFinances')}</BackLink>
      </div>
    )
  }

  const editable = isAdmin && invoice.status === 'issued'
  const displayStatus = isInvoiceOverdue(invoice) ? 'overdue' : invoice.status
  const parent = invoice.student.parent_profile

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <BackLink to={`/operator/students/${invoice.student.id}?tab=bills`}>
            {t('operator.finances.backToStudent', { name: invoice.student.full_name })}
          </BackLink>
          <BackLink to="/operator/finances">{t('operator.finances.backToFinances')}</BackLink>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-medium">
            {formatPeriod(invoice.period_start, i18n.language)} — {invoice.student.full_name}
          </h1>
          <Badge variant={statusVariant[displayStatus]}>{t(`operator.finances.${displayStatus}`)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {invoice.route?.name ?? '—'} · {t(`common.package.${invoice.package_type}`)} ·{' '}
          {t('operator.finances.dueDate')} {invoice.due_date.slice(0, 10)}
          {parent && ` · ${parent.full_name} (${parent.phone})`}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Card>
          <CardContent className="flex flex-col text-sm">
            {invoice.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 border-b py-2">
                <span className="text-muted-foreground">{invoiceItemLabel(item, t)}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {formatSignedMoney(item.amount)}
                  {editable && item.type === 'adjustment' && (
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={removeAdjustment.isPending}
                      onClick={() => removeAdjustment.mutate({ invoiceId: invoice.id, itemId: item.id })}
                    >
                      {t('operator.finances.removeAdjustment')}
                    </Button>
                  )}
                </span>
              </div>
            ))}
            <div className={cn('flex justify-between py-2 font-medium', invoice.status === 'void' && 'line-through')}>
              <span>{t('operator.finances.total')}</span>
              <span>RM {formatMoney(invoice.final_amount)}</span>
            </div>

            {invoice.payments.length > 0 && (
              <div className="mt-2 flex flex-col border-t pt-2">
                <p className="pb-1 text-xs font-medium text-muted-foreground uppercase">
                  {t('operator.students.paymentsTitle')}
                </p>
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="text-muted-foreground">
                      {payment.payment_date.slice(0, 10)} · {t(`operator.finances.${methodKey[payment.method]}`)}
                      {payment.reference_number ? ` · ${payment.reference_number}` : ''}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      - RM {formatMoney(payment.amount_paid)}
                      <a
                        href={receiptUrl(payment.id)}
                        className={cn(buttonVariants({ variant: 'outline', size: 'xs' }))}
                      >
                        {t('common.downloadReceipt')}
                      </a>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {invoice.status !== 'void' && (
              <div className="flex justify-between border-t py-2 font-medium">
                <span>{t('billing.balance')}</span>
                <span className={cn(Number(invoice.balance) > 0 && 'text-destructive')}>
                  RM {formatMoney(invoice.balance)}
                </span>
              </div>
            )}

            {invoice.status === 'void' && invoice.void_reason && (
              <p className="border-t py-2 text-muted-foreground">
                {t('operator.finances.cancelledReason', { reason: invoice.void_reason })}
              </p>
            )}
          </CardContent>
        </Card>

        {editable && (
          <div className="flex flex-col gap-6">
            <RecordPaymentForm invoice={invoice} />
            <AdjustmentForm invoice={invoice} />
            <CancelBillCard invoice={invoice} />
          </div>
        )}
      </div>

      {removeAdjustment.isError && (
        <p role="alert" className="text-sm text-destructive">
          {changeError(removeAdjustment.error)}
        </p>
      )}
    </div>
  )
}
