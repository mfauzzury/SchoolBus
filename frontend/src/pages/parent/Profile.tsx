import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AvatarUpload } from '@/components/AvatarUpload'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { FieldError } from '@/components/FieldError'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter'
import { TabBar } from '@/components/TabBar'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { useMe, useLogout } from '@/hooks/useAuth'
import { useUpdateParentPassword, useUpdateParentProfile, useUploadParentAvatar } from '@/hooks/useParentPortal'
import { cn } from '@/lib/utils'
import type { ParentProfile } from '@/api/auth'

const passwordSchema = z
  .object({
    current_password: z.string().min(1),
    password: z
      .string()
      .min(8, 'auth.password.errors.tooShort')
      .regex(/[A-Za-z]/, 'auth.password.errors.needsLetter')
      .regex(/\d/, 'auth.password.errors.needsNumber'),
    password_confirmation: z.string().min(1),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ['password_confirmation'],
    message: 'MISMATCH',
  })

type PasswordForm = z.infer<typeof passwordSchema>

type ProfileTab = 'details' | 'password' | 'preferences'

function ChangePasswordCard() {
  const { t } = useTranslation()
  const updatePassword = useUpdateParentPassword()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const newPassword = watch('password') ?? ''

  const onSubmit = (values: PasswordForm) => {
    updatePassword.mutate(values, { onSuccess: () => reset() })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('parent.profile.changePassword')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current_password">{t('parent.profile.currentPassword')}</Label>
            <PasswordInput id="current_password" autoComplete="current-password" {...register('current_password')} />
            {errors.current_password && (
              <p className="text-sm text-destructive">{errors.current_password.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t('parent.profile.newPassword')}</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder={t('auth.password.placeholder')}
              {...register('password')}
            />
            <PasswordStrengthMeter password={newPassword} />
            <FieldError message={errors.password?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password_confirmation">{t('parent.profile.confirmNewPassword')}</Label>
            <PasswordInput
              id="password_confirmation"
              autoComplete="new-password"
              {...register('password_confirmation')}
            />
            {errors.password_confirmation && (
              <p className="text-sm text-destructive">{t('parent.profile.passwordMismatch')}</p>
            )}
          </div>
          {updatePassword.isError && (
            <p className="text-sm text-destructive">{t('parent.profile.passwordUpdateError')}</p>
          )}
          {updatePassword.isSuccess && (
            <p className="text-sm text-muted-foreground">{t('parent.profile.passwordUpdated')}</p>
          )}
          <Button type="submit" disabled={updatePassword.isPending} className="self-start">
            {updatePassword.isPending ? t('common.saving') : t('parent.profile.updatePassword')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

const profileSchema = z.object({
  full_name: z.string().min(1),
  relationship: z.enum(['father', 'mother', 'guardian']).optional(),
  gender: z.enum(['male', 'female']).optional(),
  ic_number: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

function toFormValues(profile?: ParentProfile | null): ProfileForm {
  return {
    full_name: profile?.full_name ?? '',
    relationship: profile?.relationship ?? undefined,
    gender: profile?.gender ?? undefined,
    ic_number: profile?.ic_number ?? '',
    phone: profile?.phone ?? '',
    email: profile?.email ?? '',
    address_line1: profile?.address_line1 ?? '',
    address_line2: profile?.address_line2 ?? '',
    city: profile?.city ?? '',
    postcode: profile?.postcode ?? '',
    emergency_contact_name: profile?.emergency_contact_name ?? '',
    emergency_contact_relationship: profile?.emergency_contact_relationship ?? '',
    emergency_contact_phone: profile?.emergency_contact_phone ?? '',
  }
}

export function ParentProfilePage() {
  const { t } = useTranslation()
  const { data } = useMe()
  const updateProfile = useUpdateParentProfile()
  const uploadAvatar = useUploadParentAvatar()
  const logout = useLogout()
  const [tab, setTab] = useState<ProfileTab>('details')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(data?.parentProfile),
  })

  useEffect(() => {
    if (data?.parentProfile) reset(toFormValues(data.parentProfile))
  }, [data?.parentProfile, reset])

  const relationship = watch('relationship')
  const gender = watch('gender')

  const onSubmit = (values: ProfileForm) => {
    updateProfile.mutate({
      full_name: values.full_name,
      relationship: values.relationship ?? null,
      gender: values.gender ?? null,
      ic_number: values.ic_number,
      phone: values.phone,
      email: values.email,
      address_line1: values.address_line1 || null,
      address_line2: values.address_line2 || null,
      city: values.city || null,
      postcode: values.postcode || null,
      emergency_contact_name: values.emergency_contact_name || null,
      emergency_contact_relationship: values.emergency_contact_relationship || null,
      emergency_contact_phone: values.emergency_contact_phone || null,
    })
  }

  const displayName = data?.parentProfile?.full_name ?? data?.user.name ?? ''

  const tabs: { value: ProfileTab; label: string }[] = [
    { value: 'details', label: t('parent.profile.tabDetails') },
    { value: 'password', label: t('parent.profile.tabPassword') },
    { value: 'preferences', label: t('parent.profile.preferences') },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-medium">{t('parent.profile.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('parent.profile.description')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabBar tabs={tabs} value={tab} onChange={setTab} />
        <Button type="button" variant="outline" size="sm" onClick={() => logout.mutate()}>
          {t('common.logOut')}
        </Button>
      </div>

      {/* Panels stay mounted and are only hidden, so a half-edited form isn't lost when switching tabs. */}
      <form
        className={cn('flex flex-col gap-6', tab !== 'details' && 'hidden')}
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('parent.profile.personalDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="full_name">{t('parent.profile.fullName')}</Label>
                  <Input id="full_name" {...register('full_name')} />
                  {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ic_number">{t('parent.profile.icNumber')}</Label>
                  <Input id="ic_number" {...register('ic_number')} />
                  {errors.ic_number && <p className="text-sm text-destructive">{errors.ic_number.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t('parent.profile.relationship')}</Label>
                  <Select
                    items={{
                      father: t('parent.profile.father'),
                      mother: t('parent.profile.mother'),
                      guardian: t('parent.profile.guardian'),
                    }}
                    value={relationship}
                    onValueChange={(v) => setValue('relationship', v as 'father' | 'mother' | 'guardian')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('parent.profile.selectRelationship')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="father">{t('parent.profile.father')}</SelectItem>
                      <SelectItem value="mother">{t('parent.profile.mother')}</SelectItem>
                      <SelectItem value="guardian">{t('parent.profile.guardian')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t('parent.profile.gender')}</Label>
                  <RadioGroup value={gender} onValueChange={(v) => setValue('gender', v as 'male' | 'female')}>
                    <RadioGroupItem value="male">{t('parent.profile.male')}</RadioGroupItem>
                    <RadioGroupItem value="female">{t('parent.profile.female')}</RadioGroupItem>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('parent.profile.emergencyContact')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="emergency_contact_name">{t('parent.profile.emergencyContactName')}</Label>
                  <Input id="emergency_contact_name" {...register('emergency_contact_name')} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="emergency_contact_relationship">
                      {t('parent.profile.emergencyContactRelationship')}
                    </Label>
                    <Input
                      id="emergency_contact_relationship"
                      {...register('emergency_contact_relationship')}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="emergency_contact_phone">
                      {t('parent.profile.emergencyContactPhone')}
                    </Label>
                    <Input id="emergency_contact_phone" {...register('emergency_contact_phone')} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-lg font-medium">{displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">{data?.user.email}</p>
                </div>
                <AvatarUpload
                  imageUrl={data?.parentProfile?.avatar_url ?? null}
                  fallback={(displayName || '?').charAt(0).toUpperCase()}
                  isUploading={uploadAvatar.isPending}
                  onUpload={(file) => uploadAvatar.mutate(file)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('parent.profile.contactAddress')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="phone">{t('parent.profile.phone')}</Label>
                    <Input id="phone" {...register('phone')} />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">{t('parent.profile.email')}</Label>
                    <Input id="email" type="email" {...register('email')} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address_line1">{t('parent.profile.addressLine1')}</Label>
                  <Input id="address_line1" {...register('address_line1')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address_line2">{t('parent.profile.addressLine2')}</Label>
                  <Input id="address_line2" {...register('address_line2')} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="postcode">{t('parent.profile.postcode')}</Label>
                    <Input id="postcode" {...register('postcode')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="city">{t('parent.profile.city')}</Label>
                    <Input id="city" {...register('city')} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? t('common.saving') : t('parent.profile.saveChanges')}
          </Button>
          {updateProfile.isError && (
            <p className="text-sm text-destructive">{t('parent.profile.saveError')}</p>
          )}
          {updateProfile.isSuccess && (
            <p className="text-sm text-muted-foreground">{t('common.saved')}</p>
          )}
        </div>
      </form>

      <div className={cn('max-w-lg', tab !== 'password' && 'hidden')}>
        <ChangePasswordCard />
      </div>

      <Card className={cn('max-w-lg', tab !== 'preferences' && 'hidden')}>
        <CardHeader>
          <CardTitle className="text-base">{t('parent.profile.preferences')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('parent.profile.theme')}</span>
            <ThemeSwitcher />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('parent.profile.language')}</span>
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
