import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from '@/hooks/useAuth'
import { FieldError } from '@/components/FieldError'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTenant } from '@/hooks/useTenant'
import { MALAYSIAN_STATES } from '@/lib/contact'
import { ProfileCompleteness } from '@/components/operator/ProfileCompleteness'
import { profileItems } from '@/lib/profileCompleteness'
import { useUpdateProfile, useUploadLogo } from '@/hooks/useProfile'
import type { BusOperator } from '@/api/auth'

const profileSchema = z.object({
  company_name: z.string().min(1),
  contact_person: z.string().min(1),
  contact_phone: z.string().min(1),
  email: z.string().email(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  account_holder: z.string().optional(),
  whatsapp_number: z
    .string()
    .regex(/^([0-9+\-\s()]{8,30})?$/, 'operator.settings.errors.whatsapp')
    .optional(),
  legal_name: z.string().optional(),
  ssm_number: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  postcode: z.string().regex(/^(\d{5})?$/, 'operator.settings.errors.postcode').optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  payment_note: z.string().max(300).optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

function toFormValues(tenant?: BusOperator | null): ProfileForm {
  return {
    company_name: tenant?.company_name ?? '',
    contact_person: tenant?.contact_person ?? '',
    contact_phone: tenant?.contact_phone ?? '',
    email: tenant?.email ?? '',
    bank_name: tenant?.bank_details?.bank_name ?? '',
    account_number: tenant?.bank_details?.account_number ?? '',
    account_holder: tenant?.bank_details?.account_holder ?? '',
    whatsapp_number: tenant?.whatsapp_number ?? '',
    legal_name: tenant?.legal_name ?? '',
    ssm_number: tenant?.ssm_number ?? '',
    address_line1: tenant?.address_line1 ?? '',
    address_line2: tenant?.address_line2 ?? '',
    postcode: tenant?.postcode ?? '',
    city: tenant?.city ?? '',
    state: tenant?.state ?? '',
    payment_note: tenant?.payment_note ?? '',
  }
}

export function Settings() {
  const { t } = useTranslation()
  useMe()
  const { tenant } = useTenant()
  const updateProfile = useUpdateProfile()
  const uploadLogo = useUploadLogo()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(tenant),
  })

  // The saved details can refresh while the operator is typing (uploading a logo
  // reloads them). keepDirtyValues takes in what changed on the server without
  // throwing away anything typed but not saved yet.
  useEffect(() => {
    if (tenant) reset(toFormValues(tenant), { keepDirtyValues: true })
  }, [tenant, reset])

  const onSubmit = (values: ProfileForm) => {
    updateProfile.mutate({
      company_name: values.company_name,
      contact_person: values.contact_person,
      contact_phone: values.contact_phone,
      email: values.email,
      bank_details: {
        bank_name: values.bank_name,
        account_number: values.account_number,
        account_holder: values.account_holder,
      },
      whatsapp_number: values.whatsapp_number || null,
      legal_name: values.legal_name || null,
      ssm_number: values.ssm_number || null,
      address_line1: values.address_line1 || null,
      address_line2: values.address_line2 || null,
      postcode: values.postcode || null,
      city: values.city || null,
      state: values.state || null,
      payment_note: values.payment_note || null,
    })
  }

  const state = watch('state')
  const paymentNote = watch('payment_note') ?? ''
  const completenessItems = profileItems({ ...watch(), logo_url: tenant?.logo_url })

  const onLogoSelected = (file?: File) => {
    if (file) uploadLogo.mutate(file)
  }

  const field = (id: string, label: string, input: React.ReactNode, hint?: string, error?: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {input}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <ProfileCompleteness items={completenessItems} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left: who they are and how to reach them */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('operator.settings.companyProfile')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              {tenant?.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt="Company logo"
                  className="size-16 shrink-0 rounded-lg border object-cover"
                />
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border text-center text-xs text-muted-foreground">
                  {t('operator.settings.noLogo')}
                </div>
              )}
              <div className="flex flex-col items-start gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onLogoSelected(e.target.files?.[0])}
                />
                <Button
                  id="logo_upload"
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadLogo.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadLogo.isPending ? t('operator.settings.uploading') : t('operator.settings.uploadLogo')}
                </Button>
                <span className="text-xs text-muted-foreground">{t('operator.settings.logo')}</span>
              </div>
            </div>

            {field(
              'company_name',
              t('operator.settings.companyName'),
              <Input id="company_name" {...register('company_name')} />,
              undefined,
              errors.company_name?.message,
            )}
            {field(
              'contact_person',
              t('operator.settings.contactPerson'),
              <Input id="contact_person" {...register('contact_person')} />,
              undefined,
              errors.contact_person?.message,
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {field(
                'contact_phone',
                t('operator.settings.contactPhone'),
                <Input id="contact_phone" {...register('contact_phone')} />,
                undefined,
                errors.contact_phone?.message,
              )}
              {field(
                'whatsapp_number',
                t('operator.settings.whatsapp'),
                <Input id="whatsapp_number" inputMode="tel" {...register('whatsapp_number')} />,
                t('operator.settings.whatsappHelp'),
                errors.whatsapp_number?.message,
              )}
            </div>
            {field(
              'email',
              t('operator.settings.email'),
              <Input id="email" type="email" {...register('email')} />,
              undefined,
              errors.email?.message,
            )}
          </CardContent>
        </Card>

        {/* Right: the formal company details, then where the office is */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('operator.settings.registeredCompany')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('operator.settings.registeredHelp')}</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {field(
                'legal_name',
                t('operator.settings.legalName'),
                <Input id="legal_name" {...register('legal_name')} />,
              )}
              {field(
                'ssm_number',
                t('operator.settings.ssmNumber'),
                <Input id="ssm_number" {...register('ssm_number')} />,
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('operator.settings.officeAddress')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {field(
                'address_line1',
                t('operator.settings.addressLine1'),
                <Input id="address_line1" {...register('address_line1')} />,
              )}
              {field(
                'address_line2',
                t('operator.settings.addressLine2'),
                <Input id="address_line2" {...register('address_line2')} />,
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {field(
                  'postcode',
                  t('operator.settings.postcode'),
                  <Input id="postcode" inputMode="numeric" maxLength={5} {...register('postcode')} />,
                  undefined,
                  errors.postcode?.message,
                )}
                {field('city', t('operator.settings.city'), <Input id="city" {...register('city')} />)}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('operator.settings.state')}</Label>
                <Select
                  items={Object.fromEntries(MALAYSIAN_STATES.map((name) => [name, name]))}
                  value={state || null}
                  onValueChange={(value) => setValue('state', value ?? '', { shouldDirty: true })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('operator.settings.selectState')} />
                  </SelectTrigger>
                  <SelectContent>
                    {MALAYSIAN_STATES.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How parents pay you */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('operator.settings.bankDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {field('bank_name', t('operator.settings.bankName'), <Input id="bank_name" {...register('bank_name')} />)}
            <div className="grid gap-4 sm:grid-cols-2">
              {field(
                'account_number',
                t('operator.settings.accountNumber'),
                <Input id="account_number" inputMode="numeric" {...register('account_number')} />,
              )}
              {field(
                'account_holder',
                t('operator.settings.accountHolder'),
                <Input id="account_holder" {...register('account_holder')} />,
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('operator.settings.paymentNote')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('operator.settings.paymentNoteHelp')}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <Textarea
              id="payment_note"
              maxLength={300}
              aria-label={t('operator.settings.paymentNote')}
              placeholder={t('operator.settings.paymentNotePlaceholder')}
              {...register('payment_note')}
            />
            <p className="text-right text-xs text-muted-foreground">{paymentNote.length} / 300</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? t('common.saving') : t('operator.settings.saveChanges')}
        </Button>
        {updateProfile.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t('operator.settings.saveError')}
          </p>
        )}
        {updateProfile.isSuccess && (
          <p role="status" className="text-sm text-muted-foreground">
            {t('common.saved')}
          </p>
        )}
      </div>
    </form>
  )
}
