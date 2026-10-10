import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRecordPayment } from '@/hooks/useFinances'
import type { LedgerInvoice } from '@/api/finances'
import { formatMoney } from '@/lib/utils'

const paymentSchema = z.object({
  method: z.enum(['cash', 'bank_transfer', 'fpx', 'online']),
  reference_number: z.string().optional(),
  payment_date: z.string().min(1),
  amount_paid: z.string().refine((v) => Number(v) > 0),
})

type PaymentForm = z.infer<typeof paymentSchema>

// What is still owed, not the bill's face value, so a part-paid bill doesn't invite over-collecting.
function defaults(invoice: LedgerInvoice): PaymentForm {
  return {
    method: 'cash',
    reference_number: '',
    payment_date: new Date().toLocaleDateString('en-CA'),
    amount_paid: invoice.balance,
  }
}

/** Record cash, a bank transfer, etc. against an unpaid bill. Shown on the bill's page. */
export function RecordPaymentForm({ invoice }: { invoice: LedgerInvoice }) {
  const { t } = useTranslation()
  const recordPayment = useRecordPayment()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: defaults(invoice),
  })

  // After a part-payment the bill is refreshed; offer the new, smaller balance.
  useEffect(() => {
    reset(defaults(invoice))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.balance, reset])

  const method = watch('method')
  const methodLabels = {
    cash: t('operator.finances.cash'),
    bank_transfer: t('operator.finances.bankTransfer'),
    fpx: t('operator.finances.fpx'),
    online: t('operator.finances.online'),
  }

  const onSubmit = (values: PaymentForm) => {
    // The server refuses this too; saying so here saves a round trip.
    if (Math.round(Number(values.amount_paid) * 100) > Math.round(Number(invoice.balance) * 100)) {
      setError('amount_paid', { message: t('operator.finances.overpayError', { amount: formatMoney(invoice.balance) }) })
      return
    }
    recordPayment.mutate({
      invoiceId: invoice.id,
      input: { ...values, amount_paid: Number(values.amount_paid) },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('operator.finances.recordPayment')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label>{t('operator.finances.method')}</Label>
            <Select
              items={methodLabels}
              value={method}
              onValueChange={(v) => v && setValue('method', v as PaymentForm['method'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(methodLabels) as (keyof typeof methodLabels)[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {methodLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference_number">{t('operator.finances.referenceNumber')}</Label>
            <Input id="reference_number" {...register('reference_number')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment_date">{t('operator.finances.paymentDate')}</Label>
              <Input id="payment_date" type="date" {...register('payment_date')} />
              {errors.payment_date && (
                <p className="text-sm text-destructive">{errors.payment_date.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount_paid">{t('operator.finances.amountPaid')}</Label>
              <Input id="amount_paid" type="number" step="0.01" max={invoice.balance} {...register('amount_paid')} />
              {errors.amount_paid && (
                <p className="text-sm text-destructive">{errors.amount_paid.message}</p>
              )}
            </div>
          </div>
          {recordPayment.isError && (
            <p role="alert" className="text-sm text-destructive">
              {t('operator.finances.adjustError')}
            </p>
          )}
          <Button type="submit" className="self-start" disabled={recordPayment.isPending}>
            {recordPayment.isPending ? t('common.saving') : t('operator.finances.recordPayment')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
