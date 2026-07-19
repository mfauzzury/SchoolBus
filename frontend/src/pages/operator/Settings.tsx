import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useIsOperatorAdmin, useMe } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import { useUpdateProfile, useUploadLogo } from '@/hooks/useProfile'
import { useDiscountConfig, useUpdateDiscountConfig } from '@/hooks/useDiscountConfig'
import type { BusOperator } from '@/api/auth'
import type { DiscountConfig } from '@/api/discountConfig'

const profileSchema = z.object({
  company_name: z.string().min(1),
  contact_person: z.string().min(1),
  contact_phone: z.string().min(1),
  email: z.string().email(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  account_holder: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

function toFormValues(tenant?: BusOperator): ProfileForm {
  return {
    company_name: tenant?.company_name ?? '',
    contact_person: tenant?.contact_person ?? '',
    contact_phone: tenant?.contact_phone ?? '',
    email: tenant?.email ?? '',
    bank_name: tenant?.bank_details?.bank_name ?? '',
    account_number: tenant?.bank_details?.account_number ?? '',
    account_holder: tenant?.bank_details?.account_holder ?? '',
  }
}

const percentField = z.string().refine((v) => v !== '' && Number(v) >= 0 && Number(v) <= 100)

const discountSchema = z.object({
  monthly: percentField,
  quarterly: percentField,
  half_year: percentField,
  yearly: percentField,
  sibling_1: percentField,
  sibling_2: percentField,
  sibling_3: percentField,
})

type DiscountForm = z.infer<typeof discountSchema>

function toDiscountFormValues(config?: DiscountConfig): DiscountForm {
  return {
    monthly: String(config?.billing_periods.monthly ?? 0),
    quarterly: String(config?.billing_periods.quarterly ?? 0),
    half_year: String(config?.billing_periods.half_year ?? 0),
    yearly: String(config?.billing_periods.yearly ?? 0),
    sibling_1: String(config?.sibling_discounts['1'] ?? 0),
    sibling_2: String(config?.sibling_discounts['2'] ?? 0),
    sibling_3: String(config?.sibling_discounts['3'] ?? 0),
  }
}

function DiscountConfigCard() {
  const { t } = useTranslation()
  const isAdmin = useIsOperatorAdmin()
  const { data: config, isLoading } = useDiscountConfig()
  const updateConfig = useUpdateDiscountConfig()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DiscountForm>({
    resolver: zodResolver(discountSchema),
    defaultValues: toDiscountFormValues(config),
  })

  useEffect(() => {
    if (config) reset(toDiscountFormValues(config))
  }, [config, reset])

  const onSubmit = (values: DiscountForm) => {
    updateConfig.mutate({
      billing_periods: {
        monthly: Number(values.monthly),
        quarterly: Number(values.quarterly),
        half_year: Number(values.half_year),
        yearly: Number(values.yearly),
      },
      sibling_discounts: {
        '1': Number(values.sibling_1),
        '2': Number(values.sibling_2),
        '3': Number(values.sibling_3),
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('operator.settings.discountRates')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('operator.settings.discountRatesDescription')}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <p className="mb-3 text-sm font-medium">{t('operator.settings.billingPeriod')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="monthly">{t('operator.settings.monthly')}</Label>
                  <Input id="monthly" type="number" disabled={!isAdmin} {...register('monthly')} />
                  {errors.monthly && (
                    <p className="text-sm text-destructive">{t('operator.settings.rateRangeError')}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="quarterly">{t('operator.settings.quarterly')}</Label>
                  <Input id="quarterly" type="number" disabled={!isAdmin} {...register('quarterly')} />
                  {errors.quarterly && (
                    <p className="text-sm text-destructive">{t('operator.settings.rateRangeError')}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="half_year">{t('operator.settings.halfYear')}</Label>
                  <Input id="half_year" type="number" disabled={!isAdmin} {...register('half_year')} />
                  {errors.half_year && (
                    <p className="text-sm text-destructive">{t('operator.settings.rateRangeError')}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="yearly">{t('operator.settings.yearly')}</Label>
                  <Input id="yearly" type="number" disabled={!isAdmin} {...register('yearly')} />
                  {errors.yearly && (
                    <p className="text-sm text-destructive">{t('operator.settings.rateRangeError')}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="mb-3 text-sm font-medium">{t('operator.settings.siblingDiscount')}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sibling_1">{t('operator.settings.firstChild')}</Label>
                  <Input id="sibling_1" type="number" disabled={!isAdmin} {...register('sibling_1')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sibling_2">{t('operator.settings.secondChild')}</Label>
                  <Input id="sibling_2" type="number" disabled={!isAdmin} {...register('sibling_2')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sibling_3">{t('operator.settings.thirdChild')}</Label>
                  <Input id="sibling_3" type="number" disabled={!isAdmin} {...register('sibling_3')} />
                </div>
              </div>
              {(errors.sibling_1 || errors.sibling_2 || errors.sibling_3) && (
                <p className="mt-1.5 text-sm text-destructive">{t('operator.settings.rateRangeError')}</p>
              )}
            </div>

            {updateConfig.isError && (
              <p className="text-sm text-destructive">{t('operator.settings.saveError')}</p>
            )}
            {updateConfig.isSuccess && (
              <p className="text-sm text-muted-foreground">{t('common.saved')}</p>
            )}

            {isAdmin && (
              <Button type="submit" disabled={updateConfig.isPending}>
                {updateConfig.isPending ? t('common.saving') : t('operator.settings.saveChanges')}
              </Button>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  )
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
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(tenant),
  })

  useEffect(() => {
    if (tenant) reset(toFormValues(tenant))
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
    })
  }

  const onLogoSelected = (file?: File) => {
    if (file) uploadLogo.mutate(file)
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-medium">{t('operator.settings.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('operator.settings.logo')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {tenant?.logo_url ? (
            <img
              src={tenant.logo_url}
              alt="Company logo"
              className="size-16 rounded-lg border object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-lg border text-xs text-muted-foreground">
              {t('operator.settings.noLogo')}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onLogoSelected(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploadLogo.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadLogo.isPending ? t('operator.settings.uploading') : t('operator.settings.uploadLogo')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('operator.settings.companyProfile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company_name">{t('operator.settings.companyName')}</Label>
              <Input id="company_name" {...register('company_name')} />
              {errors.company_name && (
                <p className="text-sm text-destructive">{errors.company_name.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_person">{t('operator.settings.contactPerson')}</Label>
              <Input id="contact_person" {...register('contact_person')} />
              {errors.contact_person && (
                <p className="text-sm text-destructive">{errors.contact_person.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_phone">{t('operator.settings.contactPhone')}</Label>
              <Input id="contact_phone" {...register('contact_phone')} />
              {errors.contact_phone && (
                <p className="text-sm text-destructive">{errors.contact_phone.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('operator.settings.email')}</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="mt-2 border-t pt-4">
              <p className="mb-3 text-sm font-medium">{t('operator.settings.bankDetails')}</p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bank_name">{t('operator.settings.bankName')}</Label>
                  <Input id="bank_name" {...register('bank_name')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="account_number">{t('operator.settings.accountNumber')}</Label>
                  <Input id="account_number" {...register('account_number')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="account_holder">{t('operator.settings.accountHolder')}</Label>
                  <Input id="account_holder" {...register('account_holder')} />
                </div>
              </div>
            </div>

            {updateProfile.isError && (
              <p className="text-sm text-destructive">{t('operator.settings.saveError')}</p>
            )}
            {updateProfile.isSuccess && (
              <p className="text-sm text-muted-foreground">{t('common.saved')}</p>
            )}
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? t('common.saving') : t('operator.settings.saveChanges')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <DiscountConfigCard />
    </div>
  )
}
