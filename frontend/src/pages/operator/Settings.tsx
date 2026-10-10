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
import { useTenant } from '@/hooks/useTenant'
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
    <div className="max-w-2xl">
      <div className="flex flex-col gap-6">
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
      </div>
    </div>
  )
}
