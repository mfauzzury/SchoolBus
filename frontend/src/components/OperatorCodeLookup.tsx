import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useTenantByCode } from '@/hooks/useRegistration'

/** The 5-digit operator ID boxes: checks the code, then sends the parent on to register. */
export function OperatorCodeLookup({
  actionLabel,
  children,
}: {
  actionLabel?: string
  /** Shown under the button, e.g. an "already registered" link. */
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const { data: tenant, isFetching, isError } = useTenantByCode(code)
  const resolved = code.length === 5 && !isFetching && !isError && tenant

  const onContinue = () => {
    if (resolved) navigate(`/register/${code}`)
  }

  return (
    <>
      <InputOTP maxLength={5} value={code} onChange={setCode} inputMode="numeric">
        <InputOTPGroup className="mx-auto gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="size-11 rounded-lg border-l font-mono text-lg"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>

      <div className="flex min-h-5 items-center justify-center gap-1.5 text-sm">
        {code.length === 5 && isFetching && (
          <span className="text-muted-foreground">{t('landing.parentCard.checking')}</span>
        )}
        {code.length === 5 && !isFetching && isError && (
          <span className="flex items-center gap-1 text-destructive">
            <XCircle className="size-4" /> {t('landing.parentCard.notFound')}
          </span>
        )}
        {resolved && (
          <span className="flex items-center gap-1 text-foreground">
            <CheckCircle2 className="size-4 text-primary" />
            <span className="font-medium">{tenant.company_name}</span>
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button type="button" disabled={!resolved} onClick={onContinue}>
          {actionLabel ?? t('common.continue')}
          <ArrowRight />
        </Button>
        {children}
      </div>
    </>
  )
}
