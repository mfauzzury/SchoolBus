import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useMyInvoices, useMyStudents } from '@/hooks/useParentPortal'
import { useTenant } from '@/hooks/useTenant'
import { receiptUrl } from '@/api/parentPortal'
import { cn, formatMoney, formatPeriod, invoiceBalance, isInvoiceOverdue } from '@/lib/utils'
import { formatSignedMoney, invoiceItemLabel } from '@/lib/billing'
import { BackLink } from '@/components/BackLink'

/** One bill, on its own page: what it is made of, what is paid and what is left. */
export function ParentInvoiceDetail() {
  const { t, i18n } = useTranslation()
  const { tenant } = useTenant()
  const { id } = useParams<{ id: string }>()
  const { data: invoices, isLoading } = useMyInvoices()
  const { data: students } = useMyStudents()

  const invoice = invoices?.find((inv) => String(inv.id) === id)
  const student = students?.find((s) => s.id === invoice?.student_id)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">{t('parent.invoice.notFound')}</p>
        <BackLink to="/parent/invoices">{t('parent.invoice.back')}</BackLink>
      </div>
    )
  }

  const overdue = isInvoiceOverdue(invoice)
  const paid = invoice.status === 'paid'
  const amountPaid = Number(invoice.amount_paid ?? 0)
  const bank = tenant?.bank_details ?? null
  const hasPaymentInfo = Boolean(tenant?.payment_note || bank?.account_number)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <BackLink to="/parent/invoices">{t('parent.invoice.back')}</BackLink>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t('parent.invoice.title', { id: invoice.id })}</p>
            <p className="text-3xl font-semibold">RM {formatMoney(invoice.final_amount)}</p>
            <div className="flex items-center gap-1.5 pt-0.5 text-sm">
              <span
                className={cn('size-2 rounded-full', paid && 'bg-green-500', !paid && (overdue ? 'bg-red-500' : 'bg-blue-500'))}
              />
              <span className="text-muted-foreground">
                {paid && t('parent.invoice.paidOn', { date: invoice.paid_at?.slice(0, 10) ?? '—' })}
                {!paid &&
                  (overdue
                    ? t('parent.invoice.overdueSince', { date: invoice.due_date.slice(0, 10) })
                    : t('parent.invoice.dueOn', { date: invoice.due_date.slice(0, 10) }))}
              </span>
            </div>
          </div>

          <div className="flex flex-col text-sm">
            {tenant && (
              <>
                <div className="flex justify-between border-b py-1.5">
                  <span className="text-muted-foreground">{t('parent.invoice.operator')}</span>
                  <span>
                    {tenant.company_name} · {tenant.operator_code}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b py-1.5">
                  <span className="text-muted-foreground">{t('parent.invoice.contact')}</span>
                  <span className="text-right">
                    {tenant.contact_phone} · {tenant.email}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between border-b py-1.5">
              <span className="text-muted-foreground">{t('parent.dashboard.child')}</span>
              <span>{student?.full_name ?? '—'}</span>
            </div>
            <div className="flex justify-between border-b py-1.5">
              <span className="text-muted-foreground">{t('parent.invoice.route')}</span>
              <span>{invoice.route?.name ?? student?.route?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between border-b py-1.5">
              <span className="text-muted-foreground">{t('parent.dashboard.billingPeriod')}</span>
              <span>{formatPeriod(invoice.period_start, i18n.language)}</span>
            </div>
            <div className="flex justify-between border-b py-1.5">
              <span className="text-muted-foreground">{t('parent.dashboard.package')}</span>
              <span>{t(`common.package.${invoice.package_type}`)}</span>
            </div>
            {(invoice.items ?? []).map((item) => (
              <div key={item.id} className="flex justify-between gap-4 border-b py-1.5">
                <span className="text-muted-foreground">{invoiceItemLabel(item, t)}</span>
                <span className="shrink-0">{formatSignedMoney(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between py-1.5 font-medium">
              <span>{t('parent.dashboard.amount')}</span>
              <span>RM {formatMoney(invoice.final_amount)}</span>
            </div>
            {!paid && amountPaid > 0 && (
              <>
                <div className="flex justify-between border-t py-1.5">
                  <span className="text-muted-foreground">{t('billing.paidSoFar')}</span>
                  <span>- RM {formatMoney(amountPaid)}</span>
                </div>
                <div className="flex justify-between border-t py-1.5 font-medium">
                  <span>{t('billing.balance')}</span>
                  <span>RM {formatMoney(invoiceBalance(invoice))}</span>
                </div>
              </>
            )}
          </div>

          {(invoice.payments ?? []).length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {t('operator.students.paymentsTitle')}
              </p>
              {(invoice.payments ?? []).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {payment.payment_date.slice(0, 10)} · RM {formatMoney(payment.amount_paid)}
                  </span>
                  <a
                    href={receiptUrl(payment.id)}
                    className={cn(buttonVariants({ variant: 'outline', size: 'xs' }))}
                  >
                    {t('common.downloadReceipt')}
                  </a>
                </div>
              ))}
            </div>
          )}

          {!paid && (
            <Link to="/parent/invoices/pay" className={cn(buttonVariants({}), 'w-full')}>
              {t('parent.dashboard.payNow')}
            </Link>
          )}
        </CardContent>
      </Card>

      {!paid && hasPaymentInfo && (
        <Card>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase">{t('parent.invoice.howToPay')}</p>
            {tenant?.payment_note && <p className="whitespace-pre-wrap">{tenant.payment_note}</p>}
            {bank?.account_number && (
              <dl className="flex flex-col gap-1 rounded-md bg-muted/50 p-3">
                {bank.bank_name && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t('operator.settings.bankName')}</dt>
                    <dd>{bank.bank_name}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t('operator.settings.accountNumber')}</dt>
                  <dd className="font-mono">{bank.account_number}</dd>
                </div>
                {bank.account_holder && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t('operator.settings.accountHolder')}</dt>
                    <dd className="text-right">{bank.account_holder}</dd>
                  </div>
                )}
              </dl>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
