import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2, Wallet } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMyInvoices, useMyStudents } from '@/hooks/useParentPortal'
import { formatMoney, formatPeriod } from '@/lib/utils'

type View = 'checkout' | 'processing' | 'success'

export function PayInvoice() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data: invoices, isLoading: invoicesLoading } = useMyInvoices()
  const { data: students, isLoading: studentsLoading } = useMyStudents()
  const [view, setView] = useState<View>('checkout')

  const invoice = invoices?.find((inv) => String(inv.id) === id)
  const student = students?.find((s) => s.id === invoice?.student_id)

  const onPay = () => {
    setView('processing')
    setTimeout(() => setView('success'), 1200)
  }

  if (invoicesLoading || studentsLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (!invoice) {
    return <p className="text-sm text-destructive">{t('parent.pay.notFound')}</p>
  }

  if (view === 'success') {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-12 text-primary" />
          <p className="text-lg font-medium">{t('parent.pay.successTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('parent.pay.successDescription')}</p>
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
        <p className="text-sm text-muted-foreground">
          {t('parent.pay.invoiceFor', { name: student?.full_name ?? '—' })}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('parent.dashboard.billingPeriod')}</span>
            <span>{formatPeriod(invoice.period_start, i18n.language)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('parent.dashboard.dueDate')}</span>
            <span>{invoice.due_date.slice(0, 10)}</span>
          </div>
          <div className="flex justify-between text-base font-medium">
            <span>{t('parent.dashboard.amount')}</span>
            <span>RM {formatMoney(invoice.final_amount)}</span>
          </div>
        </div>

        <Button onClick={onPay} disabled={view === 'processing'} className="w-full">
          {view === 'processing' ? (
            <>
              <Loader2 className="animate-spin" />
              {t('parent.pay.redirecting')}
            </>
          ) : (
            <>
              <Wallet />
              {t('parent.pay.payWith')}
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t('parent.pay.poweredBy')}</p>
        <p className="text-center text-xs text-muted-foreground">{t('parent.pay.previewNotice')}</p>
      </CardContent>
    </Card>
  )
}
