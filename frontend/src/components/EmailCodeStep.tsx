import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { sendEmailCode, verifyEmailCode } from '@/api/emailCode'

const CODE_LENGTH = 6
// The words the server uses for a refused code; each has a sentence in the locale files.
const CODE_PROBLEMS = ['invalid', 'expired', 'too_many_attempts', 'locked']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface EmailCodeStepProps {
  /** Where the code is asked for; the check is `<endpoint>/verify`. */
  endpoint: string
  /** Pre-fills the box when the person comes back to this step. */
  initialEmail?: string
  /** The email that has already been proven, if any. */
  verifiedEmail: string | null
  /** `token` is the proof to send as `email_token` with the final request. */
  onVerified: (email: string, token: string) => void
  /** "Use a different email": the page forgets the proof. */
  onChangeEmail: () => void
  /** Shown on the button once the email is proven and the person comes back to this step. */
  onContinue: () => void
  nextLabel: string
  /** Something the page wants said, e.g. "please verify again". */
  notice?: string
  /** Placeholder for the email box. */
  emailPlaceholder?: string
  /** i18n key for "we sent a code to {{email}}"; forgot-password must not confirm the account exists. */
  sentToKey?: string
  /** Shown under the email box, e.g. a link for people who already have an account. */
  footer?: React.ReactNode
}

/**
 * "Prove this email": type the email, get a six-digit code, type the code.
 * It has no form of its own so it can sit inside the page's wizard; Enter in
 * either box does the right thing.
 */
export function EmailCodeStep({
  endpoint,
  initialEmail = '',
  verifiedEmail,
  onVerified,
  onChangeEmail,
  onContinue,
  nextLabel,
  notice,
  emailPlaceholder,
  sentToKey = 'auth.emailCode.sentTo',
  footer,
}: EmailCodeStepProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState(initialEmail)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const send = useMutation({
    mutationFn: (address: string) => sendEmailCode(endpoint, address),
  })
  const verify = useMutation({
    mutationFn: (input: { address: string; code: string }) =>
      verifyEmailCode(endpoint, input.address, input.code),
  })

  const requestCode = (resend = false) => {
    const address = email.trim()
    if (!address) return setProblem('auth.validation.required')
    if (!EMAIL_PATTERN.test(address)) return setProblem('auth.validation.email')

    setProblem(null)
    send.mutate(address, {
      onSuccess: (data) => {
        setSentTo(address)
        setCooldown(data.resend_after ?? 60)
        if (resend) setCode('')
      },
      onError: (error) => {
        const response = isAxiosError(error) ? error.response : undefined
        if (response?.status === 429 && response.data?.pending) {
          // A code is already on its way to this address; just wait out the timer.
          setSentTo(address)
          setCooldown(Number(response.data.retry_after) || 60)
        } else if (response?.status === 429) {
          // Nothing was sent: too many wrong codes for this email, or too many requests.
          setProblem(
            response.data?.locked
              ? 'auth.emailCode.errors.locked'
              : 'auth.emailCode.errors.tooManyRequests',
          )
        } else if (response?.status === 422) {
          setProblem(
            response.data?.errors?.email?.[0] === 'taken'
              ? 'auth.emailCode.errors.emailTaken'
              : 'auth.validation.email',
          )
        } else {
          setProblem('auth.emailCode.errors.sendFailed')
        }
      },
    })
  }

  const checkCode = () => {
    if (!sentTo) return
    if (code.length < CODE_LENGTH) return setProblem('auth.emailCode.errors.invalid')

    setProblem(null)
    verify.mutate(
      { address: sentTo, code },
      {
        onSuccess: (token) => onVerified(sentTo, token),
        onError: (error) => {
          const response = isAxiosError(error) ? error.response : undefined
          const reason = response?.data?.errors?.code?.[0]
          setCode('')
          if (CODE_PROBLEMS.includes(reason)) {
            setProblem(`auth.emailCode.errors.${reason}`)
          } else if (response?.status === 429) {
            setProblem('auth.emailCode.errors.tooManyRequests')
          } else {
            setProblem('auth.emailCode.errors.verifyFailed')
          }
        },
      },
    )
  }

  const changeEmail = () => {
    setSentTo(null)
    setCode('')
    setProblem(null)
    onChangeEmail()
  }

  const onEnter = (action: () => void) => (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    action()
  }

  const error = problem ?? notice

  if (verifiedEmail) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">{t('auth.emailCode.verified')}</p>
            <p className="break-all text-muted-foreground">{verifiedEmail}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={changeEmail}>
            {t('auth.emailCode.changeEmail')}
          </Button>
          <Button type="button" className="flex-1" onClick={onContinue}>
            {nextLabel}
          </Button>
        </div>
      </div>
    )
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {t(sentToKey, { email: sentTo })}
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email_code">{t('auth.emailCode.codeLabel')}</Label>
          <InputOTP
            id="email_code"
            autoFocus
            maxLength={CODE_LENGTH}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            value={code}
            onChange={(value) => setCode(value.replace(/\D/g, ''))}
            onKeyDown={onEnter(checkCode)}
            disabled={verify.isPending}
          >
            <InputOTPGroup>
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
                <InputOTPSlot key={index} index={index} className="size-10 text-base" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {t(error)}
            </p>
          )}
        </div>
        <Button type="button" onClick={checkCode} disabled={verify.isPending}>
          {verify.isPending ? t('auth.emailCode.verifying') : t('auth.emailCode.verify')}
        </Button>
        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={changeEmail}
          >
            {t('auth.emailCode.changeEmail')}
          </button>
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-60"
            disabled={cooldown > 0 || send.isPending}
            onClick={() => requestCode(true)}
          >
            {cooldown > 90
              ? t('auth.emailCode.resendInMinutes', { minutes: Math.ceil(cooldown / 60) })
              : cooldown > 0
                ? t('auth.emailCode.resendIn', { seconds: cooldown })
                : t('auth.emailCode.resend')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t('auth.emailCode.emailLabel')}</Label>
        <Input
          id="email"
          type="email"
          autoFocus
          autoComplete="email"
          placeholder={emailPlaceholder ?? t('auth.emailCode.emailPlaceholder')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={onEnter(() => requestCode())}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t(error)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{t('auth.emailCode.hint')}</p>
      </div>
      <Button type="button" onClick={() => requestCode()} disabled={send.isPending}>
        {send.isPending ? t('auth.emailCode.sending') : t('auth.emailCode.sendCode')}
      </Button>
      {footer}
    </div>
  )
}
