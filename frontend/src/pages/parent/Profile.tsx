import { useEffect } from 'react'
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
import { useMe } from '@/hooks/useAuth'
import { useUpdateParentProfile, useUploadParentAvatar } from '@/hooks/useParentPortal'
import type { ParentProfile } from '@/api/auth'

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

  return (
    <div className="max-w-3xl">
      <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('parent.profile.title')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('parent.profile.description')}</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <AvatarUpload
                imageUrl={data?.parentProfile?.avatar_url ?? null}
                fallback={(data?.parentProfile?.full_name ?? data?.user.name ?? '?').charAt(0).toUpperCase()}
                isUploading={uploadAvatar.isPending}
                onUpload={(file) => uploadAvatar.mutate(file)}
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full_name">{t('parent.profile.fullName')}</Label>
                <Input id="full_name" {...register('full_name')} />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                )}
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
                  <SelectTrigger>
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
                <RadioGroup
                  value={gender}
                  onValueChange={(v) => setValue('gender', v as 'male' | 'female')}
                >
                  <RadioGroupItem value="male">{t('parent.profile.male')}</RadioGroupItem>
                  <RadioGroupItem value="female">{t('parent.profile.female')}</RadioGroupItem>
                </RadioGroup>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ic_number">{t('parent.profile.icNumber')}</Label>
                <Input id="ic_number" {...register('ic_number')} />
                {errors.ic_number && (
                  <p className="text-sm text-destructive">{errors.ic_number.message}</p>
                )}
              </div>
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address_line1">{t('parent.profile.addressLine1')}</Label>
                <Input id="address_line1" {...register('address_line1')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address_line2">{t('parent.profile.addressLine2')}</Label>
                <Input id="address_line2" {...register('address_line2')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="city">{t('parent.profile.city')}</Label>
                  <Input id="city" {...register('city')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="postcode">{t('parent.profile.postcode')}</Label>
                  <Input id="postcode" {...register('postcode')} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('parent.profile.emergencyContact')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emergency_contact_name">
                  {t('parent.profile.emergencyContactName')}
                </Label>
                <Input id="emergency_contact_name" {...register('emergency_contact_name')} />
              </div>
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
            </CardContent>
          </Card>
        </div>

        {updateProfile.isError && (
          <p className="text-sm text-destructive">{t('parent.profile.saveError')}</p>
        )}
        {updateProfile.isSuccess && (
          <p className="text-sm text-muted-foreground">{t('common.saved')}</p>
        )}
        <Button type="submit" disabled={updateProfile.isPending} className="self-start">
          {updateProfile.isPending ? t('common.saving') : t('parent.profile.saveChanges')}
        </Button>
      </form>
    </div>
  )
}
