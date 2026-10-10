import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
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
import { FieldError } from '@/components/FieldError'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
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

export function Register() {
  const { t } = useTranslation()
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { data: tenant, isLoading, isError } = useTenantByCode(code!)
  const register = useRegisterParent(code!)
  const {
    register: registerField,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const relationship = watch('relationship')
  const gender = watch('gender')
  const password = watch('password') ?? ''

  const onSubmit = (values: RegisterForm) => {
    register.mutate(values, {
      onSuccess: () => navigate('/parent/dashboard'),
    })
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (isError || !tenant) {
    return <p className="text-sm text-destructive">{t('auth.registerParent.notFound')}</p>
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.registerParent.title', { company: tenant.company_name })}</CardTitle>
        <CardDescription>{t('auth.registerParent.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">{t('auth.registerParent.fullName')}</Label>
            <Input
              id="full_name"
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">{t('auth.registerParent.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              placeholder={t('auth.registerParent.phonePlaceholder')}
              autoComplete="tel"
              {...registerField('phone')}
            />
            <FieldError message={errors.phone?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t('auth.registerParent.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.registerParent.emailPlaceholder')}
              autoComplete="email"
              {...registerField('email')}
            />
            <FieldError message={errors.email?.message} />
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

          <div className="mt-2 border-t pt-4">
            <p className="mb-3 text-sm font-medium">{t('auth.registerParent.emergencyContact')}</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emergency_contact_name">
                  {t('auth.registerParent.emergencyContactName')}
                </Label>
                <Input
                  id="emergency_contact_name"
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
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t('auth.registerParent.password')}</Label>
            <PasswordInput
              id="password"
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
          <Button type="submit" disabled={register.isPending}>
            {register.isPending ? t('auth.registerParent.submitting') : t('auth.registerParent.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
