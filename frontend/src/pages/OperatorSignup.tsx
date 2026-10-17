import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { WizardProgress } from '@/components/WizardProgress'
import { useEmailProof } from '@/hooks/useEmailProof'
import { useRegisterOperator } from '@/hooks/useOperatorRegistration'

// Messages are i18n keys, translated where they're rendered (see FieldError).
const signupSchema = z.object({
  company_name: z.string().trim().min(1, 'auth.validation.required'),
  contact_person: z.string().trim().min(1, 'auth.validation.required'),
  contact_phone: z.string().trim().min(1, 'auth.validation.required'),
  email: z.string().trim().min(1, 'auth.validation.required').email('auth.validation.email'),
  password: z
    .string()
    .min(8, 'auth.password.errors.tooShort')
    .regex(/[A-Za-z]/, 'auth.password.errors.needsLetter')
    .regex(/\d/, 'auth.password.errors.needsNumber'),
})

type SignupForm = z.infer<typeof signupSchema>

const STEPS = ['verify', 'company', 'details', 'password'] as const

// Which fields must be valid before leaving each step. The first step proves the
// email with a one-time code (see EmailCodeStep).
const STEP_FIELDS: Record<number, (keyof SignupForm)[]> = {
  1: ['company_name'],
  2: ['contact_person', 'contact_phone'],
}

export function OperatorSignup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const register = useRegisterOperator()
  const [step, setStep] = useState(0)
  // The email they have proven with a code. Signing up is refused without it.
  const emailProof = useEmailProof()
  const {
    register: registerField,
    handleSubmit,
    trigger,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  const password = watch('password') ?? ''
  const isLastStep = step === STEPS.length - 1

  // Only the current step's fields need to be valid before moving on.
  const goNext = async () => {
    const fields = STEP_FIELDS[step]
    if (!fields || (await trigger(fields))) setStep((current) => current + 1)
  }

  const onSubmit = (values: SignupForm) => {
    register.mutate(
      { ...values, email_token: emailProof.proof?.token },
      {
        onSuccess: () => navigate('/operator/dashboard'),
        onError: (error) => {
          // The email itself was refused (proof ran out, or it got registered meanwhile):
          // back to the first step, which says why.
          if (emailProof.rejectedBy(error)) {
            register.reset()
            setStep(0)
          }
        },
      },
    )
  }

  // Enter on an earlier step advances rather than submitting a half-filled form.
  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    // The first step has its own buttons and handles Enter itself.
    if (step === 0) {
      event.preventDefault()
      return
    }

    if (!isLastStep) {
      event.preventDefault()
      void goNext()
      return
    }

    void handleSubmit(onSubmit, (invalid) => {
      // Bring the user back to the earliest step that has something to fix.
      if (invalid.company_name) setStep(1)
      else if (invalid.contact_person || invalid.contact_phone) setStep(2)
      else if (invalid.email) setStep(0)
    })(event)
  }

  const stepLabel = t('auth.operatorSignup.stepLabel', { current: step + 1, total: STEPS.length })

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.operatorSignup.title')}</CardTitle>
        <CardDescription>{t('auth.operatorSignup.description')}</CardDescription>

        <WizardProgress
          labels={STEPS.map((key) => t(`auth.operatorSignup.steps.${key}`))}
          current={step}
          stepLabel={stepLabel}
        />
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onFormSubmit} noValidate>
          {step === 0 && (
            <EmailCodeStep
              endpoint="/api/register-operator/email-code"
              initialEmail={getValues('email') ?? ''}
              verifiedEmail={emailProof.proof?.email ?? null}
              notice={emailProof.notice}
              emailPlaceholder={t('auth.operatorSignup.emailPlaceholder')}
              nextLabel={t('auth.operatorSignup.next')}
              onVerified={(email, token) => {
                setValue('email', email, { shouldValidate: true })
                emailProof.accept(email, token)
                setStep(1)
              }}
              onChangeEmail={emailProof.clear}
              onContinue={() => setStep(1)}
              footer={
                <p className="text-center text-sm text-muted-foreground">
                  {t('auth.operatorSignup.haveAccount')}{' '}
                  <Link to="/login?as=operator" className="font-medium text-foreground hover:underline">
                    {t('auth.operatorSignup.logIn')}
                  </Link>
                </p>
              }
            />
          )}

          {step === 1 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company_name">{t('auth.operatorSignup.companyName')}</Label>
                <Input
                  id="company_name"
                  autoFocus
                  placeholder={t('auth.operatorSignup.companyNamePlaceholder')}
                  autoComplete="organization"
                  {...registerField('company_name')}
                />
                <FieldError message={errors.company_name?.message} />
              </div>
              {/* A real submit button so Enter advances; onFormSubmit routes it to goNext. */}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  {t('auth.operatorSignup.back')}
                </Button>
                <Button key="next-company" type="submit" className="flex-1">
                  {t('auth.operatorSignup.next')}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact_person">{t('auth.operatorSignup.contactPerson')}</Label>
                <Input
                  id="contact_person"
                  autoFocus
                  placeholder={t('auth.operatorSignup.contactPersonPlaceholder')}
                  autoComplete="name"
                  {...registerField('contact_person')}
                />
                <FieldError message={errors.contact_person?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact_phone">{t('auth.operatorSignup.contactPhone')}</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  placeholder={t('auth.operatorSignup.contactPhonePlaceholder')}
                  autoComplete="tel"
                  {...registerField('contact_phone')}
                />
                <FieldError message={errors.contact_phone?.message} />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  {t('auth.operatorSignup.back')}
                </Button>
                <Button key="next-details" type="submit" className="flex-1">
                  {t('auth.operatorSignup.next')}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">{t('auth.operatorSignup.password')}</Label>
                <PasswordInput
                  id="password"
                  autoFocus
                  placeholder={t('auth.password.placeholder')}
                  autoComplete="new-password"
                  {...registerField('password')}
                />
                <PasswordStrengthMeter password={password} />
                <FieldError message={errors.password?.message} />
              </div>

              {register.isError && (
                <p className="text-sm text-destructive">{t('auth.operatorSignup.failed')}</p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={register.isPending}
                  onClick={() => setStep(2)}
                >
                  {t('auth.operatorSignup.back')}
                </Button>
                <Button key="submit" type="submit" className="flex-1" disabled={register.isPending}>
                  {register.isPending
                    ? t('auth.operatorSignup.submitting')
                    : t('auth.operatorSignup.submit')}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
