import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useConfirmPayment, usePaymentAttempt } from '@/hooks/useParentPortal'
import { receiptUrl } from '@/api/parentPortal'
import { cn, formatMoney } from '@/lib/utils'

// How long to wait for the Billplz callback before telling the parent we're
// still waiting (their money is safe — the callback can land any time later).
const POLL_WINDOW_MS = 30_000

export function PayReturn() {
  const { t } = useTranslation()
  const { attemptId } = useParams<{ attemptId: string }>()
  const [search] = useSearchParams()
  const id = Number(attemptId)

  // Billplz appends billplz[id], billplz[paid], billplz[paid_at], billplz[x_signature].
  const redirect = {
    id: search.get('billplz[id]'),
    paid: search.get('billplz[paid]'),
    paid_at: search.get('billplz[paid_at]') ?? undefined,
    x_signature: search.get('billplz[x_signature]'),
  }
  const hasRedirect = Boolean(redirect.id && redirect.paid && redirect.x_signature)

  const confirm = useConfirmPayment()
  const confirmed = useRef(false)
  const [timedOut, setTimedOut] = useState(false)

  // The signed redirect settles the bill right away (idempotent with the callback).
  useEffect(() => {
    if (!hasRedirect || confirmed.current) return
    confirmed.current = true
    confirm.mutate({
      id,
      billplz: {
        id: redirect.id!,
        paid: redirect.paid!,
        paid_at: redirect.paid_at,
        x_signature: redirect.x_signature!,
      },
    })
  }, [])

  const redirectSaysUnpaid = hasRedirect && redirect.paid !== 'true'
  const redirectSettled = !hasRedirect || confirm.isSuccess || confirm.isError

  // Fall back to polling our own record when there's no (valid) redirect result.
  const { data: attempt } = usePaymentAttempt(id, redirectSettled && !redirectSaysUnpaid)

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), POLL_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [])

  const current = confirm.data?.status === 'paid' ? confirm.data : (attempt ?? confirm.data)
  const paid = current?.status === 'paid'
  const retryUrl = current?.bill_url ?? null

  if (paid) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-12 text-primary" />
          <p className="text-lg font-medium">{t('parent.pay.return.successTitle')}</p>
          <p className="text-sm text-muted-foreground">
            {t('parent.pay.return.successDescription', { amount: formatMoney(current!.amount) })}
          </p>
          {current!.receipts.length > 0 && (
            <div className="mt-2 flex w-full flex-col gap-2">
              {current!.receipts.map((receipt) => (
                <div
                  key={receipt.payment_id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{receipt.student_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {receipt.receipt_number} · RM {formatMoney(receipt.amount)}
                    </span>
                  </div>
                  <a
                    href={receiptUrl(receipt.payment_id)}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
                  >
                    {t('common.downloadReceipt')}
                  </a>
                </div>
              ))}
            </div>
          )}
          <Link to="/parent/invoices" className={buttonVariants({ className: 'mt-2' })}>
            {t('parent.pay.backToDashboard')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (redirectSaysUnpaid) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <XCircle className="size-12 text-destructive" />
          <p className="text-lg font-medium">{t('parent.pay.return.failedTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('parent.pay.return.failedDescription')}</p>
          <div className="mt-2 flex gap-2">
            {retryUrl && (
              <a href={retryUrl} className={buttonVariants()}>
                {t('parent.pay.return.tryAgain')}
              </a>
            )}
            <Link to="/parent/invoices" className={cn(buttonVariants({ variant: 'outline' }))}>
              {t('parent.pay.backToDashboard')}
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (timedOut) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Clock className="size-12 text-muted-foreground" />
          <p className="text-lg font-medium">{t('parent.pay.return.waitingTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('parent.pay.return.waitingDescription')}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={buttonVariants()}
            >
              {t('parent.pay.return.refresh')}
            </button>
            <Link to="/parent/invoices" className={cn(buttonVariants({ variant: 'outline' }))}>
              {t('parent.pay.backToDashboard')}
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 className="size-12 animate-spin text-muted-foreground" />
        <p className="text-lg font-medium">{t('parent.pay.return.checkingTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('parent.pay.return.checkingDescription')}</p>
      </CardContent>
    </Card>
  )
}
