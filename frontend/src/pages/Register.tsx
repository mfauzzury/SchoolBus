import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { EmailCodeStep } from '@/components/EmailCodeStep'
import { FieldError } from '@/components/FieldError'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
import { WizardProgress } from '@/components/WizardProgress'
import { useEmailProof } from '@/hooks/useEmailProof'
import { useRegisterParent, useTenantByCode } from '@/hooks/useRegistration'

// Messages are i18n keys, translated where they're rendered (see FieldError).
const registerSchema = z.object({
  full_name: z.string().trim().min(1, 'auth.validation.required'),
  relationship: z.enum(['father', 'mother', 'guardian']).optional(),
  gender: z.enum(['male', 'female']).optional(),
  ic_number: z.string().trim().min(1, 'auth.validation.required'),
  phone: z.string().trim().min(1, 'auth.validation.required'),
  email: z.string().trim().min(1, 'auth.validation.required').email('auth.validation.email'),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'auth.password.errors.tooShort')
    .regex(/[A-Za-z]/, 'auth.password.errors.needsLetter')
    .regex(/\d/, 'auth.password.errors.needsNumber'),
})

type RegisterForm = z.infer<typeof registerSchema>

const STEPS = ['verify', 'you', 'contact', 'emergency', 'password'] as const

// Which fields must be valid before leaving each step. The first step proves the
// email with a one-time code (see EmailCodeStep). The address and the emergency
// contact are optional, so those steps can be left empty.
const STEP_FIELDS: Record<number, (keyof RegisterForm)[]> = {
  1: ['full_name', 'ic_number'],
  2: ['phone'],
}

