import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmailCodeStep } from '@/components/EmailCodeStep'
import { FieldError } from '@/components/FieldError'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
import { cn } from '@/lib/utils'
import { useResetPasswordWithCode } from '@/hooks/useAuth'
import { useEmailProof } from '@/hooks/useEmailProof'

// Messages are i18n keys, translated where they're rendered (see FieldError).
const newPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'auth.password.errors.tooShort')
    .regex(/[A-Za-z]/, 'auth.password.errors.needsLetter')
    .regex(/\d/, 'auth.password.errors.needsNumber'),
})

type NewPasswordForm = z.infer<typeof newPasswordSchema>

/** Forgot password: prove the email with a code, then choose a new password. */
export function ForgotPassword() {
  const { t } = useTranslation()
  const reset = useResetPasswordWithCode()
  // The email proven with a code. The password step only shows once there is one.
  const emailProof = useEmailProof()
  const [onPasswordStep, setOnPasswordStep] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<NewPasswordForm>({ resolver: zodResolver(newPasswordSchema) })

  const password = watch('password') ?? ''

  const onSubmit = (values: NewPasswordForm) => {
    if (!emailProof.proof) return
    reset.mutate(
      { ...emailProof.proof, password: values.password },
      {
        onError: (error) => {
          // The proof ran out while they were choosing a password: ask for a new code.
          if (emailProof.rejectedBy(error)) {
            reset.reset()
            setOnPasswordStep(false)
          }
        },
      },
    )
  }

  const heading = reset.isSuccess
    ? { title: t('auth.forgotPassword.doneTitle'), description: t('auth.forgotPassword.success') }
    : onPasswordStep
      ? { title: t('auth.forgotPassword.newPasswordTitle'), description: t('auth.forgotPassword.newPasswordDescription') }
      : { title: t('auth.forgotPassword.title'), description: t('auth.forgotPassword.description') }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{heading.title}</CardTitle>
        <CardDescription>{heading.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {reset.isSuccess ? (
          <Link to="/login" className={cn(buttonVariants(), 'w-full')}>
            {t('auth.forgotPassword.goToLogin')}
          </Link>
        ) : onPasswordStep ? (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t('auth.forgotPassword.newPassword')}</Label>
              <PasswordInput
                id="password"
                autoFocus
                placeholder={t('auth.password.placeholder')}
                autoComplete="new-password"
                {...register('password')}
              />
              <PasswordStrengthMeter password={password} />
              <FieldError message={errors.password?.message} />
            </div>
            {reset.isError && (
              <p className="text-sm text-destructive">{t('auth.forgotPassword.failed')}</p>
            )}
            <Button type="submit" disabled={reset.isPending}>
              {reset.isPending
                ? t('auth.forgotPassword.submitting')
                : t('auth.forgotPassword.submit')}
            </Button>
          </form>
        ) : (
          <EmailCodeStep
            endpoint="/api/forgot-password"
            verifiedEmail={emailProof.proof?.email ?? null}
            notice={emailProof.notice}
            sentToKey="auth.emailCode.sentToIfRegistered"
            nextLabel={t('auth.forgotPassword.next')}
            onVerified={(email, token) => {
              emailProof.accept(email, token)
              setOnPasswordStep(true)
            }}
            onChangeEmail={emailProof.clear}
            onContinue={() => setOnPasswordStep(true)}
          />
        )}
        {!reset.isSuccess && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground">
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
