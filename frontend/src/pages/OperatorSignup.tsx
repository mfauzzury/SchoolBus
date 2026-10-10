import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
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
import { FieldError } from '@/components/FieldError'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
import { useRegisterOperator } from '@/hooks/useOperatorRegistration'
import { cn } from '@/lib/utils'

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

const STEPS = ['company', 'details', 'password'] as const

// Which fields must be valid before leaving each step.
const STEP_FIELDS: Record<number, (keyof SignupForm)[]> = {
  0: ['company_name'],
  1: ['contact_person', 'contact_phone', 'email'],
}

export function OperatorSignup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const register = useRegisterOperator()
  const [step, setStep] = useState(0)
  const {
    register: registerField,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  const password = watch('password') ?? ''
  const isLastStep = step === STEPS.length - 1

  // Only the current step's fields need to be valid before moving on.
  const goNext = async () => {
    if (await trigger(STEP_FIELDS[step])) setStep((current) => current + 1)
  }

  const onSubmit = (values: SignupForm) => {
    register.mutate(values, {
      onSuccess: () => navigate('/operator/dashboard'),
    })
  }

  // Enter on an earlier step advances rather than submitting a half-filled form.
  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isLastStep) {
      event.preventDefault()
      void goNext()
      return
    }

    void handleSubmit(onSubmit, (invalid) => {
      // Bring the user back to the earliest step that has something to fix.
      if (invalid.company_name) setStep(0)
      else if (invalid.contact_person || invalid.contact_phone || invalid.email) setStep(1)
    })(event)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.operatorSignup.title')}</CardTitle>
        <CardDescription>{t('auth.operatorSignup.description')}</CardDescription>

        <div className="mt-3 flex flex-col gap-2">
          <ol className="flex items-center gap-2" aria-label={t('auth.operatorSignup.stepLabel', { current: step + 1, total: STEPS.length })}>
            {STEPS.map((key, index) => {
              const done = index < step
              const current = index === step
              return (
                <li
                  key={key}
                  aria-current={current ? 'step' : undefined}
                  className={cn('flex items-center gap-2', index > 0 && 'flex-1')}
                >
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className={cn('h-0.5 flex-1 rounded-full', index <= step ? 'bg-primary' : 'bg-border')}
                    />
                  )}
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                      (done || current) && 'border-primary bg-primary text-primary-foreground',
                      !done && !current && 'text-muted-foreground',
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : index + 1}
                  </span>
                </li>
              )
            })}
          </ol>
          <p className="text-xs text-muted-foreground">
            {t('auth.operatorSignup.stepLabel', { current: step + 1, total: STEPS.length })}
            {' · '}
            <span className="font-medium text-foreground">
              {t(`auth.operatorSignup.steps.${STEPS[step]}`)}
            </span>
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onFormSubmit} noValidate>
          {step === 0 && (
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
              <Button key="next-company" type="submit">
                {t('auth.operatorSignup.next')}
              </Button>
            </>
          )}

          {step === 1 && (
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">{t('auth.operatorSignup.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.operatorSignup.emailPlaceholder')}
                  autoComplete="email"
                  {...registerField('email')}
                />
                <FieldError message={errors.email?.message} />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  {t('auth.operatorSignup.back')}
                </Button>
                <Button key="next-details" type="submit" className="flex-1">
                  {t('auth.operatorSignup.next')}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
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
                  onClick={() => setStep(1)}
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