export function Register() {
  const { t } = useTranslation()
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { data: tenant, isLoading, isError } = useTenantByCode(code!)
  const register = useRegisterParent(code!)
  const [step, setStep] = useState(0)
  // The email the parent has proven with a code. Registering is refused without it.
  const emailProof = useEmailProof()
  const {
    register: registerField,
    handleSubmit,
    trigger,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const relationship = watch('relationship')
  const gender = watch('gender')
  const password = watch('password') ?? ''
  const isLastStep = step === STEPS.length - 1

  // Only the current step's fields need to be valid before moving on.
  const goNext = async () => {
    const fields = STEP_FIELDS[step]
    if (!fields || (await trigger(fields))) setStep((current) => current + 1)
  }

  const onSubmit = (values: RegisterForm) => {
    register.mutate(
      { ...values, email_token: emailProof.proof?.token },
      {
        onSuccess: () => navigate('/parent/dashboard'),
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
      // Bring the parent back to the earliest step that has something to fix.
      if (invalid.full_name || invalid.ic_number) setStep(1)
      else if (invalid.phone) setStep(2)
      else if (invalid.email) setStep(0)
    })(event)
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (isError || !tenant) {
    return <p className="text-sm text-destructive">{t('auth.registerParent.notFound')}</p>
  }

  const stepLabel = t('auth.registerParent.stepLabel', { current: step + 1, total: STEPS.length })

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.registerParent.title', { company: tenant.company_name })}</CardTitle>
        <CardDescription>{t('auth.registerParent.description')}</CardDescription>

        <WizardProgress
          labels={STEPS.map((key) => t(`auth.registerParent.steps.${key}`))}
          current={step}
          stepLabel={stepLabel}
        />
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onFormSubmit} noValidate>
          {step === 0 && (
            <EmailCodeStep
              endpoint={`/api/register/${code}/email-code`}
              initialEmail={getValues('email') ?? ''}
              verifiedEmail={emailProof.proof?.email ?? null}
              notice={emailProof.notice}
              emailPlaceholder={t('auth.registerParent.emailPlaceholder')}
              nextLabel={t('auth.registerParent.next')}
              onVerified={(email, token) => {
                setValue('email', email, { shouldValidate: true })
                emailProof.accept(email, token)
                setStep(1)
              }}
              onChangeEmail={emailProof.clear}
              onContinue={() => setStep(1)}
              footer={
                <p className="text-center text-sm text-muted-foreground">
                  {t('auth.registerParent.haveAccount')}{' '}
                  <Link to="/login" className="font-medium text-foreground hover:underline">
                    {t('auth.registerParent.logIn')}
                  </Link>
                </p>
              }
            />
          )}

          {step === 1 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full_name">{t('auth.registerParent.fullName')}</Label>
                <Input
                  id="full_name"
                  autoFocus
                  placeholder={t('auth.registerParent.fullNamePlaceholder')}
                  autoComplete="name"
                  {...registerField('full_name')}
                />
                <FieldError message={errors.full_name?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('auth.registerParent.relationship')}</Label>
                <Select
                  items={{
                    father: t('auth.registerParent.father'),
                    mother: t('auth.registerParent.mother'),
                    guardian: t('auth.registerParent.guardian'),
                  }}
                  value={relationship}
                  onValueChange={(v) => setValue('relationship', v as 'father' | 'mother' | 'guardian')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('auth.registerParent.selectRelationship')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">{t('auth.registerParent.father')}</SelectItem>
                    <SelectItem value="mother">{t('auth.registerParent.mother')}</SelectItem>
                    <SelectItem value="guardian">{t('auth.registerParent.guardian')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('auth.registerParent.gender')}</Label>
                <RadioGroup
                  value={gender}
                  onValueChange={(v) => setValue('gender', v as 'male' | 'female')}
                >
                  <RadioGroupItem value="male">{t('auth.registerParent.male')}</RadioGroupItem>
                  <RadioGroupItem value="female">{t('auth.registerParent.female')}</RadioGroupItem>
                </RadioGroup>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ic_number">{t('auth.registerParent.icNumber')}</Label>
                <Input
                  id="ic_number"
                  inputMode="numeric"
                  placeholder={t('auth.registerParent.icNumberPlaceholder')}
                  {...registerField('ic_number')}
                />
                <FieldError message={errors.ic_number?.message} />
              </div>

              {/* A real submit button so Enter advances; onFormSubmit routes it to goNext. */}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  {t('auth.registerParent.back')}
                </Button>
                <Button key="next-you" type="submit" className="flex-1">
                  {t('auth.registerParent.next')}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">{t('auth.registerParent.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoFocus
                  placeholder={t('auth.registerParent.phonePlaceholder')}
                  autoComplete="tel"
                  {...registerField('phone')}
                />
                <FieldError message={errors.phone?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address_line1">{t('auth.registerParent.addressLine1')}</Label>
                <Input
                  id="address_line1"
                  placeholder={t('auth.registerParent.addressLine1Placeholder')}
                  autoComplete="address-line1"
                  {...registerField('address_line1')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address_line2">{t('auth.registerParent.addressLine2')}</Label>
                <Input
                  id="address_line2"
                  placeholder={t('auth.registerParent.addressLine2Placeholder')}
                  autoComplete="address-line2"
                  {...registerField('address_line2')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="city">{t('auth.registerParent.city')}</Label>
                  <Input
                    id="city"
                    placeholder={t('auth.registerParent.cityPlaceholder')}
                    autoComplete="address-level2"
                    {...registerField('city')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="postcode">{t('auth.registerParent.postcode')}</Label>
                  <Input
                    id="postcode"
                    inputMode="numeric"
                    placeholder={t('auth.registerParent.postcodePlaceholder')}
                    autoComplete="postal-code"
                    {...registerField('postcode')}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  {t('auth.registerParent.back')}
                </Button>
                <Button key="next-contact" type="submit" className="flex-1">
                  {t('auth.registerParent.next')}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">
                {t('auth.registerParent.emergencyContactHint')}
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emergency_contact_name">
                  {t('auth.registerParent.emergencyContactName')}
                </Label>
                <Input
                  id="emergency_contact_name"
                  autoFocus
                  placeholder={t('auth.registerParent.emergencyContactNamePlaceholder')}
                  {...registerField('emergency_contact_name')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emergency_contact_relationship">
                  {t('auth.registerParent.emergencyContactRelationship')}
                </Label>
                <Input
                  id="emergency_contact_relationship"
                  placeholder={t('auth.registerParent.emergencyContactRelationshipPlaceholder')}
                  {...registerField('emergency_contact_relationship')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emergency_contact_phone">
                  {t('auth.registerParent.emergencyContactPhone')}
                </Label>
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  placeholder={t('auth.registerParent.emergencyContactPhonePlaceholder')}
                  {...registerField('emergency_contact_phone')}
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  {t('auth.registerParent.back')}
                </Button>
                <Button key="next-emergency" type="submit" className="flex-1">
                  {t('auth.registerParent.next')}
                </Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">{t('auth.registerParent.password')}</Label>
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
                <p className="text-sm text-destructive">{t('auth.registerParent.failed')}</p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={register.isPending}
                  onClick={() => setStep(3)}
                >
                  {t('auth.registerParent.back')}
                </Button>
                <Button key="submit" type="submit" className="flex-1" disabled={register.isPending}>
                  {register.isPending
                    ? t('auth.registerParent.submitting')
                    : t('auth.registerParent.submit')}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
